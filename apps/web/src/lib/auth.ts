import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { db } from '@rental-trust/database';

const CredentialsSchema = z.object({
  email: z.string().email(),
  role: z.enum(['LANDLORD', 'TENANT']),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      async authorize(raw) {
        const parsed = CredentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, role } = parsed.data;
        try {
          if (role === 'LANDLORD') {
            const landlord = await db.landlord.findUnique({ where: { email } });
            if (!landlord) return null;
            // TODO: [TEN-37] verify passwordHash here
            return { id: landlord.id, email: landlord.email, role: 'LANDLORD' as const };
          }
          const tenant = await db.tenant.findUnique({ where: { email } });
          if (!tenant) return null;
          // TODO: [TEN-37] verify passwordHash here
          return { id: tenant.id, email: tenant.email, role: 'TENANT' as const };
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
        token['userId'] = user.id;
        token['role'] = (user as { role: 'LANDLORD' | 'TENANT' }).role;
      }
      return token;
    },
    session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          userId: token['userId'] as string,
          role: token['role'] as 'LANDLORD' | 'TENANT',
        },
      };
    },
    redirect({ url, baseUrl }) {
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
  },
  pages: { signIn: '/auth/signin' },
});
