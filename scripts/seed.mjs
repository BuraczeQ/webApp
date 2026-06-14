/**
 * Seed script — creates 5 test users with notes and pacman scores.
 * Run ONCE:  node scripts/seed.mjs
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local  (the sb_secret_… key)
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Parse .env.local manually (no dotenv dependency needed)
const envPath = resolve(process.cwd(), '.env.local')
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => l.split('=').map(p => p.trim()))
    .filter(([k]) => k)
    .map(([k, ...v]) => [k, v.join('=')])
)

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY || SERVICE_KEY.includes('YOUR')) {
  console.error('❌  Add SUPABASE_SERVICE_ROLE_KEY=sb_secret_... to .env.local first.')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const USERS = [
  { email: 'alice@example.com',   password: 'password123', full_name: 'Alice Hansen',  username: 'alice' },
  { email: 'bob@example.com',     password: 'password123', full_name: 'Bob Larsen',    username: 'bob' },
  { email: 'charlie@example.com', password: 'password123', full_name: 'Charlie Berg',  username: 'charlie' },
  { email: 'diana@example.com',   password: 'password123', full_name: 'Diana Nilsen',  username: 'diana' },
  { email: 'eve@example.com',     password: 'password123', full_name: 'Eve Olsen',     username: 'eve' },
]

const NOTES = {
  alice:   [{ title: 'Project ideas', content: '- Build a habit tracker\n- Try Next.js 16\n- Read "Clean Code"' },
             { title: 'Meeting prep', content: 'Agenda:\n1. Q3 review\n2. Roadmap for Q4\n3. AOB' }],
  bob:     [{ title: 'Shopping list', content: 'Milk, eggs, bread, coffee, oranges' },
             { title: 'Workout plan', content: 'Mon: chest\nWed: legs\nFri: back\nSun: rest' }],
  charlie: [{ title: 'Book notes', content: '"Atomic Habits" — make it obvious, attractive, easy, satisfying.' },
             { title: 'Recipe: pasta', content: 'Boil water. Salt generously. Cook 9min. Toss with sauce.' }],
  diana:   [{ title: 'Travel bucket list', content: 'Japan, Norway, Iceland, New Zealand, Patagonia' },
             { title: 'Learning goals', content: 'TypeScript deep dive\nLearn Rust basics\nFinish React course' }],
  eve:     [{ title: 'Daily standup', content: 'Done: auth flow\nDoing: gallery page\nBlocked: nothing' },
             { title: 'Quotes', content: '"The best way to predict the future is to invent it." — Alan Kay' }],
}

const SCORES = {
  alice:   [980, 1540, 2200],
  bob:     [500, 320, 1100],
  charlie: [3400, 2800, 4100],
  diana:   [750, 1250, 890],
  eve:     [2100, 1800, 3000],
}

async function run() {
  const created = {}

  for (const u of USERS) {
    // Create auth user (email_confirm bypassed with service role)
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.full_name },
    })
    if (error) {
      if (error.message.includes('already been registered')) {
        // User exists — fetch their id
        const { data: list } = await admin.auth.admin.listUsers()
        const existing = list?.users.find(x => x.email === u.email)
        if (existing) { created[u.username] = existing.id; console.log(`⏭  ${u.email} already exists`) }
        continue
      }
      console.error(`❌  ${u.email}:`, error.message); continue
    }
    created[u.username] = data.user.id
    console.log(`✅  Created ${u.email}`)

    // Update profile username
    await admin.from('profiles').upsert({ id: data.user.id, username: u.username, full_name: u.full_name })
  }

  // Seed notes — bypass RLS with service role
  for (const [username, uid] of Object.entries(created)) {
    const notes = NOTES[username] ?? []
    for (const note of notes) {
      const { error } = await admin.from('notes').insert({ user_id: uid, ...note })
      if (error) console.error(`  note error (${username}):`, error.message)
    }
    console.log(`  📝  Added ${notes.length} notes for ${username}`)
  }

  // Seed pacman scores
  for (const [username, uid] of Object.entries(created)) {
    const scores = SCORES[username] ?? []
    for (const score of scores) {
      const played_at = new Date(Date.now() - Math.random()*7*24*60*60*1000).toISOString()
      const { error } = await admin.from('pacman_scores').insert({ user_id: uid, score, played_at })
      if (error) console.error(`  score error (${username}):`, error.message)
    }
    console.log(`  🎮  Added ${scores.length} scores for ${username}`)
  }

  console.log('\n✨  Seed complete. Log in with any of:')
  USERS.forEach(u => console.log(`   ${u.email}  /  password123`))
}

run().catch(console.error)
