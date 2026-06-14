'use client'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const missingEnv = /Supabase env vars are missing/.test(error.message)

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm text-neutral-600">
        {missingEnv
          ? 'The app can’t reach its database because configuration is missing from this build. The site needs to be redeployed with its environment variables.'
          : 'An unexpected error occurred while loading this page.'}
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-neutral-400">ref: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="rounded-lg bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-700"
      >
        Try again
      </button>
    </div>
  )
}
