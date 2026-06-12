import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

function isEmail(value: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

async function getEmailFromProfileUsername(username: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id")
    .ilike("username", username)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.user_id) {
    return null;
  }

  const { data: user, error: userError } = await supabase.auth.admin.getUserById(data.user_id);
  if (userError) {
    throw userError;
  }

  if (!user?.user?.email) {
    return null;
  }

  return user.user.email;
}

async function getEmailFromAgentOrStaffUsername(username: string) {
  const normalized = username.trim();

  const { data: agent, error: agentError } = await supabase
    .from("agent")
    .select("email")
    .ilike("username", normalized)
    .maybeSingle();

  if (agentError) {
    throw agentError;
  }

  if (agent?.email) {
    return agent.email;
  }

  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .select("email")
    .ilike("username", normalized)
    .maybeSingle();

  if (staffError) {
    throw staffError;
  }

  return staff?.email || null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const identifier = String(body.identifier || "").trim();

    if (!identifier) {
      return NextResponse.json({ error: "Identifier is required." }, { status: 400 });
    }

    if (isEmail(identifier)) {
      return NextResponse.json({ email: identifier.toLowerCase() });
    }

    const emailFromAgentOrStaff = await getEmailFromAgentOrStaffUsername(identifier);
    if (emailFromAgentOrStaff) {
      return NextResponse.json({ email: emailFromAgentOrStaff.toLowerCase() });
    }

    const emailFromProfile = await getEmailFromProfileUsername(identifier);
    if (emailFromProfile) {
      return NextResponse.json({ email: emailFromProfile.toLowerCase() });
    }

    return NextResponse.json(
      { error: "No account found for this username." },
      { status: 404 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to resolve identifier." },
      { status: 500 }
    );
  }
}
