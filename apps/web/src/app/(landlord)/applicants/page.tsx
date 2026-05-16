import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@rental-trust/database';
import { ApplicationStatusBadge } from '@/components/ui/Badge';

export default async function ApplicantsPage() {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  const landlordId = session.user.userId;

  const applications = await db.application.findMany({
    where: { property: { landlordId } },
    orderBy: { submittedAt: 'desc' },
    include: {
      tenant: { select: { name: true, email: true } },
      property: { select: { address: true, city: true } },
    },
  });

  const dateFormatter = new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' });

  return (
    <main className="flex-1 p-8 bg-bg-1">
      {/* Page heading */}
      <h1 className="mb-2 text-2xl font-semibold text-fg-1">Applicants</h1>

      {/* Subheading with count */}
      <p className="mb-8 text-fg-3">
        {applications.length} total application{applications.length !== 1 ? 's' : ''}
      </p>

      {/* Applications section */}
      {applications.length === 0 ? (
        <div className="flex items-center justify-center rounded-lg bg-surface-1 p-12 border border-border-1">
          <p className="text-fg-3">No applications yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border-1">
          <table className="w-full">
            <thead>
              <tr className="bg-bg-2">
                <th className="text-left px-6 py-4 text-sm font-semibold text-fg-1">
                  Tenant
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-fg-1">
                  Property
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-fg-1">
                  Submitted
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-fg-1">
                  Status
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-fg-1">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app, index) => (
                <tr
                  key={app.id}
                  className={`border-b border-border-1 hover:bg-bg-2 transition-colors ${
                    index === applications.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-fg-1">{app.tenant.name}</p>
                    <p className="text-sm text-fg-3">{app.tenant.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-fg-1">{app.property.address}</p>
                    <p className="text-sm text-fg-3">{app.property.city}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-fg-2">
                    {dateFormatter.format(app.submittedAt)}
                  </td>
                  <td className="px-6 py-4">
                    <ApplicationStatusBadge status={app.status} />
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/applications/${app.id}`}
                      className="text-sm text-sage hover:underline"
                    >
                      View docs →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
