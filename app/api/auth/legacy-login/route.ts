import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function findLegacyUser(email: string) {
  const normalizedEmail = email.trim();

  const { data: agent, error: agentError } = await supabase
    .from("agent")
    .select("*")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (agentError) {
    throw agentError;
  }

  if (agent && agent.password === undefined) {
    return null;
  }

  if (agent && String(agent.email).toLowerCase() === normalizedEmail.toLowerCase()) {
    return { type: "agent", row: agent };
  }

  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .select("*")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (staffError) {
    throw staffError;
  }

  if (staff && staff.password === undefined) {
    return null;
  }

  if (staff && String(staff.email).toLowerCase() === normalizedEmail.toLowerCase()) {
    return { type: "staff", row: staff };
  }

  return null;
}

async function getAuthUserByEmail(email: string) {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    throw error;
  }

  return data?.users?.find(
    (user: any) =>
      typeof user.email === "string" &&
      user.email.toLowerCase() === email.toLowerCase()
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim();
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
