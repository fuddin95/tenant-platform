import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral';

interface BadgeProps {
  readonly variant: BadgeVariant;
  readonly children: React.ReactNode;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: 'bg-sage-light text-sage',
  warning: 'bg-warn-bg text-warn',
  danger: 'bg-danger-bg text-danger',
  neutral: 'bg-bg-3 text-fg-2',
};

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// AccessGrant status badges
// ---------------------------------------------------------------------------

type AccessGrantStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';

const ACCESS_GRANT_VARIANT: Record<AccessGrantStatus, BadgeVariant> = {
  ACTIVE: 'success',
  EXPIRED: 'warning',
  REVOKED: 'danger',
};

const ACCESS_GRANT_LABEL: Record<AccessGrantStatus, string> = {
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  REVOKED: 'Revoked',
};

interface AccessGrantBadgeProps {
  readonly status: AccessGrantStatus;
}

export function AccessGrantBadge({ status }: AccessGrantBadgeProps) {
  return (
    <Badge variant={ACCESS_GRANT_VARIANT[status]}>
      {ACCESS_GRANT_LABEL[status]}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Application status badges
// ---------------------------------------------------------------------------

type ApplicationStatus =
  | 'PENDING'
  | 'REVIEWING'
  | 'SHORTLISTED'
  | 'DECLINED'
  | 'ACCEPTED';

const APPLICATION_VARIANT: Record<ApplicationStatus, BadgeVariant> = {
  PENDING: 'warning',
  REVIEWING: 'success',
  SHORTLISTED: 'success',
  DECLINED: 'danger',
  ACCEPTED: 'success',
};

const APPLICATION_LABEL: Record<ApplicationStatus, string> = {
  PENDING: 'Pending',
  REVIEWING: 'Reviewing',
  SHORTLISTED: 'Shortlisted',
  DECLINED: 'Declined',
  ACCEPTED: 'Accepted',
};

interface ApplicationStatusBadgeProps {
  readonly status: ApplicationStatus;
}

export function ApplicationStatusBadge({ status }: ApplicationStatusBadgeProps) {
  return (
    <Badge variant={APPLICATION_VARIANT[status]}>
      {APPLICATION_LABEL[status]}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Document status badges
// ---------------------------------------------------------------------------

type DocumentStatus = 'VERIFIED' | 'PENDING' | 'DISPUTED';

const DOCUMENT_VARIANT: Record<DocumentStatus, BadgeVariant> = {
  VERIFIED: 'success',
  PENDING: 'warning',
  DISPUTED: 'danger',
};

const DOCUMENT_LABEL: Record<DocumentStatus, string> = {
  VERIFIED: 'Verified',
  PENDING: 'Pending',
  DISPUTED: 'Disputed',
};

interface DocumentStatusBadgeProps {
  readonly status: DocumentStatus;
}

export function DocumentStatusBadge({ status }: DocumentStatusBadgeProps) {
  return (
    <Badge variant={DOCUMENT_VARIANT[status]}>
      {DOCUMENT_LABEL[status]}
    </Badge>
  );
}
