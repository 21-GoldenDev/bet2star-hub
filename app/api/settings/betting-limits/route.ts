import { NextResponse } from "next/server";
import { readMaxWinAmount } from "@/lib/settings/maxWinAmount.server";

export async function GET() {
  try {
    const maxWinAmount = await readMaxWinAmount();
    return NextResponse.json({ maxWinAmount });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load betting limits.";
    console.error("Public betting-limits GET error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
