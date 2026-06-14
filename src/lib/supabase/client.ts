import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  // These are inlined into the browser bundle at BUILD time. If they're missing
  // here, the env vars weren't set when the app was built — redeploy with
  // NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY configured.
  if (!url || !key) {
    throw new Error(
      'Supabase env vars are missing from the client bundle. Set NEXT_PUBLIC_SUPABASE_URL ' +
        'and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in Vercel and redeploy (these are baked in at build time).'
    )
  }

  return createBrowserClient(url, key)
}
