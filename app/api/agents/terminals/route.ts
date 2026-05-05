import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getAdminRoleFromRequest } from "@/lib/admin/role";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// GET - Fetch all terminals
export async function GET(req: NextRequest) {
  try {
    const roleInfo = await getAdminRoleFromRequest(req);
    if (!roleInfo) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("agent_id");

    let query = supabase.from("terminal").select("*");

    if (roleInfo.role === "staff") {
      const { data: agents, error: agentsError } = await supabase
        .from("agent")
        .select("id")
        .eq("staff_id", roleInfo.id);

      if (agentsError) {
        throw agentsError;
      }

      const agentIds = (agents || []).map((agent: any) => agent.id).filter((id: string) => !!id);
      if (agentIds.length === 0) {
        return NextResponse.json([]);
      }

      query = query.in("agent_id", agentIds);
    } else if (roleInfo.role === "agent") {
      query = query.eq("agent_id", roleInfo.id);
    } else if (agentId) {
      query = query.eq("agent_id", agentId);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Update all accessible terminals status
export async function PATCH(req: NextRequest) {
  try {
    const roleInfo = await getAdminRoleFromRequest(req);
    if (!roleInfo) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const status = body.status;

    if (status !== "active" && status !== "inactive") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    let query = supabase.from("terminal").update({ status }).neq("status", status);

    if (roleInfo.role === "staff") {
      const { data: agents, error: agentsError } = await supabase
        .from("agent")
        .select("id")
        .eq("staff_id", roleInfo.id);

      if (agentsError) {
        throw agentsError;
      }

      const agentIds = (agents || []).map((agent: any) => agent.id).filter((id: string) => !!id);
      if (agentIds.length === 0) {
        return NextResponse.json({ updated: 0 });
      }

      query = query.in("agent_id", agentIds);
    } else if (roleInfo.role === "agent") {
      query = query.eq("agent_id", roleInfo.id);
    }

    const { data, error } = await query.select();
    if (error) throw error;

    return NextResponse.json({ updated: data?.length ?? 0 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new terminal
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { data, error } = await supabase
      .from("terminal")
      .insert([
        {
          serial_number: body.serial_number,
          agent_id: body.agent_id,
          password: body.password,
          credit_limit: body.credit_limit,
          max_stake: body.max_stake,
          game_types: body.game_types,
          game_modes: body.game_modes,
          prizes: body.prizes,
          status: "active",
        },
      ])
      .select();

    if (error) throw error;

    return NextResponse.json(data[0], { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
