'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type Meeting = {
  id: string
  title: string
  date: string       // YYYY-MM-DD
  time: string       // HH:MM
  duration: number   // minutes
  notes: string
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function firstDay(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}
function pad(n: number) { return String(n).padStart(2, '0') }
function toDateStr(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

export default function CalendarPage() {
  const supabase = createClient()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', time: '09:00', duration: 60, notes: '' })
  const [editId, setEditId] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('meetings').select('*').order('date').order('time')
      .then(({ data }) => setMeetings(data ?? []))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const meetingsOn = (date: string) => meetings.filter(m => m.date === date)

  const openNew = (date: string) => {
    setSelectedDate(date)
    setForm({ title: '', time: '09:00', duration: 60, notes: '' })
    setEditId(null)
    setShowForm(true)
  }

  const openEdit = (m: Meeting) => {
    setSelectedDate(m.date)
    setForm({ title: m.title, time: m.time, duration: m.duration, notes: m.notes })
    setEditId(m.id)
    setShowForm(true)
  }

  const save = async () => {
    if (!form.title.trim() || !selectedDate) return
    if (editId) {
      const { data } = await supabase.from('meetings').update({ ...form, date: selectedDate }).eq('id', editId).select().single()
      if (data) setMeetings(ms => ms.map(m => m.id === editId ? data : m))
    } else {
      const { data } = await supabase.from('meetings').insert({ ...form, date: selectedDate }).select().single()
      if (data) setMeetings(ms => [...ms, data].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)))
    }
    setShowForm(false)
  }

  const remove = async (id: string) => {
    await supabase.from('meetings').delete().eq('id', id)
    setMeetings(ms => ms.filter(m => m.id !== id))
  }

  const totalDays = daysInMonth(year, month)
  const startDay = firstDay(year, month)
  const cells: (number | null)[] = [...Array(startDay).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)]

  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())

  return (
    <div className="flex gap-6 h-[calc(100vh-4rem)]">
      {/* Calendar */}
      <div className="flex-1 flex flex-col">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <div className="flex items-center gap-3">
            <button onClick={prev} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-100">←</button>
            <span className="text-sm font-medium w-36 text-center">{MONTHS[month]} {year}</span>
            <button onClick={next} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-100">→</button>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden flex-1 flex flex-col">
          <div className="grid grid-cols-7 border-b border-neutral-200">
            {DAYS.map(d => (
              <div key={d} className="py-2 text-center text-xs font-medium text-neutral-500">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 flex-1" style={{ gridAutoRows: '1fr' }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} className="border-r border-b border-neutral-100 bg-neutral-50" />
              const dateStr = toDateStr(year, month, day)
              const isToday = dateStr === todayStr
              const dayMeetings = meetingsOn(dateStr)
              return (
                <div
                  key={i}
                  onClick={() => openNew(dateStr)}
                  className="border-r border-b border-neutral-100 p-1.5 cursor-pointer hover:bg-neutral-50 transition"
                >
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    isToday ? 'bg-neutral-900 text-white' : 'text-neutral-700'
                  }`}>{day}</span>
                  <div className="mt-1 space-y-0.5">
                    {dayMeetings.slice(0, 2).map(m => (
                      <div
                        key={m.id}
                        onClick={e => { e.stopPropagation(); openEdit(m) }}
                        className="truncate rounded bg-neutral-900 px-1 py-0.5 text-xs text-white"
                      >
                        {m.time} {m.title}
                      </div>
                    ))}
                    {dayMeetings.length > 2 && (
                      <div className="text-xs text-neutral-400">+{dayMeetings.length - 2} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Side panel: upcoming meetings */}
      <div className="w-64 shrink-0 flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-neutral-700">Upcoming</h2>
        <div className="flex-1 overflow-y-auto space-y-2">
          {meetings
            .filter(m => m.date >= todayStr)
            .slice(0, 20)
            .map(m => (
              <div key={m.id} className="rounded-xl border border-neutral-200 bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{m.title}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{m.date} · {m.time} · {m.duration}min</p>
                    {m.notes && <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{m.notes}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(m)} className="text-xs text-neutral-400 hover:text-neutral-700">✎</button>
                    <button onClick={() => remove(m.id)} className="text-xs text-neutral-400 hover:text-red-500">✕</button>
                  </div>
                </div>
              </div>
            ))}
          {meetings.filter(m => m.date >= todayStr).length === 0 && (
            <p className="text-sm text-neutral-400">No upcoming meetings. Click a date to add one.</p>
          )}
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-semibold">{editId ? 'Edit meeting' : 'New meeting'} · {selectedDate}</h2>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-neutral-600">Title</span>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Meeting title" autoFocus
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900" />
              </label>
              <div className="flex gap-3">
                <label className="flex-1">
                  <span className="text-xs font-medium text-neutral-600">Time</span>
                  <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900" />
                </label>
                <label className="flex-1">
                  <span className="text-xs font-medium text-neutral-600">Duration (min)</span>
                  <input type="number" min={5} max={480} value={form.duration}
                    onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900" />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-medium text-neutral-600">Notes</span>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Agenda, links, context…" rows={3}
                  className="mt-1 w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900" />
              </label>
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={save} className="flex-1 rounded-lg bg-neutral-900 py-2 text-sm font-medium text-white hover:bg-neutral-700">
                {editId ? 'Save changes' : 'Add meeting'}
              </button>
              <button onClick={() => setShowForm(false)} className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-100">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
