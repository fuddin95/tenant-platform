import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { db } from '@rental-trust/database';
import { setPendingAuth } from './pendingAuth';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== 'google') return false;

      const email = profile?.email;
      const name = profile?.name ?? 'User';
      if (!email) return false;

      const [landlord, tenant] = await Promise.all([
        db.landlord.findUnique({ where: { email } }),
        db.tenant.findUnique({ where: { email } }),
      ]);

      if (landlord || tenant) return true;

      // New user — stash profile in a short-lived signed cookie, redirect to role selection
      await setPendingAuth({ email, name });
      return '/auth/select-role';
    },

    async jwt({ token, user, account }) {
      // First sign-in after OAuth (account is present on initial callback)
      if (account?.provider === 'google' && user?.email) {
        const email = user.email;
        const [landlord, tenant] = await Promise.all([
          db.landlord.findUnique({ where: { email } }),
          db.tenant.findUnique({ where: { email } }),
        ]);
        if (landlord) {
          return { ...token, userId: landlord.id, role: 'LANDLORD' as const, email: landlord.email };
        } else if (tenant) {
          return { ...token, userId: tenant.id, role: 'TENANT' as const, email: tenant.email };
        }
        // Neither exists yet — selectRole hasn't run; leave token unset
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
  },
  pages: { signIn: '/auth/signin' },
});
