import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { buildTerminalPrizesPayload } from "@/lib/terminals/terminalPrize";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// GET - Fetch single terminal
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from("terminal")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update terminal
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updateData: Record<string, any> = {};
    
    if (body.serial_number !== undefined) updateData.serial_number = body.serial_number;
    if (body.agent_id !== undefined) updateData.agent_id = body.agent_id;
    if (body.password !== undefined) updateData.password = body.password;
    if (body.credit_limit !== undefined) updateData.credit_limit = body.credit_limit;
    if (body.max_stake !== undefined) updateData.max_stake = body.max_stake;
    if (body.game_types !== undefined) updateData.game_types = body.game_types;
    if (body.game_modes !== undefined) updateData.game_modes = body.game_modes;
    if (body.prizes !== undefined || body.default_prize_id !== undefined) {
      let prizesInput = body.prizes;
      let legacyDefault = body.default_prize_id;

      if (prizesInput === undefined) {
        const { data: current, error: currentError } = await supabase
          .from("terminal")
          .select("prizes, default_prize_id")
          .eq("id", id)
          .single();
        if (currentError) throw currentError;
        prizesInput = current?.prizes;
        if (legacyDefault === undefined) {
          legacyDefault = current?.default_prize_id;
        }
      }

      const { prizes } = buildTerminalPrizesPayload({
        prizes: prizesInput,
        default_prize_id: legacyDefault,
      });
      updateData.prizes = prizes;
    }
    if (body.status !== undefined) updateData.status = body.status;

    const { data, error } = await supabase
      .from("terminal")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) throw error;

    return NextResponse.json(data[0]);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

async function hasBetsForTerminalIds(terminalIds: string[]) {
  if (!terminalIds.length) {
    return false;
  }

  const betTables = ["bets_lotto", "bets_pools", "bets_sport", "bets_sports_draw"];

  for (const table of betTables) {
    const { error, count } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .in("terminal", terminalIds)
      .limit(1);

    if (error) {
      throw error;
    }

    if ((count ?? 0) > 0) {
      return true;
    }
  }

  return false;
}

// DELETE - Remove terminal
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (await hasBetsForTerminalIds([id])) {
      return NextResponse.json(
        { error: "Cannot delete terminal: this terminal has existing bets. Remove or archive associated bets first." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("terminal")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ message: "Terminal deleted" });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
