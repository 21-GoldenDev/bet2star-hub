import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// GET - Fetch single staff member
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from("staff")
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

// PUT - Update staff member
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const { data, error } = await supabase
      .from("staff")
      .update({
        username: body.username,
        email: body.email,
        password: body.password,
        first_name: body.first_name,
        last_name: body.last_name,
        phone: body.phone,
        address: body.address,
        status: body.status,
      })
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

async function hasBetsForTerminals(terminalIds: string[]) {
  if (!terminalIds.length) {
    return false;
  }

  const betTables = ["bets_lotto", "bets_pools", "bets_sport", "bets_sports_draw"];

  for (const table of betTables) {
    const { error, count } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .in("terminal", terminalIds)
      .limit(1);

    if (error) {
      throw error;
    }

    if ((count ?? 0) > 0) {
      return true;
    }
  }

  return false;
}

// DELETE - Remove staff member
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { password } = await req.json();
    const deletePassword = process.env.ADMIN_GAME_DELETE_PASSWORD;

    if (!deletePassword) {
      return NextResponse.json(
        { error: "Password is not configured" },
        { status: 500 }
      );
    }

    if (typeof password !== "string" || password !== deletePassword) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    const { data: agents, error: agentsError } = await supabase
      .from("agent")
      .select("id")
      .eq("staff_id", id);

    if (agentsError) throw agentsError;

    const agentIds = (agents || []).map((agent: any) => agent.id).filter(Boolean);

    if (agentIds.length) {
      const { data: terminals, error: terminalsError } = await supabase
        .from("terminal")
        .select("id")
        .in("agent_id", agentIds);

      if (terminalsError) throw terminalsError;

      const terminalIds = (terminals || []).map((terminal: any) => terminal.id).filter(Boolean);

      if (await hasBetsForTerminals(terminalIds)) {
        return NextResponse.json(
          { error: "Cannot delete staff: related terminals have existing bets. Remove or archive associated bets/terminals first." },
          { status: 400 }
        );
      }
    }

    const { error } = await supabase
      .from("staff")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ message: "Staff member deleted" });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
