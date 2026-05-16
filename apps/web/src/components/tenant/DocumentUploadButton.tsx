'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { requestUploadAction } from '@/lib/actions/document'

// ── Constants ─────────────────────────────────────────────────────────────────

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  GOVERNMENT_ID: 'Government ID',
  PROOF_OF_INCOME: 'Proof of Income',
  PAY_STUB: 'Pay Stub',
  EMPLOYMENT_LETTER: 'Employment Letter',
  REFERENCE_CONTACT: 'Reference Contact',
  CREDIT_REPORT: 'Credit Report',
}

const DOCUMENT_TYPES: ReadonlyArray<keyof typeof DOCUMENT_TYPE_LABELS> = [
  'GOVERNMENT_ID',
  'PROOF_OF_INCOME',
  'PAY_STUB',
  'EMPLOYMENT_LETTER',
  'REFERENCE_CONTACT',
  'CREDIT_REPORT',
]

type DocumentType =
  | 'GOVERNMENT_ID'
  | 'PROOF_OF_INCOME'
  | 'PAY_STUB'
  | 'EMPLOYMENT_LETTER'
  | 'REFERENCE_CONTACT'
  | 'CREDIT_REPORT'

// ── Component ─────────────────────────────────────────────────────────────────

export default function DocumentUploadButton() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<DocumentType>('GOVERNMENT_ID')
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleOpenForm = () => {
    setIsOpen(true)
    setError(null)
    setSuccess(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      setError('Please select a file.')
      return
    }

    setIsUploading(true)

    try {
      // 1. Call server action to get a pre-signed upload URL
      const result = await requestUploadAction({
        type: selectedType,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      })

      if ('error' in result) {
        setError(result.error)
        setIsUploading(false)
        return
      }

      // 2. PUT the file directly to S3 using the pre-signed URL
      const uploadResponse = await fetch(result.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })

      if (!uploadResponse.ok) {
        setError('Upload to storage failed. Please try again.')
        setIsUploading(false)
        return
      }

      // 3. Success — refresh and reset form
      setSuccess(true)
      setIsOpen(false)
      setIsUploading(false)
      if (fileInputRef.current) {
        // eslint-disable-next-line functional/immutable-data
        fileInputRef.current.value = ''
      }
      router.refresh()
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setIsUploading(false)
    }
  }

  return (
    <div>
      {!isOpen && (
        <button
          type="button"
          onClick={handleOpenForm}
          className="rounded-md bg-sage px-4 py-2 text-sm font-medium text-white hover:bg-sage/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 disabled:opacity-50"
        >
          Upload Document
        </button>
      )}

      {success && !isOpen && (
        <p className="mt-2 text-sm text-sage">Document uploaded successfully.</p>
      )}

      {isOpen && (
        <form
          onSubmit={(e) => { void handleSubmit(e) }}
          className="rounded-md border border-border-1 bg-surface-1 p-4"
        >
          <div className="mb-4">
            <label
              htmlFor="doc-type-select"
              className="mb-1 block text-sm font-medium text-fg-1"
            >
              Document Type
            </label>
            <select
              id="doc-type-select"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as DocumentType)}
              disabled={isUploading}
              className="w-full rounded-md border border-border-1 bg-bg-1 px-3 py-2 text-sm text-fg-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage disabled:opacity-50"
            >
              {DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {DOCUMENT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label
              htmlFor="doc-file-input"
              className="mb-1 block text-sm font-medium text-fg-1"
            >
              File
            </label>
            <input
              id="doc-file-input"
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"
              disabled={isUploading}
              className="w-full text-sm text-fg-2 file:mr-3 file:rounded-md file:border-0 file:bg-bg-2 file:px-3 file:py-1 file:text-sm file:text-fg-1 hover:file:bg-bg-1 disabled:opacity-50"
            />
          </div>

          {error && (
            <p className="mb-4 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isUploading}
              className="rounded-md bg-sage px-4 py-2 text-sm font-medium text-white hover:bg-sage/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 disabled:opacity-50"
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                setError(null)
              }}
              disabled={isUploading}
              className="rounded-md border border-border-1 bg-bg-1 px-4 py-2 text-sm font-medium text-fg-2 hover:bg-bg-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
