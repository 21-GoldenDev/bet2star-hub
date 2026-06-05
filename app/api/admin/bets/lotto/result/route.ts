import { createSupabaseServer } from "@/lib/supabase/server";
import { getAdminRoleFromRequest } from "@/lib/admin/role";
import { applyLottoResult } from "@/lib/admin/applyLottoResult";
import { getServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const roleInfo = await getAdminRoleFromRequest(request);
    if (!roleInfo) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const supabase = await createSupabaseServer();
    const body = await request.json();
    const gameId = body?.game_id;
    const result = body?.result;

    if (!gameId || result === undefined || result === null || result === "") {
      return NextResponse.json({ error: "game_id and result are required" }, { status: 400 });
    }

    if (!Array.isArray(result)) {
      return NextResponse.json({ error: "result must be an array of numbers" }, { status: 400 });
    }

    const validResult = result.filter((num) => typeof num === "number" && !isNaN(num));

    const service = getServiceClient();
    const { error, balanceUpdates } = await applyLottoResult(service, gameId, validResult);

    if (error) {
      console.error("Error applying lotto result:", error);
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true, balanceUpdates }, { status: 200 });
  } catch (error) {
    console.error("Error setting lotto result:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
