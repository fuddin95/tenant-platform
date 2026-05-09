'use client';

import { useState } from 'react';
import TextInput from '@/components/ui/TextInput';
import Button from '@/components/ui/Button';

type ProfileFormProps = {
  readonly profileId: string | null;
};

const ProfileForm = ({ profileId }: ProfileFormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    email: '',
    phone: '',
  });

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: wire to Server Action in TEN-20
  };

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
    <form onSubmit={handleSubmit} className="space-y-4">
      <TextInput
        label="Name"
        value={formData.name}
        onChange={(e) => handleChange('name', e.currentTarget.value)}
        placeholder="Reference name"
      />
      <TextInput
        label="Relationship"
        value={formData.relationship}
        onChange={(e) => handleChange('relationship', e.currentTarget.value)}
        placeholder="e.g., Landlord, Manager, Colleague"
      />
      <TextInput
        label="Email"
        type="email"
        value={formData.email}
        onChange={(e) => handleChange('email', e.currentTarget.value)}
        placeholder="reference@example.com"
      />
      <TextInput
        label="Phone"
        type="tel"
        value={formData.phone}
        onChange={(e) => handleChange('phone', e.currentTarget.value)}
        placeholder="+1 (555) 000-0000"
      />
      <Button type="submit" variant="primary">
        Add Reference
      </Button>
    </form>
  );
};

export default ProfileForm;
