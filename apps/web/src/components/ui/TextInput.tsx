import React from 'react';

type TextInputOwnProps = {
  readonly label: string;
  readonly error?: string;
  readonly hint?: string;
};

type TextInputProps = TextInputOwnProps &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, keyof TextInputOwnProps>;

const BASE_INPUT_CLASSES =
  'bg-surface-1 border border-border-1 rounded-md px-3 py-2 text-fg-1 w-full ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

const ERROR_INPUT_CLASSES = 'border-danger';

function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, error, hint, id, className, ...rest }, ref) => {
    const inputId = id ?? slugify(label);

    const inputClasses = [
      BASE_INPUT_CLASSES,
      error ? ERROR_INPUT_CLASSES : '',
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="text-sm font-medium text-fg-1">
          {label}
        </label>
        <input ref={ref} id={inputId} className={inputClasses} {...rest} />
        {hint && !error && (
          <p className="text-sm text-fg-2">{hint}</p>
        )}
        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

export default TextInput;
export type { TextInputProps };
