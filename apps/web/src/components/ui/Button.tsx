import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonOwnProps = {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly loading?: boolean;
  readonly children: React.ReactNode;
};

type ButtonProps = ButtonOwnProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonOwnProps>;

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-sage text-white hover:bg-sage-dark focus-visible:ring-sage',
  secondary:
    'bg-surface-1 text-fg-1 border border-border-1 hover:bg-bg-2 focus-visible:ring-sage',
  ghost:
    'bg-transparent text-sage hover:bg-sage-light focus-visible:ring-sage',
  destructive:
    'bg-danger text-white hover:bg-red-800 focus-visible:ring-danger',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2',
};

const BASE_CLASSES =
  'inline-flex items-center justify-center font-medium rounded-md ' +
  'transition-colors duration-150 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

const Spinner = () => (
  <svg
    aria-hidden="true"
    className="animate-spin h-4 w-4 shrink-0"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      children,
      ...rest
    },
    ref,
  ) => {
    const classes = [
      BASE_CLASSES,
      VARIANT_CLASSES[variant],
      SIZE_CLASSES[size],
    ].join(' ');

    return (
      <button
        ref={ref}
        disabled={disabled ?? loading}
        aria-busy={loading}
        className={classes}
        {...rest}
      >
        {loading && <Spinner />}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

export default Button;
export type { ButtonProps, ButtonVariant, ButtonSize };
