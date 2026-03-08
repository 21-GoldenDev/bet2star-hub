import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl ?? "", supabaseServiceKey ?? "");
const leagueNameCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export async function GET(request: NextRequest) {
  try {
    const countryId = request.nextUrl.searchParams.get("country_id");

    let query = supabase
      .from("sports_leagues")
      .select("id, name, country_id, created_at, updated_at, country:sports_countries(id, name)")
      .order("name", { ascending: true });

    if (countryId) {
      query = query.eq("country_id", countryId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const leagues = [...(data ?? [])].sort((a, b) =>
      leagueNameCollator.compare(a?.name ?? "", b?.name ?? "")
    );

    return NextResponse.json({ leagues }, { status: 200 });
  } catch (error) {
    console.error("Error fetching sports leagues:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const countryId = typeof body?.country_id === "string" ? body.country_id : "";

    if (!name || !countryId) {
      return NextResponse.json({ error: "Country and league name are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("sports_leagues")
      .insert([{ name, country_id: countryId }])
      .select("id, name, country_id, created_at, updated_at, country:sports_countries(id, name)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ league: data }, { status: 201 });
  } catch (error) {
    console.error("Error creating sports league:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
