import { auth } from '@/auth';
import { db } from '@rental-trust/database';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ApplicationStatusBadge } from '@/components/ui/Badge';

export default async function TenantApplicationsPage() {
  const session = await auth();
  if (!session) redirect('/auth/signin');

  const applications = await db.application.findMany({
    where: { tenantId: session.user.userId },
    orderBy: { submittedAt: 'desc' },
    include: {
      property: {
        select: { address: true, city: true, bedrooms: true, rent: true },
      },
    },
  });

  if (applications.length === 0) {
    return (
      <main className="flex-1 p-8">
        <div className="max-w-4xl">
          <h1 className="mb-2 text-2xl font-semibold text-fg-1">My Applications</h1>
          <p className="mb-8 text-sm text-fg-2">0 applications</p>

          <div className="rounded-lg border border-border-1 bg-surface-1 p-8 text-center">
            <p className="mb-6 text-fg-2">
              You haven&apos;t applied to any properties yet.
            </p>
            <Link
              href="/"
              className="inline-block rounded-md bg-sage px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            >
              Browse properties
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-8">
      <div className="max-w-4xl">
        <h1 className="mb-2 text-2xl font-semibold text-fg-1">My Applications</h1>
        <p className="mb-8 text-sm text-fg-2">
          {applications.length} application{applications.length !== 1 ? 's' : ''}
        </p>

        <div className="space-y-4">
          {applications.map((app) => (
            <div
              key={app.id}
              className="rounded-lg border border-border-1 bg-surface-1 p-4"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                {/* Property info */}
                <div className="flex-1">
                  <h3 className="font-semibold text-fg-1">{app.property.address}</h3>
                  <p className="mt-1 text-sm text-fg-2">{app.property.city}</p>
                  <p className="mt-1 text-xs text-fg-3">
                    {app.property.bedrooms} bed · {new Intl.NumberFormat('en-CA', {
                      style: 'currency',
                      currency: 'CAD',
                    }).format(Number(app.property.rent))}/mo
                  </p>
                </div>

                {/* Submitted date and status */}
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <div className="text-sm text-fg-2">
                    {new Intl.DateTimeFormat('en-CA', {
                      dateStyle: 'medium',
                    }).format(app.submittedAt)}
                  </div>
                  <ApplicationStatusBadge status={app.status} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
