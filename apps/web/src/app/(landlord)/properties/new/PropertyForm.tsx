'use client'

import { useFormState, useFormStatus } from 'react-dom'
import TextInput from '@/components/ui/TextInput'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { createPropertyAction } from '@/lib/actions/property'

export default function PropertyForm() {
  const [state, action] = useFormState(createPropertyAction, null)
  const { pending } = useFormStatus()

  return (
    <form action={action} className="space-y-6">
      {state?.error && (
        <div
          className="rounded-md bg-danger-bg px-4 py-3 text-sm text-danger"
          role="alert"
        >
          {state.error}
        </div>
      )}

      <TextInput
        label="Address"
        name="address"
        required
        placeholder="e.g. 123 Main Street"
      />

      <TextInput
        label="City"
        name="city"
        required
        placeholder="e.g. Toronto"
      />

      <TextInput
        label="Unit number"
        name="unitNumber"
        placeholder="Optional (e.g. Apt 4B)"
        hint="Optional (e.g. Apt 4B)"
      />

      <TextInput
        label="Bedrooms"
        name="bedrooms"
        type="number"
        required
        placeholder="e.g. 2"
      />

      <TextInput
        label="Monthly rent (CAD)"
        name="rent"
        type="number"
        required
        placeholder="Enter amount in dollars (e.g. 1800)"
        hint="Enter amount in dollars (e.g. 1800)"
      />

      <Select
        label="Status"
        name="status"
        options={[
          { value: 'ACTIVE', label: 'Active' },
          { value: 'FILLED', label: 'Filled' },
          { value: 'INACTIVE', label: 'Inactive' },
        ]}
        defaultValue="ACTIVE"
      />

      <Button variant="primary" type="submit" loading={pending}>
        Add property
      </Button>
    </form>
  )
}
