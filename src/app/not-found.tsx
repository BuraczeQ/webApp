import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-50">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-neutral-500">Page not found.</p>
      <Link href="/" className="rounded-lg bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-700">
        Go home
      </Link>
    </main>
  )
}
