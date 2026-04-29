'use client';

interface SignOutButtonProps {
  readonly action: () => Promise<void>;
}

const SignOutButton = ({ action }: SignOutButtonProps) => (
  <form action={action}>
    <button
      type="submit"
      className="text-sm text-fg-2 hover:text-fg-1 transition-colors"
    >
      Sign out
    </button>
  </form>
);

export default SignOutButton;
