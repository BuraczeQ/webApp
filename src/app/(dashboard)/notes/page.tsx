'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type Note = { id: string; title: string; content: string; updated_at: string }

export default function NotesPage() {
  const supabase = createClient()
  const [notes, setNotes] = useState<Note[]>([])
  const [selected, setSelected] = useState<Note | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('notes').select('*').order('updated_at', { ascending: false })
      .then(({ data }) => { setNotes(data ?? []); setLoading(false) })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const select = (note: Note) => {
    setSelected(note)
    setTitle(note.title)
    setContent(note.content)
  }

  const newNote = () => {
    setSelected(null)
    setTitle('')
    setContent('')
  }

  const save = useCallback(async () => {
    setSaving(true)
    if (selected) {
      const { data } = await supabase.from('notes')
        .update({ title, content })
        .eq('id', selected.id)
        .select()
        .single()
      if (data) {
        setSelected(data)
        setNotes(ns => ns.map(n => n.id === data.id ? data : n))
      }
    } else {
      const { data } = await supabase.from('notes')
        .insert({ title: title || 'Untitled', content })
        .select()
        .single()
      if (data) {
        setSelected(data)
        setNotes(ns => [data, ...ns])
      }
    }
    setSaving(false)
  }, [selected, title, content, supabase])

  const deleteNote = async (id: string) => {
    await supabase.from('notes').delete().eq('id', id)
    setNotes(ns => ns.filter(n => n.id !== id))
    if (selected?.id === id) newNote()
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-6">
      {/* Sidebar */}
      <div className="w-64 shrink-0 flex flex-col gap-3">
        <button
          onClick={newNote}
          className="w-full rounded-lg bg-neutral-900 py-2 text-sm font-medium text-white hover:bg-neutral-700 transition"
        >
          + New note
        </button>
        <div className="flex-1 overflow-y-auto space-y-1">
          {loading && <p className="text-sm text-neutral-400 px-2">Loading…</p>}
          {notes.map(note => (
            <div
              key={note.id}
              onClick={() => select(note)}
              className={`group flex items-start justify-between rounded-lg px-3 py-2.5 cursor-pointer ${
                selected?.id === note.id ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{note.title || 'Untitled'}</p>
                <p className={`text-xs mt-0.5 truncate ${selected?.id === note.id ? 'text-neutral-400' : 'text-neutral-400'}`}>
                  {new Date(note.updated_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); deleteNote(note.id) }}
                className="ml-2 shrink-0 opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 text-xs"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col gap-3">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Note title…"
          className="text-2xl font-semibold outline-none bg-transparent placeholder:text-neutral-300"
        />
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Start writing…"
          className="flex-1 resize-none rounded-xl border border-neutral-200 bg-white p-4 text-sm leading-relaxed outline-none focus:border-neutral-400 font-mono"
        />
        <div className="flex justify-end">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-neutral-900 px-6 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 transition"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
