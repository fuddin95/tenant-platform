import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      userId: string;
      email: string;
      role: 'LANDLORD' | 'TENANT';
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    role: 'LANDLORD' | 'TENANT';
  }
}
