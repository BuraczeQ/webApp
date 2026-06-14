'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type Picture = {
  id: string
  storage_path: string
  caption: string | null
  mime_type: string | null
  size_bytes: number | null
  created_at: string
  url?: string
}

function formatBytes(b: number | null) {
  if (!b) return ''
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

export default function GalleryPage() {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pictures, setPictures] = useState<Picture[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selected, setSelected] = useState<Picture | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [caption, setCaption] = useState('')

  useEffect(() => {
    loadPictures()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadPictures() {
    setLoading(true)
    const { data } = await supabase
      .from('pictures')
      .select('*')
      .order('created_at', { ascending: false })

    if (!data) { setLoading(false); return }

    // Generate signed URLs for each picture
    const withUrls = await Promise.all(
      data.map(async (pic) => {
        const { data: signed } = await supabase.storage
          .from('pictures')
          .createSignedUrl(pic.storage_path, 60 * 60) // 1 hour
        return { ...pic, url: signed?.signedUrl ?? '' }
      })
    )
    setPictures(withUrls)
    setLoading(false)
  }

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setUploading(true)
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('pictures')
        .upload(path, file, { contentType: file.type })

      if (uploadError) { console.error(uploadError); continue }

      await supabase.from('pictures').insert({
        storage_path: path,
        mime_type: file.type,
        size_bytes: file.size,
        caption: null,
      })
    }
    setUploading(false)
    await loadPictures()
  }

  async function deletePicture(pic: Picture) {
    await supabase.storage.from('pictures').remove([pic.storage_path])
    await supabase.from('pictures').delete().eq('id', pic.id)
    setPictures(ps => ps.filter(p => p.id !== pic.id))
    if (selected?.id === pic.id) setSelected(null)
  }

  async function saveCaption(pic: Picture) {
    await supabase.from('pictures').update({ caption }).eq('id', pic.id)
    setPictures(ps => ps.map(p => p.id === pic.id ? { ...p, caption } : p))
    setSelected(prev => prev ? { ...prev, caption } : prev)
  }

  const openLightbox = (pic: Picture) => {
    setSelected(pic)
    setCaption(pic.caption ?? '')
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Gallery</h1>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="rounded-lg bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 transition"
        >
          {uploading ? 'Uploading…' : '+ Upload photos'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => uploadFiles(e.target.files)}
        />
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); uploadFiles(e.dataTransfer.files) }}
        onClick={() => fileRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center text-sm text-neutral-400 transition ${
          dragOver ? 'border-neutral-900 bg-neutral-50 text-neutral-700' : 'border-neutral-200 hover:border-neutral-400'
        }`}
      >
        {uploading
          ? 'Uploading your photos…'
          : 'Drag & drop photos here, or click to select'}
      </div>

      {/* Grid */}
      {loading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : pictures.length === 0 ? (
        <p className="text-sm text-neutral-400">No photos yet. Upload some above.</p>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {pictures.map(pic => (
              <div
                key={pic.id}
                onClick={() => openLightbox(pic)}
                className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl bg-neutral-100"
              >
                {pic.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pic.url}
                    alt={pic.caption ?? ''}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
                <button
                  onClick={e => { e.stopPropagation(); deletePicture(pic) }}
                  className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition hover:bg-red-600"
                >
                  ✕
                </button>
                {pic.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 px-2 pb-2 pt-4">
                    <p className="truncate text-xs text-white">{pic.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative flex max-h-[90vh] max-w-4xl w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Image */}
            <div className="flex-1 overflow-hidden bg-neutral-950 flex items-center justify-center min-h-0">
              {selected.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selected.url}
                  alt={selected.caption ?? ''}
                  className="max-h-[65vh] w-auto object-contain"
                />
              )}
            </div>

            {/* Info panel */}
            <div className="p-5 space-y-3 border-t border-neutral-200">
              <div className="flex items-start gap-3">
                <input
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveCaption(selected)}
                  placeholder="Add a caption…"
                  className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
                />
                <button
                  onClick={() => saveCaption(selected)}
                  className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
                >
                  Save
                </button>
              </div>
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>{new Date(selected.created_at).toLocaleString()}</span>
                <span>{selected.mime_type} · {formatBytes(selected.size_bytes)}</span>
                <button
                  onClick={() => deletePicture(selected)}
                  className="text-red-500 hover:text-red-700 font-medium"
                >
                  Delete photo
                </button>
              </div>
            </div>

            <button
              onClick={() => setSelected(null)}
              className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
