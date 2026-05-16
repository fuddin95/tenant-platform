'use client';

import { selectRole } from '@/lib/actions/selectRole';

export default function SelectRoleForm() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <form action={selectRole.bind(null, 'LANDLORD')}>
        <button
          type="submit"
          className="w-full p-6 border border-border-1 rounded-lg hover:bg-bg-2 transition-colors duration-150 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
        >
          <div className="font-medium text-fg-1">I&apos;m a Landlord</div>
          <div className="text-sm text-fg-2 mt-1">List and manage properties</div>
        </button>
      </form>
      <form action={selectRole.bind(null, 'TENANT')}>
        <button
          type="submit"
          className="w-full p-6 border border-border-1 rounded-lg hover:bg-bg-2 transition-colors duration-150 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
        >
          <div className="font-medium text-fg-1">I&apos;m a Tenant</div>
          <div className="text-sm text-fg-2 mt-1">Apply for rentals</div>
        </button>
      </form>
    </div>
  );
}
