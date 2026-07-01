import { NextResponse } from "next/server";
import {
  hasContactDetails,
  readContactSettings,
} from "@/lib/contactSettings.server";

export async function GET() {
  try {
    const settings = await readContactSettings();

    if (!hasContactDetails(settings)) {
      return NextResponse.json({ email: "", phone: "" });
    }

    return NextResponse.json(settings);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load contact settings.";
    console.error("Public contact settings GET error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
