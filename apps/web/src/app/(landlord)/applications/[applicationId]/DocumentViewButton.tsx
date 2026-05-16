'use client'

import { useState } from 'react'
import { getDocumentViewUrlAction } from '@/lib/actions/viewDocument'

type Props = {
  readonly documentId: string
  readonly grantId: string
  readonly fileName: string
}

export default function DocumentViewButton({ documentId, grantId, fileName }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleView = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getDocumentViewUrlAction(documentId, grantId)
      if ('error' in result) {
        setError(result.error)
      } else {
        window.open(result.url, '_blank', 'noopener,noreferrer')
      }
    } catch {
      setError('Failed to load document. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => { void handleView() }}
        disabled={loading}
        aria-label={`View ${fileName}`}
        className="rounded-md border border-border-1 bg-bg-1 px-3 py-1.5 text-sm font-medium text-fg-1 hover:bg-bg-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'View'}
      </button>
      {error && (
        <p className="mt-1 text-xs text-danger">{error}</p>
      )}
    </div>
  )
}
