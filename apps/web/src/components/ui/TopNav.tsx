import Link from 'next/link';
import { auth } from '@/auth';
import { signOutAction } from '@/lib/actions/auth';
import NavLink from '@/components/ui/NavLink';
import SignOutButton from '@/components/ui/SignOutButton';

const LANDLORD_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/properties', label: 'Properties' },
  { href: '/applicants', label: 'Applicants' },
] as const;

const TENANT_LINKS = [
  { href: '/profile', label: 'My Profile' },
  { href: '/applications', label: 'Applications' },
] as const;

const TopNav = async () => {
  const session = await auth();

  return (
    <header className="w-full bg-surface-1 border-b border-border-1 shadow-sm">
      <div className="flex items-center justify-between px-6 py-3">
        <Link href="/" className="font-serif text-lg text-fg-1 hover:text-fg-2 transition-colors">
          RentalTrust
        </Link>

        <nav className="flex items-center gap-6">
          {session?.user?.role === 'LANDLORD' &&
            LANDLORD_LINKS.map((link) => (
              <NavLink key={link.href} href={link.href} label={link.label} />
            ))}

          {session?.user?.role === 'TENANT' &&
            TENANT_LINKS.map((link) => (
              <NavLink key={link.href} href={link.href} label={link.label} />
            ))}

          {!session && (
            <Link
              href="/auth/signin"
              className="text-sm text-fg-2 hover:text-fg-1 transition-colors"
            >
              Sign in
            </Link>
          )}
        </nav>

        {session?.user && (
          <div className="flex items-center gap-4">
            <span
              className="max-w-[180px] truncate text-caption text-fg-2"
              title={session.user.email}
            >
              {session.user.email}
            </span>
            <SignOutButton action={signOutAction} />
          </div>
        )}
      </div>
    </header>
  );
};

export default TopNav;
