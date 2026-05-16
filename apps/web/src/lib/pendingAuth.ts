import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const COOKIE_NAME = '__rt_pending';
const MAX_AGE = 900; // 15 minutes

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET not set');
  return new TextEncoder().encode(secret);
}

export type PendingAuthPayload = {
  readonly email: string;
  readonly name: string;
};

export async function setPendingAuth(payload: PendingAuthPayload): Promise<void> {
  const token = await new SignJWT({ email: payload.email, name: payload.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('15m')
    .sign(getSecret());

  const store = cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    // lax (not strict) — Google redirect is cross-site so strict breaks the flow
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE,
    path: '/',
  });
}

/** Peek at the pending cookie without deleting it. Used by the page to render. */
export async function readPendingAuth(): Promise<PendingAuthPayload | null> {
  const store = cookies();
  const cookie = store.get(COOKIE_NAME);
  if (!cookie) return null;

  try {
    const { payload } = await jwtVerify(cookie.value, getSecret());
    return { email: payload.email as string, name: payload.name as string };
  } catch {
    return null;
  }
}

/** Read the pending cookie AND delete it. Used by the Server Action. */
export async function consumePendingAuth(): Promise<PendingAuthPayload | null> {
  const store = cookies();
  const cookie = store.get(COOKIE_NAME);
  if (!cookie) return null;

  try {
    const { payload } = await jwtVerify(cookie.value, getSecret());
    store.delete(COOKIE_NAME);
    return { email: payload.email as string, name: payload.name as string };
  } catch {
    return null;
  }
}
