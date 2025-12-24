import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
}

const supabase = createClient(
  supabaseUrl ?? "",
  supabaseServiceKey ?? ""
);

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from("prize")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ prizes: data }, { status: 200 });
  } catch (error) {
    console.error("Error fetching prizes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, data } = body;

    // Validate required fields
    if (!name || !data) {
      return NextResponse.json(
        { error: "Missing required fields (name, data)" },
        { status: 400 }
      );
    }

    // Validate data structure
    if (!data.columns || !Array.isArray(data.columns) || !data.data || typeof data.data !== "object") {
      return NextResponse.json(
        { error: "Invalid data structure. Expected { columns: string[], data: { [key: string]: number[] } }" },
        { status: 400 }
      );
    }

    const { data: prizeData, error } = await supabase
      .from("prize")
      .insert([{ name, data }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ prize: prizeData }, { status: 201 });
  } catch (error) {
    console.error("Error creating prize:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
