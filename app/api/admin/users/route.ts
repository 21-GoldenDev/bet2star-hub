import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getAdminRoleFromRequest, getManagedPlayerIds, getManagedTerminalIds } from "@/lib/admin/role";
import { validateAuthPassword } from "@/lib/auth/hierarchyPassword";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin users API.");
  }
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roleInfo = await getAdminRoleFromRequest(request);
    if (!roleInfo) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const service = getServiceClient();
    let profilesQuery = service.from("profiles").select("*").order("created_at", { ascending: false });

    if (roleInfo.role !== "admin") {
      const terminalIds = await getManagedTerminalIds(roleInfo);
      if (!terminalIds || terminalIds.length === 0) {
        return NextResponse.json([]);
      }

      const playerIds = await getManagedPlayerIds(terminalIds);
      if (playerIds.length === 0) {
        return NextResponse.json([]);
      }

      profilesQuery = profilesQuery.in("user_id", playerIds);
    }

    const { data: profiles, error: profilesError } = await profilesQuery;
    if (profilesError) {
      throw profilesError;
    }

    const authList = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const authUsers = authList.data?.users || [];
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
      ...(roleInfo.role === "admin" ? { password: p.password || "" } : {}),
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roleInfo = await getAdminRoleFromRequest(request);
    if (!roleInfo) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (roleInfo.role !== "admin") {
      return NextResponse.json({ error: "Only admins can create online users." }, { status: 403 });
    }

    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const passwordError = validateAuthPassword(password);
    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const service = getServiceClient();
    const { data: authData, error: createAuthError } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "user" },
    });

    if (createAuthError) {
      throw createAuthError;
    }

    const userId = authData.user?.id;
    if (!userId) {
      throw new Error("Failed to create auth user.");
    }

    const { data: profileData, error: insertError } = await service
      .from("profiles")
      .insert([
        {
          user_id: userId,
          username: body.username,
          full_name: body.full_name,
          phone: body.phone,
          address: body.address || "",
          avatar: body.avatar || null,
          role: body.role || "user",
          balance: body.balance || 0,
          password,
        },
      ])
      .select();

    if (insertError) {
      await service.auth.admin.deleteUser(userId);
      throw insertError;
    }

    return NextResponse.json(profileData?.[0] || null, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create user" }, { status: 500 });
  }
}
