import { getServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = getServiceClient();
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("games")
      .select("*")
      .eq("type", "daily_pools")
      .lte("start_time", now)
      .gte("end_time", now)
      .order("start_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ game: null }, { status: 200 });
    }

    const { data: prizesData, error: prizesError } = await supabase
      .from("prize")
      .select("id, name, data");

    if (prizesError) {
      return NextResponse.json({ error: prizesError.message }, { status: 500 });
    }

    const prizesMap = new Map(
      prizesData?.map((prize) => [prize.id, prize]) || []
    );

    const prizeIds = data.prize_ids || [];
    const prizes = prizeIds.filter((p: any) => p.status === "active").map((prizeEntry: any) => {
      const prizeId = typeof prizeEntry === "string" ? prizeEntry : prizeEntry.id;
      const prizeDetails = prizesMap.get(prizeId);
      return {
        id: prizeId,
        name: prizeDetails?.name || "Unknown Prize",
        data: prizeDetails?.data || {},
      };
    });

    return NextResponse.json({ game: { ...data, prizes } }, { status: 200 });
  } catch (error) {
    console.error("Error fetching active daily pools game:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
