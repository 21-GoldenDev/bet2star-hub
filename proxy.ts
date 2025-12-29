import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(req: NextRequest) {
  return await updateSession(req)
}

export const config = {
  matcher: [
    '/lotto/:path*',
    '/pools/:path*',
    '/sports/:path*',
    '/profile/:path*',
    '/deposit/:path*',
    '/withdraw/:path*',
    '/auth/:path*',
  ],
};
