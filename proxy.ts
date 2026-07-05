import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

const PROTECTED_PATHS = ['/dashboard', '/unlock'] as const;

/**
 * Request proxy (Next.js 16 successor of `middleware.ts`).
 *
 * 1. Refreshes the Supabase session cookie on every matched request.
 * 2. Redirects unauthenticated users away from protected routes.
 *
 * NOTE: the E2EE private-key check ("key present in this browser?") is
 * deliberately NOT done here — localStorage is invisible to the server.
 * That check lives client-side (login flow / unlock page).
 */
export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const isProtected = PROTECTED_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  if (!user && isProtected) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  // Everything except static assets — the session refresh must run on all
  // app routes so Server Components never see an expired token.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
