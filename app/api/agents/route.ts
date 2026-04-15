import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getAdminRoleFromRequest } from "@/lib/admin/role";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// GET - Fetch all agents
export async function GET(req: NextRequest) {
  try {
    const roleInfo = await getAdminRoleFromRequest(req);
    if (!roleInfo) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get("staff_id");

    let query = supabase.from("agent").select("*");

    if (roleInfo.role === "staff") {
      query = query.eq("staff_id", roleInfo.id);
    } else if (roleInfo.role === "agent") {
      query = query.eq("id", roleInfo.id);
    } else if (staffId) {
      query = query.eq("staff_id", staffId);
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

// POST - Create new agent
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { data, error } = await supabase
      .from("agent")
      .insert([
        {
          username: body.username,
          email: body.email,
          password: body.password,
          first_name: body.first_name,
          last_name: body.last_name,
          staff_id: body.staff_id,
          phone: body.phone,
          address: body.address,
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
