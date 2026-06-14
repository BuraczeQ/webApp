'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const PRESETS = [
  { label: 'Pomodoro', work: 25, break: 5 },
  { label: 'Short', work: 15, break: 3 },
  { label: 'Long', work: 50, break: 10 },
]

type Phase = 'work' | 'break'

function beep(ctx: AudioContext, freq: number, duration: number) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.3, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + duration)
}

export default function PomodoroPage() {
  const [workMin, setWorkMin] = useState(25)
  const [breakMin, setBreakMin] = useState(5)
  const [phase, setPhase] = useState<Phase>('work')
  const [seconds, setSeconds] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useState(0)
  const audioCtx = useRef<AudioContext | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const total = phase === 'work' ? workMin * 60 : breakMin * 60
  const progress = ((total - seconds) / total) * 100

  const playAlert = useCallback(() => {
    if (!audioCtx.current) audioCtx.current = new AudioContext()
    const ctx = audioCtx.current
    beep(ctx, 880, 0.3)
    setTimeout(() => beep(ctx, 660, 0.3), 350)
    setTimeout(() => beep(ctx, 880, 0.5), 700)
  }, [])

  const switchPhase = useCallback((next: Phase) => {
    setPhase(next)
    setSeconds(next === 'work' ? workMin * 60 : breakMin * 60)
    setRunning(false)
  }, [workMin, breakMin])

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          playAlert()
          const next: Phase = phase === 'work' ? 'break' : 'work'
          if (phase === 'work') setSessions(n => n + 1)
          switchPhase(next)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, phase, playAlert, switchPhase])

  const reset = () => {
    setRunning(false)
    setSeconds(phase === 'work' ? workMin * 60 : breakMin * 60)
  }

  const applyPreset = (w: number, b: number) => {
    setRunning(false)
    setWorkMin(w)
    setBreakMin(b)
    setPhase('work')
    setSeconds(w * 60)
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  const radius = 90
  const circ = 2 * Math.PI * radius
  const dash = circ - (progress / 100) * circ

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Pomodoro</h1>

      {/* Presets */}
      <div className="mb-6 flex gap-2">
        {PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => applyPreset(p.work, p.break)}
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium hover:bg-neutral-100"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Phase tabs */}
      <div className="mb-8 flex rounded-lg border border-neutral-200 p-1">
        {(['work', 'break'] as Phase[]).map(p => (
          <button
            key={p}
            onClick={() => switchPhase(p)}
            className={`flex-1 rounded-md py-2 text-sm font-medium capitalize transition ${
              phase === p ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            {p === 'work' ? 'Focus' : 'Break'}
          </button>
        ))}
      </div>

      {/* Circle timer */}
      <div className="flex justify-center mb-8">
        <div className="relative">
          <svg width="220" height="220" className="-rotate-90">
            <circle cx="110" cy="110" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
            <circle
              cx="110" cy="110" r={radius} fill="none"
              stroke={phase === 'work' ? '#171717' : '#6ee7b7'}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={dash}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-mono font-bold tracking-tight">{mm}:{ss}</span>
            <span className="mt-1 text-sm text-neutral-500 capitalize">{phase === 'work' ? 'Focus' : 'Break'}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4 mb-8">
        <button
          onClick={() => setRunning(r => !r)}
          className="rounded-xl bg-neutral-900 px-8 py-3 text-base font-medium text-white hover:bg-neutral-700 transition"
        >
          {running ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={reset}
          className="rounded-xl border border-neutral-200 px-6 py-3 text-base font-medium hover:bg-neutral-100 transition"
        >
          Reset
        </button>
      </div>

      {/* Custom durations */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <p className="mb-3 text-sm font-medium text-neutral-700">Custom durations (minutes)</p>
        <div className="flex gap-4">
          <label className="flex-1">
            <span className="text-xs text-neutral-500">Focus</span>
            <input
              type="number" min={1} max={120} value={workMin}
              onChange={e => { const v = Number(e.target.value); setWorkMin(v); if (phase === 'work' && !running) setSeconds(v * 60) }}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
            />
          </label>
          <label className="flex-1">
            <span className="text-xs text-neutral-500">Break</span>
            <input
              type="number" min={1} max={60} value={breakMin}
              onChange={e => { const v = Number(e.target.value); setBreakMin(v); if (phase === 'break' && !running) setSeconds(v * 60) }}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
            />
          </label>
        </div>
      </div>

      {sessions > 0 && (
        <p className="mt-4 text-center text-sm text-neutral-500">
          {sessions} session{sessions !== 1 ? 's' : ''} completed today
        </p>
      )}
    </div>
  )
}
