import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    readonly user: {
      readonly userId?: string;
      readonly role?: 'LANDLORD' | 'TENANT';
      readonly email: string;
      readonly name?: string | null;
      readonly image?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    readonly userId?: string;
    readonly role?: 'LANDLORD' | 'TENANT';
  }
}
