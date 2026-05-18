import { headers } from 'next/headers'
import { validateShareToken } from './validateToken'
import type { FactCategory } from '@rental-trust/database'

const FACT_LABELS: Record<FactCategory, string> = {
  IDENTITY:       'Identity',
  INCOME:         'Income & Employment',
  RENTAL_HISTORY: 'Rental History',
  REFERENCES:     'References',
  CREDIT:         'Credit',
}

type Props = {
  readonly params: Promise<{ readonly token: string }>
}

export default async function ShareLinkPage({ params }: Props) {
  const { token } = await params
  const headersList = headers()
  const ip = headersList.get('x-forwarded-for') ?? 'unknown'

  const result = await validateShareToken(token, ip)

  // not_found and revoked render identically — prevents oracle attacks
  if (result.status === 'not_found' || result.status === 'revoked') {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Link not available</h1>
          <p className="mt-2 text-gray-600">
            This share link is not available. It may have been revoked or may never have existed.
          </p>
        </div>
      </main>
    )
  }

  if (result.status === 'expired') {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Link expired</h1>
          <p className="mt-2 text-gray-600">This share link has expired.</p>
        </div>
      </main>
    )
  }

  const { shareLink } = result

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-md w-full">
        <h1 className="text-2xl font-semibold text-gray-900">Shared Profile</h1>
        <p className="mt-1 text-gray-600">Shared with {shareLink.recipientName}</p>

        <dl className="mt-6 space-y-3">
          <div>
            <dt className="text-sm font-medium text-gray-500">Shared information</dt>
            <dd className="mt-1 flex flex-wrap gap-2">
              {shareLink.allowedFacts.map(fact => (
                <span
                  key={fact}
                  className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700"
                >
                  {FACT_LABELS[fact]}
                </span>
              ))}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Access expires</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {shareLink.expiresAt.toLocaleDateString('en-CA', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </dd>
          </div>
        </dl>

        <p className="mt-8 text-sm text-gray-400">Document viewer coming in Epic 7.</p>
      </div>
    </main>
  )
}
