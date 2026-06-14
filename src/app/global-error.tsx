'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          color: '#171717',
          textAlign: 'center',
          padding: '1.5rem',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Something went wrong</h1>
        <p style={{ maxWidth: '28rem', fontSize: '0.875rem', color: '#525252' }}>
          The app hit an unexpected error while loading. Please try again — if it keeps happening,
          the site may need to be redeployed.
        </p>
        {error.digest && (
          <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#a3a3a3' }}>
            ref: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          style={{
            borderRadius: '0.5rem',
            background: '#171717',
            color: '#fff',
            padding: '0.5rem 1.25rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
