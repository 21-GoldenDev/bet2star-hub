import { NextRequest, NextResponse } from "next/server";
import { getAdminRoleFromRequest } from "@/lib/admin/role";
import {
  readContactSettings,
  writeContactSettings,
} from "@/lib/contactSettings.server";

function normalizePayload(body: unknown) {
  if (!body || typeof body !== "object") {
    return { email: "", phone: "" };
  }

  const row = body as Record<string, unknown>;
  return {
    email: typeof row.email === "string" ? row.email.trim() : "",
    phone: typeof row.phone === "string" ? row.phone.trim() : "",
  };
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function GET(request: NextRequest) {
  try {
    const roleInfo = await getAdminRoleFromRequest(request);
    if (!roleInfo || roleInfo.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const settings = await readContactSettings();
    return NextResponse.json(settings);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load contact settings.";
    console.error("Admin contact settings GET error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const roleInfo = await getAdminRoleFromRequest(request);
    if (!roleInfo || roleInfo.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const payload = normalizePayload(await request.json());

    if (payload.email && !isValidEmail(payload.email)) {
      return NextResponse.json(
        { error: "Enter a valid contact email address." },
        { status: 400 }
      );
    }

    if (!payload.email && !payload.phone) {
      return NextResponse.json(
        { error: "Enter at least a contact email or phone number." },
        { status: 400 }
      );
    }

    const saved = await writeContactSettings(payload);
    return NextResponse.json(saved);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to save contact settings.";
    console.error("Admin contact settings PUT error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
