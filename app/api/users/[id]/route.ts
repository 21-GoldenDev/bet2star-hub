import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// GET - Fetch single user (profile + auth email)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // fetch profile by user_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", id)
      .single();

    if (profileError) throw profileError;

    // fetch auth user to get email
    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(id);

    if (authError) console.warn("auth getUserById error:", authError.message || authError);

    const email = authData?.user?.email ?? null;

    return NextResponse.json({
      id,
      profile_id: profile.id,
      username: profile.username,
      full_name: profile.full_name,
      phone: profile.phone,
      avatar: profile.avatar,
      role: profile.role,
      address: profile.address || "",
      balance: Number(profile.balance) || 0,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      email,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update profile (and update auth email when provided)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    // update auth email if provided
    if (body.email) {
      try {
        await supabase.auth.admin.updateUserById(id, { email: body.email });
      } catch (e) {
        console.warn("Failed to update auth email:", e);
      }
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({
        username: body.username,
        full_name: body.full_name,
        phone: body.phone,
        avatar: body.avatar,
        role: body.role,
        address: body.address,
        balance: body.balance,
      })
      .eq("user_id", id)
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

// DELETE - Remove profile (and attempt to delete auth user)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error: delProfileError } = await supabase
      .from("profiles")
      .delete()
      .eq("user_id", id);

    if (delProfileError) throw delProfileError;

    try {
      // attempt to delete auth user (soft delete optional)
      await supabase.auth.admin.deleteUser(id);
    } catch (e) {
      console.warn("Failed to delete auth user (you may remove manually):", e);
    }

    return NextResponse.json({ message: "User profile deleted" });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
