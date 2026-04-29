import React from 'react';

type CheckboxOwnProps = {
  readonly label: string;
  readonly error?: string;
};

type CheckboxProps = CheckboxOwnProps &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, keyof CheckboxOwnProps>;

function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, id, ...rest }, ref) => {
    const inputId = id ?? slugify(label);

    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <input
            ref={ref}
            type="checkbox"
            id={inputId}
            className="h-4 w-4 rounded-sm accent-sage disabled:opacity-50 disabled:cursor-not-allowed"
            {...rest}
          />
          <label htmlFor={inputId} className="text-sm font-medium text-fg-1 cursor-pointer">
            {label}
          </label>
        </div>
        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
export type { CheckboxProps };
