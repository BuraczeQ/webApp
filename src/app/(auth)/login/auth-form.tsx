'use client'

import { useRef, useState } from 'react'
import { login, signup } from './actions'

const DEMO_EMAIL = 'admin@admin.com'
const DEMO_PASSWORD = 'admin'

export default function AuthForm({ message }: { message?: string }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const isSignup = mode === 'signup'
  const formRef = useRef<HTMLFormElement>(null)

  const fillDemo = () => {
    setMode('login')
    const form = formRef.current
    if (!form) return
    const email = form.elements.namedItem('email') as HTMLInputElement | null
    const password = form.elements.namedItem('password') as HTMLInputElement | null
    if (email) email.value = DEMO_EMAIL
    if (password) password.value = DEMO_PASSWORD
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
      <h1 className="mb-6 text-center text-2xl font-semibold tracking-tight">webOnline</h1>

      {/* Tabs */}
      <div className="mb-6 flex rounded-lg border border-neutral-200 p-1">
        <button
          type="button"
          onClick={() => setMode('login')}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
            !isSignup ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          Log in
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
            isSignup ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          Sign up
        </button>
      </div>

      <form ref={formRef} action={isSignup ? signup : login} className="space-y-4">
        {isSignup && (
          <Field name="full_name" label="Full name" type="text" required />
        )}
        <Field name="email" label="Email" type="email" required />
        <Field
          name="password"
          label="Password"
          type="password"
          required
          minLength={isSignup ? 6 : undefined}
        />

        <button
          type="submit"
          className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700"
        >
          {isSignup ? 'Create account' : 'Log in'}
        </button>
      </form>

      {message && (
        <p className="mt-4 rounded-lg bg-neutral-100 px-3 py-2 text-center text-sm text-neutral-700">
          {message}
        </p>
      )}

      {!isSignup && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
          <p className="font-medium text-amber-900">Just want to look around?</p>
          <p className="mt-1 text-amber-800">
            Use the demo account — email <span className="font-mono font-semibold">{DEMO_EMAIL}</span>,
            password <span className="font-mono font-semibold">{DEMO_PASSWORD}</span>.
          </p>
          <button
            type="button"
            onClick={fillDemo}
            className="mt-2 w-full rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-600"
          >
            Use demo account
          </button>
        </div>
      )}
    </div>
  )
}

function Field({
  name, label, type, required, minLength,
}: { name: string; label: string; type: string; required?: boolean; minLength?: number }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        minLength={minLength}
        className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
      />
    </label>
  )
}
