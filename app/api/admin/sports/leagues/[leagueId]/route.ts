import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl ?? "", supabaseServiceKey ?? "");

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await params;
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const countryId = typeof body?.country_id === "string" ? body.country_id : undefined;

    if (!name) {
      return NextResponse.json({ error: "League name is required" }, { status: 400 });
    }

    const updateData: { name: string; country_id?: string } = { name };
    if (countryId) {
      updateData.country_id = countryId;
    }

    const { data, error } = await supabase
      .from("sports_leagues")
      .update(updateData)
      .eq("id", leagueId)
      .select("id, name, country_id, created_at, updated_at, country:sports_countries(id, name)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ league: data }, { status: 200 });
  } catch (error) {
    console.error("Error updating sports league:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await params;

    const { error } = await supabase
      .from("sports_leagues")
      .delete()
      .eq("id", leagueId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "League deleted" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting sports league:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
