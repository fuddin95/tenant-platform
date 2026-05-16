'use client';

import { useFormState, useFormStatus } from 'react-dom';
import TextInput from '@/components/ui/TextInput';
import Button from '@/components/ui/Button';
import { addReferenceAction } from '@/lib/actions/reference';

type ProfileFormProps = {
  readonly profileId: string | null;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" loading={pending} disabled={pending}>
      Add Reference
    </Button>
  );
}

const ProfileForm = ({ profileId }: ProfileFormProps) => {
  const [state, formAction] = useFormState(addReferenceAction, null);

  if (!profileId) {
    return (
      <div className="p-4 bg-bg-2 border border-border-1 rounded-md">
        <p className="text-sm text-fg-2">
          Create your profile first to add references.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="profileId" value={profileId} />

      {state && 'error' in state && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      {state && 'success' in state && (
        <p className="text-sm text-sage">Reference added successfully.</p>
      )}

      <TextInput
        label="Name"
        name="name"
        placeholder="Reference name"
      />
      <TextInput
        label="Relationship"
        name="relationship"
        placeholder="e.g., Landlord, Manager, Colleague"
      />
      <TextInput
        label="Email"
        type="email"
        name="email"
        placeholder="reference@example.com"
      />
      <TextInput
        label="Phone"
        type="tel"
        name="phone"
        placeholder="+1 (555) 000-0000"
      />
      <SubmitButton />
    </form>
  );
};

export default ProfileForm;
