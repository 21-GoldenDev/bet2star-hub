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
  { params }: { params: Promise<{ id: string; prizeId: string }> }
) {
  try {
    const { id, prizeId } = await params;
    const body = await request.json();
    const { commission, status } = body;

    // Validate commission if provided
    if (commission !== undefined) {
      if (commission < 0 || commission > 100) {
        return NextResponse.json(
          { error: "Commission must be between 0 and 100" },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (commission !== undefined) updateData.commission = commission;
    if (status !== undefined) updateData.status = status;

    const { data, error } = await supabase
      .from("game_prizes")
      .update(updateData)
      .eq("id", prizeId)
      .eq("game_id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: "Game prize not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ game_prize: data }, { status: 200 });
  } catch (error) {
    console.error("Error updating game prize:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; prizeId: string }> }
) {
  try {
    const { id, prizeId } = await params;

    const { error } = await supabase
      .from("game_prizes")
      .delete()
      .eq("id", prizeId)
      .eq("game_id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { message: "Game prize deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting game prize:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
