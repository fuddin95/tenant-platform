import NavLink from '@/components/ui/NavLink';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/properties', label: 'Properties' },
  { href: '/applicants', label: 'Applicants' },
] as const;

const Sidebar = () => (
  <aside className="w-64 border-r border-border-1 bg-surface-1">
    <nav className="flex flex-col gap-4 p-6">
      {NAV_LINKS.map((link) => (
        <NavLink key={link.href} href={link.href} label={link.label} />
      ))}
    </nav>
  </aside>
);

export default Sidebar;
