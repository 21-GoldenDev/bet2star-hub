import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// GET - Fetch all online users (profiles + auth email)
export async function GET(req: NextRequest) {
  try {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profilesError) throw profilesError;

    const { data: authList, error: authError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

    if (authError) console.warn("auth list users error:", authError.message || authError);

    const authUsers: any[] = authList?.users || [];
    const authById = new Map((authUsers || []).map((u: any) => [u.id, u]));

    const result = (profiles || []).map((p: any) => ({
      id: p.user_id,
      profile_id: p.id,
      username: p.username,
      full_name: p.full_name,
      phone: p.phone,
      avatar: p.avatar,
      role: p.role,
      address: p.address || "",
      balance: Number(p.balance) || 0,
      created_at: p.created_at,
      updated_at: p.updated_at,
      email: authById.get(p.user_id)?.email ?? null,
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new profile (note: does not create auth user)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { data, error } = await supabase
      .from("profiles")
      .insert([
        {
          user_id: body.user_id || null,
          username: body.username,
          full_name: body.full_name,
          phone: body.phone,
          address: body.address || "",
          avatar: body.avatar,
          role: body.role || "user",
          balance: body.balance || 0,
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
