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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { turbo1, turbo2, turbo3 } = body;

    if (turbo1 === undefined || turbo2 === undefined || turbo3 === undefined) {
      return NextResponse.json(
        { error: "Missing required fields (turbo1, turbo2, turbo3)" },
        { status: 400 }
      );
    }

    const { data: turboPrizeData, error } = await supabase
      .from("turbo_prize")
      .update({
        data: { turbo1, turbo2, turbo3 },
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ turboPrize: turboPrizeData }, { status: 200 });
  } catch (error) {
    console.error("Error updating turbo prize:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
