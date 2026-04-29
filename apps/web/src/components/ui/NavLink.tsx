'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavLinkProps {
  readonly href: string;
  readonly label: string;
}

const NavLink = ({ href, label }: NavLinkProps) => {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={[
        'text-sm transition-colors',
        isActive ? 'font-medium text-sage' : 'text-fg-2 hover:text-fg-1',
      ].join(' ')}
    >
      {label}
    </Link>
  );
};

export default NavLink;
