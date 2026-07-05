import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export interface SessionResult {
  response: NextResponse;
  user: User | null;
}

/**
 * Refreshes the Supabase auth session for the current request
 * (official @supabase/ssr middleware pattern).
 *
 * Returns the response carrying refreshed cookies plus the current user,
 * so route-protection logic can build on it without a second auth call.
 */
export async function updateSession(request: NextRequest): Promise<SessionResult> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: getUser() validates the JWT against Supabase — do not replace
  // with getSession(), which trusts the (spoofable) cookie contents.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
