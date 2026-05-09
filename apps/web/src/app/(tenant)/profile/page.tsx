import { auth } from '@/auth';
import { db } from '@rental-trust/database';
import { redirect } from 'next/navigation';
import ProfileForm from '@/components/tenant/ProfileForm';

const DOC_LABELS: Record<string, string> = {
  GOVERNMENT_ID: 'Government ID',
  PROOF_OF_INCOME: 'Proof of Income',
  PAY_STUB: 'Pay Stub',
  EMPLOYMENT_LETTER: 'Employment Letter',
  REFERENCE_CONTACT: 'Reference Contact',
  CREDIT_REPORT: 'Credit Report',
};

async function TenantProfilePage() {
  const session = await auth();
  if (!session) redirect('/auth/signin');

  const profile = await db.profile.findUnique({
    where: { tenantId: session.user.userId },
    include: { documents: true, references: true },
  });

  const renderEmptyState = () => (
    <div className="rounded-md border border-border-1 bg-bg-2 p-6 text-center">
      <p className="text-fg-2">
        Your profile is empty. Documents you upload will appear here.
      </p>
    </div>
  );

  if (!profile) {
    return (
      <main className="flex-1 p-8">
        <div className="max-w-4xl">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-fg-1">My Profile</h1>
            <p className="mt-1 text-sm text-fg-2">{session.user.email}</p>
          </div>
          {renderEmptyState()}
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-8">
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-fg-1">My Profile</h1>
          <p className="mt-1 text-sm text-fg-2">{session.user.email}</p>
        </div>

        {/* Completion bar */}
        <div className="mb-8 rounded-md border border-border-1 bg-surface-1 p-6">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-fg-1">
              Profile {profile.completionPercent}% complete
            </label>
            <span className="text-sm text-fg-2">{profile.completionPercent}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-bg-2">
            <div
              className="h-full rounded-full bg-sage transition-all duration-300"
              style={{ width: `${profile.completionPercent}%` }}
            />
          </div>
        </div>

        {/* Documents section */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-fg-1">Documents</h2>
          {profile.documents.length === 0 ? (
            <p className="text-sm text-fg-2">No documents uploaded yet.</p>
          ) : (
            <div className="overflow-hidden rounded-md border border-border-1">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-1 bg-bg-2">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-fg-1">
                      Document Type
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-fg-1">
                      File Name
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-fg-1">
                      Upload Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {profile.documents.map((doc) => (
                    <tr
                      key={doc.id}
                      className="border-b border-border-1 hover:bg-bg-2"
                    >
                      <td className="px-6 py-4 text-sm text-fg-1">
                        {DOC_LABELS[doc.type] || doc.type}
                      </td>
                      <td className="px-6 py-4 text-sm text-fg-1">
                        {doc.fileName}
                      </td>
                      <td className="px-6 py-4 text-sm text-fg-2">
                        {new Intl.DateTimeFormat('en-CA', {
                          dateStyle: 'medium',
                        }).format(doc.uploadedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* References section */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-fg-1">References</h2>
          {profile.references.length === 0 ? (
            <p className="mb-6 text-sm text-fg-2">No references added yet.</p>
          ) : (
            <div className="mb-6 overflow-hidden rounded-md border border-border-1">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-1 bg-bg-2">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-fg-1">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-fg-1">
                      Relationship
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-fg-1">
                      Email / Phone
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {profile.references.map((ref) => (
                    <tr
                      key={ref.id}
                      className="border-b border-border-1 hover:bg-bg-2"
                    >
                      <td className="px-6 py-4 text-sm text-fg-1">
                        {ref.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-fg-1">
                        {ref.relationship}
                      </td>
                      <td className="px-6 py-4 text-sm text-fg-2">
                        {ref.email && ref.phone
                          ? `${ref.email} / ${ref.phone}`
                          : ref.email || ref.phone || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add reference form */}
          <div className="rounded-md border border-border-1 bg-surface-1 p-6">
            <h3 className="mb-4 text-sm font-semibold text-fg-1">
              Add a Reference
            </h3>
            <ProfileForm profileId={profile.id} />
          </div>
        </div>
      </div>
    </main>
  );
}

export default TenantProfilePage;
