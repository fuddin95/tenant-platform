'use client'

import { useEffect, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { AccessGrantBadge } from '@/components/ui/Badge'
import { createGrantAction, revokeGrantAction } from '@/lib/actions/grant'

// ── Types ─────────────────────────────────────────────────────────────────────

export type GrantData = {
  readonly id: string
  readonly grantedAt: string
  readonly expiresAt: string
  readonly revokedAt: string | null
  readonly allowedDocs: readonly string[]
}

export type ApplicationData = {
  readonly id: string
  readonly property: { readonly address: string; readonly city: string }
  readonly grants: readonly GrantData[]
}

type Props = {
  readonly applications: readonly ApplicationData[]
  readonly uploadedDocTypes: readonly string[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DOC_LABELS: Record<string, string> = {
  GOVERNMENT_ID: 'Government ID',
  PROOF_OF_INCOME: 'Proof of Income',
  PAY_STUB: 'Pay Stub',
  EMPLOYMENT_LETTER: 'Employment Letter',
  REFERENCE_CONTACT: 'Reference Contact',
  CREDIT_REPORT: 'Credit Report',
}

const DATE_FMT = new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' })

// ── Helpers ───────────────────────────────────────────────────────────────────

function grantStatus(g: GrantData): 'ACTIVE' | 'EXPIRED' | 'REVOKED' {
  if (g.revokedAt !== null) return 'REVOKED'
  if (new Date(g.expiresAt) <= new Date()) return 'EXPIRED'
  return 'ACTIVE'
}

function tomorrowStr(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SubmitButton({ label, pendingLabel }: { readonly label: string; readonly pendingLabel: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-sage px-4 py-2 text-sm font-medium text-white hover:bg-sage/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 disabled:opacity-50"
    >
      {pending ? pendingLabel : label}
    </button>
  )
}

function RevokeButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-xs text-danger hover:underline disabled:opacity-50"
    >
      {pending ? 'Revoking...' : 'Revoke'}
    </button>
  )
}

// ── Create grant form ─────────────────────────────────────────────────────────

function CreateGrantForm({
  applicationId,
  uploadedDocTypes,
  onSuccess,
}: {
  readonly applicationId: string
  readonly uploadedDocTypes: readonly string[]
  readonly onSuccess: () => void
}) {
  const [state, formAction] = useFormState(createGrantAction, null)

  useEffect(() => {
    if (state && 'success' in state) onSuccess()
  }, [state, onSuccess])

  return (
    <form action={formAction} className="mt-3 space-y-4 glass-sm p-4">
      <input type="hidden" name="applicationId" value={applicationId} />

      {state && 'error' in state && (
        <p className="text-sm text-danger" role="alert">{state.error}</p>
      )}

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-fg-1">Documents to share</legend>
        {uploadedDocTypes.length === 0 ? (
          <p className="text-sm text-fg-2">Upload documents to your vault first.</p>
        ) : (
          <div className="space-y-2">
            {uploadedDocTypes.map((type) => (
              <label key={type} className="flex items-center gap-2 text-sm text-fg-1">
                <input
                  type="checkbox"
                  name="allowedDocs"
                  value={type}
                  className="rounded border-border-1 text-sage focus:ring-sage"
                />
                {DOC_LABELS[type] ?? type}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <div>
        <label htmlFor={`expiry-${applicationId}`} className="mb-1 block text-sm font-medium text-fg-1">
          Access expires on <span className="text-danger">*</span>
        </label>
        <input
          id={`expiry-${applicationId}`}
          type="date"
          name="expiresAt"
          min={tomorrowStr()}
          required
          defaultValue={tomorrowStr()}
          className="rounded-md border border-border-1 bg-bg-1 px-3 py-2 text-sm text-fg-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
        />
        <p className="mt-1 text-xs text-fg-3">Required — access cannot be open-ended.</p>
      </div>

      <SubmitButton label="Grant access" pendingLabel="Granting..." />
    </form>
  )
}

// ── Grant row ─────────────────────────────────────────────────────────────────

function GrantRow({ grant, showRevoke = true }: { readonly grant: GrantData; readonly showRevoke?: boolean }) {
  const status = grantStatus(grant)
  const [revokeState, revokeAction] = useFormState(revokeGrantAction, null)

  return (
    <div className="flex items-start justify-between gap-4 glass-sm px-3 py-2">
      <div className="min-w-0">
        <div className="flex flex-wrap gap-1">
          {grant.allowedDocs.map((doc) => (
            <span key={doc} className="rounded-full bg-bg-2 px-2 py-0.5 text-xs text-fg-2">
              {DOC_LABELS[doc] ?? doc}
            </span>
          ))}
        </div>
        <p className="mt-1 text-xs text-fg-3">
          Expires {DATE_FMT.format(new Date(grant.expiresAt))}
          {grant.revokedAt && ` · Revoked ${DATE_FMT.format(new Date(grant.revokedAt))}`}
        </p>
        {revokeState && 'error' in revokeState && (
          <p className="mt-1 text-xs text-danger">{revokeState.error}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <AccessGrantBadge status={status} />
        {showRevoke && status === 'ACTIVE' && (
          <form action={revokeAction}>
            <input type="hidden" name="grantId" value={grant.id} />
            <RevokeButton />
          </form>
        )}
      </div>
    </div>
  )
}

// ── Per-application card ──────────────────────────────────────────────────────

function ApplicationGrantCard({
  application,
  uploadedDocTypes,
}: {
  readonly application: ApplicationData
  readonly uploadedDocTypes: readonly string[]
}) {
  const [showForm, setShowForm] = useState(false)

  const active = application.grants.filter((g) => grantStatus(g) === 'ACTIVE')
  const past = application.grants.filter((g) => grantStatus(g) !== 'ACTIVE')

  return (
    <div className="glass p-4 refract">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-fg-1">{application.property.address}</p>
          <p className="text-sm text-fg-2">{application.property.city}</p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="shrink-0 rounded-md border border-border-1 bg-bg-1 px-3 py-1.5 text-sm font-medium text-fg-1 hover:bg-bg-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
          >
            Share documents
          </button>
        )}
      </div>

      {showForm && (
        <>
          <CreateGrantForm
            applicationId={application.id}
            uploadedDocTypes={uploadedDocTypes}
            onSuccess={() => setShowForm(false)}
          />
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="mt-2 text-xs text-fg-2 hover:underline"
          >
            Cancel
          </button>
        </>
      )}

      {active.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-3">Active access</p>
          <div className="space-y-2">
            {active.map((g) => (
              <GrantRow key={g.id} grant={g} />
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-3">History</p>
          <div className="space-y-2">
            {past.map((g) => (
              <GrantRow key={g.id} grant={g} showRevoke={false} />
            ))}
          </div>
        </div>
      )}

      {application.grants.length === 0 && !showForm && (
        <p className="mt-3 text-sm text-fg-2">No access grants yet.</p>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function GrantManager({ applications, uploadedDocTypes }: Props) {
  if (applications.length === 0) {
    return (
      <p className="text-sm text-fg-2">
        You haven&apos;t applied to any properties yet.{' '}
        <a href="/" className="text-sage underline underline-offset-2">Browse properties</a>
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {applications.map((app) => (
        <ApplicationGrantCard
          key={app.id}
          application={app}
          uploadedDocTypes={uploadedDocTypes}
        />
      ))}
    </div>
  )
}
