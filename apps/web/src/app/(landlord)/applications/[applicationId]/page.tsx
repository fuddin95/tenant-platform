import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { db } from '@rental-trust/database'
import DocumentViewButton from './DocumentViewButton'

const DOC_LABELS: Record<string, string> = {
  GOVERNMENT_ID: 'Government ID',
  PROOF_OF_INCOME: 'Proof of Income',
  PAY_STUB: 'Pay Stub',
  EMPLOYMENT_LETTER: 'Employment Letter',
  REFERENCE_CONTACT: 'Reference Contact',
  CREDIT_REPORT: 'Credit Report',
}

function grantStatus(grant: { readonly revokedAt: Date | null; readonly expiresAt: Date }): 'ACTIVE' | 'REVOKED' | 'EXPIRED' {
  if (grant.revokedAt) return 'REVOKED'
  if (grant.expiresAt <= new Date()) return 'EXPIRED'
  return 'ACTIVE'
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-sage/10 text-sage',
  REVOKED: 'bg-danger-bg text-danger',
  EXPIRED: 'bg-bg-2 text-fg-3',
}

type Props = {
  readonly params: Promise<{ readonly applicationId: string }>
}

export default async function ApplicationDocumentsPage({ params }: Props) {
  const { applicationId } = await params

  const session = await auth()
  if (!session) redirect('/auth/signin')
  if (session.user.role !== 'LANDLORD') redirect('/auth/signin')

  const landlordId = session.user.userId
  if (!landlordId) redirect('/auth/signin')

  const application = await db.application.findUnique({
    where: { id: applicationId },
    include: {
      tenant: {
        include: {
          profile: {
            include: { documents: { orderBy: { uploadedAt: 'desc' } } },
          },
        },
      },
      property: true,
      accessGrants: { orderBy: { grantedAt: 'desc' }, take: 1 },
    },
  })

  if (!application || application.property.landlordId !== landlordId) {
    redirect('/applicants')
  }

  const grant = application.accessGrants[0] ?? null
  const status = grant ? grantStatus(grant) : null
  const documents = application.tenant.profile?.documents ?? []

  const dateFormatter = new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' })

  return (
    <main className="flex-1 p-8 bg-bg-1">
      {/* Back link */}
      <a href="/applicants" className="mb-6 inline-flex items-center gap-1 text-sm text-fg-3 hover:text-fg-1">
        ← Back to applicants
      </a>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-fg-1">{application.tenant.name}</h1>
        <p className="mt-1 text-sm text-fg-2">{application.tenant.email}</p>
        <p className="mt-1 text-sm text-fg-3">
          Applied for {application.property.address}, {application.property.city}
        </p>
      </div>

      {/* Grant status */}
      {grant ? (
        <div className="mb-8 rounded-lg border border-border-1 bg-surface-1 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-fg-1">Access Grant</h2>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status!]}`}>
              {status}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-fg-3">Granted</p>
              <p className="text-fg-1">{dateFormatter.format(grant.grantedAt)}</p>
            </div>
            <div>
              <p className="text-fg-3">Expires</p>
              <p className="text-fg-1">{dateFormatter.format(grant.expiresAt)}</p>
            </div>
          </div>
          {grant.allowedDocs.length > 0 && (
            <div className="mt-3">
              <p className="text-sm text-fg-3">Allowed documents</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {grant.allowedDocs.map((doc) => (
                  <span key={doc} className="rounded-full bg-bg-2 px-2.5 py-0.5 text-xs text-fg-2">
                    {DOC_LABELS[doc] ?? doc}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-8 rounded-lg border border-border-1 bg-surface-1 p-5">
          <p className="text-sm text-fg-2">
            No active access grant for this applicant. The tenant has not granted you access.
          </p>
        </div>
      )}

      {/* Documents */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-fg-1">Documents</h2>
        {documents.length === 0 ? (
          <p className="text-sm text-fg-2">The tenant has not uploaded any documents yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border-1">
            <table className="w-full">
              <thead>
                <tr className="bg-bg-2">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-fg-1">Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-fg-1">File</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-fg-1">Uploaded</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-fg-1">Action</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc, i) => {
                  const isViewable =
                    status === 'ACTIVE' &&
                    grant !== null &&
                    grant.allowedDocs.includes(doc.type)

                  return (
                    <tr
                      key={doc.id}
                      className={`border-b border-border-1 ${i === documents.length - 1 ? 'border-b-0' : ''}`}
                    >
                      <td className="px-6 py-4 text-sm text-fg-1">{DOC_LABELS[doc.type] ?? doc.type}</td>
                      <td className="px-6 py-4 text-sm text-fg-2">{doc.fileName}</td>
                      <td className="px-6 py-4 text-sm text-fg-2">{dateFormatter.format(doc.uploadedAt)}</td>
                      <td className="px-6 py-4">
                        {isViewable ? (
                          <DocumentViewButton
                            documentId={doc.id}
                            grantId={grant.id}
                            fileName={doc.fileName}
                          />
                        ) : (
                          <span className="text-sm text-fg-3">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
