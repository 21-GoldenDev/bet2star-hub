import { getAdminRoleFromRequest } from "@/lib/admin/role";
import {
  getLottoResultGeneratorPassword,
  isLottoResultGeneratorUnlocked,
  isValidLottoResultGeneratorPassword,
  LOTTO_RESULT_GENERATOR_AUTH_COOKIE,
} from "@/lib/admin/lottoResultGeneratorAuth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const unlocked = await isLottoResultGeneratorUnlocked();
    return NextResponse.json({ unlocked }, { status: 200 });
  } catch (error) {
    console.error("Error checking lotto result generator auth:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const roleInfo = await getAdminRoleFromRequest(request);
    if (!roleInfo || roleInfo.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const configuredPassword = getLottoResultGeneratorPassword();
    if (!configuredPassword) {
      return NextResponse.json(
        { error: "Password is not configured" },
        { status: 500 },
      );
    }

    const body = await request.json();
    const password = typeof body?.password === "string" ? body.password : "";

    if (!isValidLottoResultGeneratorPassword(password)) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const response = NextResponse.json({ unlocked: true }, { status: 200 });
    response.cookies.set(LOTTO_RESULT_GENERATOR_AUTH_COOKIE, "unlocked", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error verifying lotto result generator password:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
