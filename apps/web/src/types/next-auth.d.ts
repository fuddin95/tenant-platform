import 'next-auth';

declare module 'next-auth' {
  interface Session {
    readonly user: {
      readonly userId: string;
      readonly email: string;
      readonly role: 'LANDLORD' | 'TENANT';
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    readonly userId: string;
    readonly role: 'LANDLORD' | 'TENANT';
  }
}
