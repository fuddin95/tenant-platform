import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

const HomePage = async () => {
  const session = await auth();

  if (session?.user?.role === 'LANDLORD') redirect('/dashboard');
  if (session?.user?.role === 'TENANT') redirect('/profile');

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-1 px-4">
      <div className="text-center">
        <h1 className="font-serif text-4xl text-fg-1 mb-3">RentalTrust</h1>
        <p className="text-fg-3 mb-8">Rental applications — no email chasing.</p>
        <Link
          href="/auth/signin"
          className="inline-block rounded-md bg-sage px-6 py-2.5 text-sm font-medium text-white hover:bg-sage-dark transition-colors"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
};

export default HomePage;

