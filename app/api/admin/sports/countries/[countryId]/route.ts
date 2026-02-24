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
  { params }: { params: Promise<{ countryId: string }> }
) {
  try {
    const { countryId } = await params;
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json({ error: "Country name is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("sports_countries")
      .update({ name })
      .eq("id", countryId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ country: data }, { status: 200 });
  } catch (error) {
    console.error("Error updating sports country:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ countryId: string }> }
) {
  try {
    const { countryId } = await params;

    const { error } = await supabase
      .from("sports_countries")
      .delete()
      .eq("id", countryId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Country deleted" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting sports country:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
