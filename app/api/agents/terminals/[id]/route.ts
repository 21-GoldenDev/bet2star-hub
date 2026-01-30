import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

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
    if (body.prizes !== undefined) updateData.prizes = body.prizes;
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

// DELETE - Remove terminal
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
