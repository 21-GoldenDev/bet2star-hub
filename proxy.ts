import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Protected routes that require authentication
const protectedRoutes = [
  '/lotto',
  '/pools',
  '/sports',
  '/profile',
  '/deposit',
  '/withdraw',
];

// Routes that should only be accessible when NOT authenticated
const authRoutes = ['/auth'];

export async function proxy(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  // Create a Supabase client configured to use cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({
            request: req,
          });
          cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims

  const { pathname } = req.nextUrl;

  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check if the current path is an auth route
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Redirect unauthenticated users away from protected routes
  if (isProtectedRoute && !user) {
    // const redirectUrl = new URL('/auth', req.url);
    // redirectUrl.searchParams.set('redirectTo', pathname);
    // return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users away from auth routes
  if (isAuthRoute && user) {
    // return NextResponse.redirect(new URL('/', req.url));
  }

  return res;
}

// Configure which routes should trigger the middleware
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
