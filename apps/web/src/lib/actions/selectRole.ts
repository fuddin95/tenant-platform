'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { signIn } from '@/lib/auth';
import { db } from '@rental-trust/database';
import { consumePendingAuth } from '@/lib/pendingAuth';

const RoleSchema = z.enum(['LANDLORD', 'TENANT']);

export async function selectRole(role: 'LANDLORD' | 'TENANT'): Promise<never> {
  const parsed = RoleSchema.safeParse(role);
  if (!parsed.success) redirect('/auth/signin?error=InvalidRole');

  const pending = await consumePendingAuth();
  if (!pending) redirect('/auth/signin?error=SessionExpired');

  const { email, name } = pending;

  try {
    if (parsed.data === 'LANDLORD') {
      await db.landlord.upsert({
        where: { email },
        create: { email, name, passwordHash: null, role: 'INDEPENDENT_LANDLORD' },
        update: {},
      });
    } else {
      const tenant = await db.tenant.upsert({
        where: { email },
        create: { email, name, passwordHash: null },
        update: {},
      });
      await db.profile.upsert({
        where: { tenantId: tenant.id },
        create: { tenantId: tenant.id },
        update: {},
      });
    }
  } catch {
    // Never expose raw DB errors to client
    redirect('/auth/signin?error=SetupFailed');
  }

  // Re-initiate Google OAuth — the signIn callback will now find the user and return true
  await signIn('google', {
    redirectTo: parsed.data === 'LANDLORD' ? '/dashboard' : '/profile',
  });

  // signIn always redirects; this satisfies TypeScript's never return type
  redirect('/auth/signin');
}
