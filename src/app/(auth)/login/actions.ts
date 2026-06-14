'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) redirect('/login?message=' + encodeURIComponent(error.message))

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  // Build the confirmation redirect from the request origin so the email link
  // points back to the same host the user signed up on (prod or localhost),
  // not Supabase's static Site URL.
  const headerList = await headers()
  const origin =
    headerList.get('origin') ??
    (headerList.get('host') ? `https://${headerList.get('host')}` : '')

  const { error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: { full_name: formData.get('full_name') as string },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) redirect('/login?message=' + encodeURIComponent(error.message))

  revalidatePath('/', 'layout')
  redirect('/login?message=Check your email to confirm your account.')
}
