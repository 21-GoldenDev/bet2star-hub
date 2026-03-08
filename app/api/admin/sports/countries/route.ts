import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl ?? "", supabaseServiceKey ?? "");
const countryNameCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("sports_countries")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const countries = [...(data ?? [])].sort((a, b) =>
      countryNameCollator.compare(a?.name ?? "", b?.name ?? "")
    );

    return NextResponse.json({ countries }, { status: 200 });
  } catch (error) {
    console.error("Error fetching sports countries:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json({ error: "Country name is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("sports_countries")
      .insert([{ name }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ country: data }, { status: 201 });
  } catch (error) {
    console.error("Error creating sports country:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
