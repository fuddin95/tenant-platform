import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default auth((req: NextRequest & { readonly auth: { readonly user?: { readonly role?: string } } | null }) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  if (pathname.startsWith('/dashboard')) {
    if (!session?.user) {
      return NextResponse.redirect(new URL('/auth/signin', req.url));
    }
    if (session.user.role !== 'LANDLORD') {
      return NextResponse.redirect(new URL('/vault', req.url));
    }
  }

  if (pathname.startsWith('/vault')) {
    if (!session?.user) {
      return NextResponse.redirect(new URL('/auth/signin', req.url));
    }
    if (session.user.role !== 'TENANT') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/dashboard/:path*', '/vault/:path*'],
};
