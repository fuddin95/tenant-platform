import { redirect } from 'next/navigation';
import { readPendingAuth } from '@/lib/pendingAuth';
import SelectRoleForm from './SelectRoleForm';

export default async function SelectRolePage() {
  const pending = await readPendingAuth();
  if (!pending) redirect('/auth/signin?error=SessionExpired');

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-1 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-2xl text-fg-1">RentalTrust</h1>
        </div>

        <div className="rounded-lg bg-surface-1 border border-border-1 p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-fg-1">How will you use RentalTrust?</h2>
            <p className="mt-1 text-sm text-fg-2">
              Signing in as {pending.name} ({pending.email})
            </p>
          </div>

          <SelectRoleForm />
        </div>
      </div>
    </main>
  );
}
