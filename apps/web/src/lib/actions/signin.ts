'use server';

import { signIn } from '@/auth';
import { z } from 'zod';

const SignInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['LANDLORD', 'TENANT']),
});

type SignInInput = z.infer<typeof SignInSchema>;

export async function signInAction(input: SignInInput): Promise<{ readonly error: string } | void> {
  const parsed = SignInSchema.safeParse(input);

  if (!parsed.success) {
    return { error: 'Invalid input' };
  }

  const { email, role } = parsed.data;
  const redirectTo = role === 'LANDLORD' ? '/dashboard' : '/profile';

  // This call will throw a NEXT_REDIRECT error, which is expected and correct.
  // We don't catch it—let it propagate to trigger the redirect.
  await signIn('credentials', { email, role, redirectTo });
}
