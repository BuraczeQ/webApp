import { NextResponse, type NextRequest } from 'next/server'

// Reads the Supabase session cookie directly — no Supabase client needed in Edge runtime.
// The dashboard layout performs the real auth check with getUser().
export function updateSession(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl
    const isPublic = pathname.startsWith('/login') || pathname.startsWith('/auth')
    if (isPublic) return NextResponse.next({ request })

    // Derive the project ref from the Supabase URL. Guard against a missing/malformed
    // env var so middleware never throws (which would surface as a 500 / MIDDLEWARE_INVOCATION_FAILED).
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const projectRef = supabaseUrl?.split('//')[1]?.split('.')[0]
    if (!projectRef) {
      // Env not configured — fail open rather than crashing the whole site.
      return NextResponse.next({ request })
    }

    // Supabase sets this cookie when a session exists
    const sessionCookie =
      request.cookies.get(`sb-${projectRef}-auth-token`) ??
      request.cookies.get(`sb-${projectRef}-auth-token.0`)

    if (!sessionCookie) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    return NextResponse.next({ request })
  } catch {
    // Never let the middleware throw — let the request through and rely on the
    // server-side auth check in the dashboard layout.
    return NextResponse.next({ request })
  }
}
