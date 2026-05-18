import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// In-memory sliding-window rate limiter — MVP only.
// For multi-instance production, replace with Redis (e.g. Upstash).
const rateLimitStore = new Map<string, readonly number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX       = 20;     // requests per window per IP

function isRateLimited(ip: string): boolean {
  const now        = Date.now();
  const timestamps = (rateLimitStore.get(ip) ?? []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT_MAX) return true;
  rateLimitStore.set(ip, [...timestamps, now]);
  return false;
}

export default auth((req: NextRequest & { readonly auth: { readonly user?: { readonly role?: string } } | null }) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Public share link route — rate limited, security headers, no auth check
  if (pathname.startsWith('/v/')) {
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
    if (isRateLimited(ip)) {
      return new NextResponse(null, { status: 429 });
    }
    const response = NextResponse.next();
    response.headers.set('Referrer-Policy', 'no-referrer');
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }

  if (pathname.startsWith('/dashboard')) {
    if (!session?.user) {
      return NextResponse.redirect(new URL('/auth/signin', req.url));
    }
    // Only redirect if role is already known — new users land here before lazy hydration runs
    if (session.user.role && session.user.role !== 'LANDLORD') {
      return NextResponse.redirect(new URL('/vault', req.url));
    }
  }

  if (pathname.startsWith('/vault')) {
    if (!session?.user) {
      return NextResponse.redirect(new URL('/auth/signin', req.url));
    }
    if (session.user.role && session.user.role !== 'TENANT') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/dashboard/:path*', '/vault/:path*', '/v/:path*'],
};
