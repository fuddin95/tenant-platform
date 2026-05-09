import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { db } from '@rental-trust/database';
import type { Landlord, Tenant } from '@rental-trust/database';

const CredentialsSchema = z.object({
  email: z.string().email(),
  role: z.enum(['LANDLORD', 'TENANT']),
});

type AuthUser = { readonly id: string; readonly email: string; readonly role: 'LANDLORD' | 'TENANT' };

const fromLandlord = (l: Landlord): AuthUser => ({
  id: l.id,
  email: l.email,
  role: 'LANDLORD',
});

const fromTenant = (t: Tenant): AuthUser => ({
  id: t.id,
  email: t.email,
  role: 'TENANT',
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  // AUTH_URL is required in prod; in dev we trust all hosts so localhost works without extra env setup
  trustHost: true,
  providers: [
    Credentials({
      async authorize(raw): Promise<AuthUser | null> {
        const parsed = CredentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, role } = parsed.data;

        try {
          if (role === 'LANDLORD') {
            const landlord = await db.landlord.findUnique({ where: { email } });
            if (!landlord) return null;
            // TODO: [TEN-37] verify passwordHash here once field is added in migration
            return fromLandlord(landlord);
          }

          const tenant = await db.tenant.findUnique({ where: { email } });
          if (!tenant) return null;
          // TODO: [TEN-37] verify passwordHash here once field is added in migration
          return fromTenant(tenant);
        } catch {
          return null;
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const authUser = user as AuthUser;
        return { ...token, userId: authUser.id, role: authUser.role };
      }
      return token;
    },
    session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          userId: token.userId,
          role: token.role,
        },
      };
    },
    redirect({ url, baseUrl }) {
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
  },
  pages: { signIn: '/auth/signin' },
});
