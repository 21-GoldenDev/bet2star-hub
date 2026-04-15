import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabase/server";

const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS
  ? process.env.NEXT_PUBLIC_ADMIN_EMAILS.split(",").map((email) => email.trim().toLowerCase())
  : [];

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin role resolution.");
  }
  return createClient(supabaseUrl, serviceKey);
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = data.user.email.trim().toLowerCase();
    if (adminEmails.includes(email)) {
      return NextResponse.json({ role: "admin" });
    }

    const service = getServiceClient();

    const { data: staffData, error: staffError } = await service
      .from("staff")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (staffError) {
      throw staffError;
    }

    if (staffData) {
      return NextResponse.json({ role: "staff", id: staffData.id });
    }

    const { data: agentData, error: agentError } = await service
      .from("agent")
      .select("id, staff_id")
      .ilike("email", email)
      .maybeSingle();

    if (agentError) {
      throw agentError;
    }

    if (agentData) {
      return NextResponse.json({ role: "agent", id: agentData.id, staff_id: agentData.staff_id });
    }

    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to resolve admin role" }, { status: 500 });
  }
}
