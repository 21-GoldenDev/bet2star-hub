import { NextRequest, NextResponse } from "next/server";
import {
  formatSportsMatchForSheet,
  normalizeWhatsAppPhone,
} from "@/lib/sports/sheetShare";
import { generateSportsFixturesPdf } from "@/lib/sports/generateFixturesPdf";
import { uploadSportsFixturesPdf } from "@/lib/sports/uploadFixturesPdf";
import {
  buildWhatsAppMeUrl,
  isWhatsAppApiConfigured,
  sendWhatsAppFixturesLink,
} from "@/lib/whatsapp/send";
import { getServiceClient } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const phone = normalizeWhatsAppPhone(String(body?.phone ?? ""));

    if (!phone) {
      return NextResponse.json(
        { error: "Enter a valid WhatsApp number with country code (digits only)." },
        { status: 400 },
      );
    }

    const supabase = getServiceClient();
    const nowIso = new Date().toISOString();
    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("id, week, game_name")
      .eq("type", "sports")
      .lte("start_time", nowIso)
      .gte("end_time", nowIso)
      .order("start_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (gameError) {
      return NextResponse.json({ error: gameError.message }, { status: 500 });
    }
    if (!game) {
      return NextResponse.json(
        { error: "No active sports game to export." },
        { status: 404 },
      );
    }

    let matchRows: any[] = [];
    const joined = await supabase
      .from("sports")
      .select("*, sports_leagues(name, sports_countries(name))")
      .eq("game_id", game.id)
      .neq("status", "void")
      .order("number", { ascending: true });

    if (joined.error) {
      const fallback = await supabase
        .from("sports")
        .select("*")
        .eq("game_id", game.id)
        .neq("status", "void")
        .order("number", { ascending: true });
      if (fallback.error) {
        return NextResponse.json({ error: fallback.error.message }, { status: 500 });
      }
      matchRows = fallback.data ?? [];
    } else {
      matchRows = joined.data ?? [];
    }

    const now = Date.now();
    const matches = matchRows
      .filter((m) => {
        const expired = m.end_time ? new Date(m.end_time).getTime() <= now : false;
        return !expired && !Boolean(m.processed);
      })
      .map(formatSportsMatchForSheet);

    if (matches.length === 0) {
      return NextResponse.json(
        { error: "No active matches to export." },
        { status: 404 },
      );
    }

    // Build a direct PDF media URL (same idea as a CDN asset link)
    const pdf = await generateSportsFixturesPdf({
      matches,
      gameWeek: game.week,
      gameName: game.game_name,
    });
    const { publicUrl: link } = await uploadSportsFixturesPdf(pdf, {
      gameId: game.id,
      week: game.week,
    });

    const message =
      `Bet2Star Sports Betting fixtures\n\nView & download PDF:\n${link}`;
    const waMeUrl = buildWhatsAppMeUrl(phone, message);

    if (isWhatsAppApiConfigured()) {
      const result = await sendWhatsAppFixturesLink(phone, link);
      if (result.ok) {
        return NextResponse.json({
          success: true,
          sent: true,
          link,
          phone,
          mode: result.mode,
        });
      }

      return NextResponse.json({
        success: true,
        sent: false,
        link,
        phone,
        waMeUrl,
        warning: result.error,
      });
    }

    return NextResponse.json({
      success: true,
      sent: false,
      link,
      phone,
      waMeUrl,
    });
  } catch (error) {
    console.error("WhatsApp export error:", error);
    const message = error instanceof Error ? error.message : "Failed to export to WhatsApp";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
