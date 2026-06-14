'use client'

import { useState } from 'react'
import { login, signup } from './actions'

export default function AuthForm({ message }: { message?: string }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const isSignup = mode === 'signup'

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

      <form action={isSignup ? signup : login} className="space-y-4">
        {isSignup && (
          <Field name="full_name" label="Full name" type="text" required />
        )}
        <Field name="email" label="Email" type="email" required />
        <Field name="password" label="Password" type="password" required minLength={6} />

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
