import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { provisionHierarchyAuthUser } from "@/lib/auth/provisionHierarchyAuthUser";
import { validateHierarchyPassword } from "@/lib/auth/hierarchyPassword";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// GET - Fetch all staff members
export async function GET(req: NextRequest) {
  try {
    const { data, error } = await supabase
      .from("staff")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new staff member
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const passwordError = validateHierarchyPassword(body.password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("staff")
      .insert([
        {
          username: body.username,
          email: body.email,
          password: body.password,
          first_name: body.first_name,
          last_name: body.last_name,
          phone: body.phone,
          address: body.address,
          status: "active",
        },
      ])
      .select();

    if (error) throw error;

    const created = data[0];
    if (created?.email && created?.password) {
      await provisionHierarchyAuthUser({
        email: created.email,
        password: created.password,
        role: "staff",
      });
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
