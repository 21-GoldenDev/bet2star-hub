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
      .from("turbo_prize")
      .select("*")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ turboPrize: null }, { status: 200 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ turboPrize: data }, { status: 200 });
  } catch (error) {
    console.error("Error fetching turbo prize:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { turbo1, turbo2, turbo3 } = body;

    if (turbo1 === undefined || turbo2 === undefined || turbo3 === undefined) {
      return NextResponse.json(
        { error: "Missing required fields (turbo1, turbo2, turbo3)" },
        { status: 400 }
      );
    }

    const { data: existingData } = await supabase
      .from("turbo_prize")
      .select("*")
      .single();

    if (existingData) {
      return NextResponse.json(
        { error: "Turbo prize already exists. Use PUT to update." },
        { status: 400 }
      );
    }

    const { data: turboPrizeData, error } = await supabase
      .from("turbo_prize")
      .insert([{
        data: { turbo1, turbo2, turbo3 }
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ turboPrize: turboPrizeData }, { status: 201 });
  } catch (error) {
    console.error("Error creating turbo prize:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
