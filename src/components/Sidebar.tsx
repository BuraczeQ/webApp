'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'Dashboard', icon: '◆' },
  { href: '/pomodoro', label: 'Pomodoro', icon: '◷' },
  { href: '/notes', label: 'Notes', icon: '✎' },
  { href: '/calendar', label: 'Calendar', icon: '▦' },
  { href: '/gallery', label: 'Gallery', icon: '⊞' },
  { href: '/pacman', label: 'Pac-Man', icon: '◉' },
  { href: '/creative', label: 'Creative', icon: '✦' },
]

export default function Sidebar({ email }: { email: string }) {
  const pathname = usePathname()

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-neutral-200 bg-white">
      <div className="px-6 py-5">
        <span className="text-lg font-semibold tracking-tight">webOnline</span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {links.map(({ href, label, icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-neutral-200 px-4 py-4">
        <p className="truncate text-xs text-neutral-500">{email}</p>
        <form action="/auth/signout" method="post" className="mt-2">
          <button className="text-sm font-medium text-neutral-700 hover:text-neutral-900">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
