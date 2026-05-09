import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@rental-trust/database';
import { ApplicationStatusBadge } from '@/components/ui/Badge';

export default async function LandlordDashboardPage() {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  const landlordId = session.user.userId;

  // Query 1: Property count
  const propertyCount = await db.property.count({
    where: { landlordId },
  });

  // Query 2: Pending application count
  const pendingCount = await db.application.count({
    where: {
      property: { landlordId },
      status: 'PENDING',
    },
  });

  // Query 3: Recent applications (last 5)
  const recentApplications = await db.application.findMany({
    where: { property: { landlordId } },
    orderBy: { submittedAt: 'desc' },
    take: 5,
    include: {
      tenant: { select: { name: true, email: true } },
      property: { select: { address: true } },
    },
  });

  const dateFormatter = new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' });

  return (
    <main className="flex-1 p-8 bg-bg-1">
      {/* Page heading */}
      <h1 className="mb-8 text-2xl font-semibold text-fg-1">Dashboard</h1>

      {/* Summary stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-6">
        {/* Properties card */}
        <div className="rounded-lg bg-surface-1 p-6 shadow-sm border border-border-1">
          <h2 className="text-sm font-medium text-fg-3 mb-2">Properties</h2>
          <p className="text-4xl font-semibold text-fg-1">{propertyCount}</p>
        </div>

        {/* Pending applications card */}
        <div className="rounded-lg bg-surface-1 p-6 shadow-sm border border-border-1">
          <h2 className="text-sm font-medium text-fg-3 mb-2">Pending Applications</h2>
          <p className="text-4xl font-semibold text-fg-1">{pendingCount}</p>
        </div>
      </div>

      {/* Recent applications section */}
      <div className="rounded-lg bg-surface-1 p-6 shadow-sm border border-border-1">
        <h2 className="mb-4 text-lg font-semibold text-fg-1">Recent Applications</h2>

        {recentApplications.length === 0 ? (
          <p className="text-fg-3">No applications yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-1">
                  <th className="text-left px-4 py-3 text-sm font-semibold text-fg-2">
                    Tenant
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-fg-2">
                    Property
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-fg-2">
                    Submitted
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-fg-2">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentApplications.map((app) => (
                  <tr
                    key={app.id}
                    className="border-b border-border-1 hover:bg-bg-2 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-fg-1">
                      {app.tenant.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-fg-1">
                      {app.property.address}
                    </td>
                    <td className="px-4 py-3 text-sm text-fg-2">
                      {dateFormatter.format(app.submittedAt)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <ApplicationStatusBadge status={app.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
