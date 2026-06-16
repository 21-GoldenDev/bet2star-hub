import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { validateAuthPassword, validateHierarchyPassword } from "@/lib/auth/hierarchyPassword";

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

async function findProfileUser(email: string) {
  const authUser = await getAuthUserByEmail(email);
  if (!authUser) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", authUser.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (profile && profile.password != null && String(profile.password).length > 0) {
    return { type: "user" as const, row: profile, authUserId: authUser.id };
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
    const profileUser = legacyUser ? null : await findProfileUser(email);
    const account = legacyUser || profileUser;

    if (!account) {
      const authUser = await getAuthUserByEmail(email);
      if (authUser) {
        return NextResponse.json(
          { error: "Invalid email or password." },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: "No account found for this email." },
        { status: 401 }
      );
    }

    const storedPassword = String(account.row.password || "");
    if (storedPassword !== password) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const passwordError =
      account.type === "user"
        ? validateAuthPassword(storedPassword)
        : validateHierarchyPassword(storedPassword);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const userMetadata =
      account.type === "user"
        ? { role: account.row.role || "user" }
        : { role: account.type };

    if (account.type === "user") {
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        account.authUserId,
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
      const authUser = await getAuthUserByEmail(email);
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
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Legacy login failed." },
      { status: 500 }
    );
  }
}
