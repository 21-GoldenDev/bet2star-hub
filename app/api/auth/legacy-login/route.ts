import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { validateHierarchyPassword } from "@/lib/auth/hierarchyPassword";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function findLegacyUser(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const { data: agent, error: agentError } = await supabase
    .from("agent")
    .select("*")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (agentError) {
    throw agentError;
  }

  if (agent?.status === "inactive") {
    return null;
  }

  if (agent && agent.password != null && String(agent.password).length > 0) {
    return { type: "agent" as const, row: agent };
  }

  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .select("*")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (staffError) {
    throw staffError;
  }

  if (staff?.status === "inactive") {
    return null;
  }

  if (staff && staff.password != null && String(staff.password).length > 0) {
    return { type: "staff" as const, row: staff };
  }

  return null;
}

async function getAuthUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw error;
    }

    const users = data?.users ?? [];
    const match = users.find(
      (user: any) =>
        typeof user.email === "string" && user.email.toLowerCase() === normalizedEmail
    );
    if (match) {
      return match;
    }

    if (users.length < perPage) {
      return null;
    }

    page += 1;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const legacyUser = await findLegacyUser(email);
    if (!legacyUser) {
      return NextResponse.json(
        { error: "No legacy staff or agent account found for this email." },
        { status: 401 }
      );
    }

    const storedPassword = String(legacyUser.row.password || "");
    if (storedPassword !== password) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const passwordError = validateHierarchyPassword(storedPassword);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const authUser = await getAuthUserByEmail(email);
    const userMetadata = { role: legacyUser.type };
    if (authUser) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        authUser.id,
        {
          password,
          email_confirm: true,
          user_metadata: userMetadata,
        }
      );

      if (updateError) {
        throw updateError;
      }
    } else {
      const { error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: userMetadata,
      });

      if (createError) {
        throw createError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Legacy login failed." },
      { status: 500 }
    );
  }
}
