import Link from 'next/link';
import { auth } from '@/auth';
import { signOutAction } from '@/lib/actions/auth';
import NavLink from '@/components/ui/NavLink';
import SignOutButton from '@/components/ui/SignOutButton';
import ThemeToggle from '@/components/ui/ThemeToggle';

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
    <header className="glass sticky top-0 z-40 w-full" style={{ borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none' }}>
      <div className="flex items-center justify-between px-6 py-3">
        <Link href="/" className="font-serif text-lg text-[var(--fg-1)] hover:text-[var(--fg-2)] transition-colors">
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
              className="text-sm text-[var(--fg-2)] hover:text-[var(--fg-1)] transition-colors"
            >
              Sign in
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          {session?.user && (
            <>
              <span
                className="max-w-[180px] truncate text-caption text-[var(--fg-2)]"
                title={session.user.email}
              >
                {session.user.email}
              </span>
              <SignOutButton action={signOutAction} />
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopNav;
