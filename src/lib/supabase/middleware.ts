import { NextResponse, type NextRequest } from 'next/server'

// Reads the Supabase session cookie directly — no Supabase client needed in Edge runtime.
// The dashboard layout performs the real auth check with getUser().
export function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = pathname.startsWith('/login') || pathname.startsWith('/auth')
  if (isPublic) return NextResponse.next({ request })

  // Supabase sets this cookie when a session exists
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL!.split('//')[1].split('.')[0]
  const sessionCookie = request.cookies.get(`sb-${projectRef}-auth-token`)
    ?? request.cookies.get(`sb-${projectRef}-auth-token.0`)

  if (!sessionCookie) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next({ request })
}
