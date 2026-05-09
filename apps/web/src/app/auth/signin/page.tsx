'use client';

import { useState, FormEvent } from 'react';
import TextInput from '@/components/ui/TextInput';
import Button from '@/components/ui/Button';
import { signInAction } from '@/lib/actions/signin';

type Role = 'LANDLORD' | 'TENANT';

const SignInPage = () => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('LANDLORD');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    void signInAction({ email, role }).then(
      () => {
        // signInAction will redirect on success, so we shouldn't reach here
      },
      (err: unknown) => {
        // Catch non-redirect errors (e.g., network, validation)
        const message = err instanceof Error ? err.message : 'Sign in failed. Please try again.';
        setError(message);
        setIsLoading(false);
      },
    );
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-1 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-2xl text-fg-1">RentalTrust</h1>
        </div>

        <div className="rounded-lg bg-surface-1 border border-border-1 p-6">
          <h2 className="text-lg font-semibold text-fg-1 mb-6">Sign in</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-danger-bg p-3 text-sm text-danger" role="alert">
                {error}
              </div>
            )}

            <TextInput
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={isLoading}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-fg-1">Account type</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="LANDLORD"
                    checked={role === 'LANDLORD'}
                    onChange={() => setRole('LANDLORD')}
                    disabled={isLoading}
                    className="w-4 h-4 accent-sage"
                  />
                  <span className="text-sm text-fg-1">I&apos;m a Landlord</span>
                </label>
                <label className="flex items-center gap-2 flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="TENANT"
                    checked={role === 'TENANT'}
                    onChange={() => setRole('TENANT')}
                    disabled={isLoading}
                    className="w-4 h-4 accent-sage"
                  />
                  <span className="text-sm text-fg-1">I&apos;m a Tenant</span>
                </label>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isLoading}
              disabled={isLoading}
              className="w-full"
            >
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
};

export default SignInPage;
