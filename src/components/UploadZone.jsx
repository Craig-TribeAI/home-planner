import { useRef, useState, useCallback } from 'react'
import { IconUpload, IconLoader2 } from '@tabler/icons-react'

// Drag-and-drop (or click-to-browse) upload zone. Each image is POSTed as raw bytes to
// /api/upload/:slug with its name in the x-filename header — one request per file, no parser.
// On success the dev server's watcher fires content:changed and the manifest refetches, so the
// grid refreshes on its own; we also surface a brief per-batch status line.
export default function UploadZone({ slug }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null)

  const uploadOne = useCallback(
    async (file) => {
      const res = await fetch(`/api/upload/${slug}`, {
        method: 'POST',
        headers: {
          'x-filename': file.name,
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      })
      if (!res.ok) throw new Error(`${file.name}: ${res.status}`)
      return res.json()
    },
    [slug],
  )

  const handleFiles = useCallback(
    async (fileList) => {
      const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'))
      if (files.length === 0) return
      setBusy(true)
      setStatus(null)
      const results = await Promise.allSettled(files.map(uploadOne))
      const ok = results.filter((r) => r.status === 'fulfilled').length
      const failed = results.length - ok
      setBusy(false)
      setStatus(
        failed === 0
          ? `Uploaded ${ok} ${ok === 1 ? 'photo' : 'photos'}`
          : `Uploaded ${ok}, ${failed} failed`,
      )
    },
    [uploadOne],
  )

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div
      className={`upload-zone${dragging ? ' dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
      {busy ? <IconLoader2 size={16} className="spin" /> : <IconUpload size={16} />}
      <span>
        {busy
          ? 'Uploading…'
          : status || (
              <>
                Drag photos here or click to upload&nbsp;·&nbsp; saves straight into{' '}
                <code>{slug}/original/</code>
              </>
            )}
      </span>
    </div>
  )
}
