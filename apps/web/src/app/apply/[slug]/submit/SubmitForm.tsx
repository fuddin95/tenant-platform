'use client'

import { useFormState, useFormStatus } from 'react-dom'
import Button from '@/components/ui/Button'
import { submitApplicationAction } from '@/lib/actions/application'

type SubmitFormProps = {
  readonly propertyId: string
}

export default function SubmitForm({ propertyId }: SubmitFormProps) {
  const [state, formAction] = useFormState(submitApplicationAction, null)

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="propertyId" value={propertyId} />

      {state?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {state.error}
        </div>
      )}

      <SubmitButton />
    </form>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      variant="primary"
      className="w-full"
      loading={pending}
      disabled={pending}
    >
      Confirm application
    </Button>
  )
}
