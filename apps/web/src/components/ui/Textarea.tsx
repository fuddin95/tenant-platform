import React from 'react';

type TextareaOwnProps = {
  readonly label: string;
  readonly error?: string;
  readonly hint?: string;
  readonly rows?: number;
};

type TextareaProps = TextareaOwnProps &
  Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, keyof TextareaOwnProps>;

const BASE_TEXTAREA_CLASSES =
  'bg-surface-1 border border-border-1 rounded-md px-3 py-2 text-fg-1 w-full ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage ' +
  'disabled:opacity-50 disabled:cursor-not-allowed resize-y';

const ERROR_TEXTAREA_CLASSES = 'border-danger';

function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, rows = 4, id, className, ...rest }, ref) => {
    const inputId = id ?? slugify(label);

    const textareaClasses = [
      BASE_TEXTAREA_CLASSES,
      error ? ERROR_TEXTAREA_CLASSES : '',
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="text-sm font-medium text-fg-1">
          {label}
        </label>
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          className={textareaClasses}
          {...rest}
        />
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

export default Textarea;
export type { TextareaProps };
