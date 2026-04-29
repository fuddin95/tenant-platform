import React from 'react';

type SelectOption = {
  readonly value: string;
  readonly label: string;
};

type SelectOwnProps = {
  readonly label: string;
  readonly options: readonly SelectOption[];
  readonly error?: string;
  readonly placeholder?: string;
};

type SelectProps = SelectOwnProps &
  Omit<React.SelectHTMLAttributes<HTMLSelectElement>, keyof SelectOwnProps>;

const BASE_SELECT_CLASSES =
  'bg-surface-1 border border-border-1 rounded-md px-3 py-2 text-fg-1 w-full ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

const ERROR_SELECT_CLASSES = 'border-danger';

function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, placeholder, id, className, ...rest }, ref) => {
    const selectId = id ?? slugify(label);

    const selectClasses = [
      BASE_SELECT_CLASSES,
      error ? ERROR_SELECT_CLASSES : '',
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={selectId} className="text-sm font-medium text-fg-1">
          {label}
        </label>
        <select ref={ref} id={selectId} className={selectClasses} {...rest}>
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

export default Select;
export type { SelectProps, SelectOption };
