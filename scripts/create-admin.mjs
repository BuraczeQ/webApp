// One-off: create a shared demo "admin" user via the Supabase admin API.
// Run with:  node --env-file=.env.local scripts/create-admin.mjs
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const email = 'admin@admin.com'
const password = process.env.ADMIN_PASSWORD ?? 'admin'

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: 'Admin' },
})

if (error) {
  // If the user already exists, treat that as success after resetting the password.
  if (/already/i.test(error.message)) {
    const { data: list } = await supabase.auth.admin.listUsers()
    const existing = list?.users.find((u) => u.email === email)
    if (existing) {
      const { error: updErr } = await supabase.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
      })
      if (updErr) {
        console.error('UPDATE_ERROR:', updErr.message)
        process.exit(1)
      }
      console.log(`OK: existing user ${email} updated (id ${existing.id})`)
      process.exit(0)
    }
  }
  console.error('CREATE_ERROR:', error.message)
  process.exit(1)
}

console.log(`OK: created ${data.user.email} (id ${data.user.id})`)
