## [LIN-XXX] — Replace with ticket title

### What does this PR do?
<!-- One paragraph max. What problem does it solve and how? -->

### Linear Ticket
<!-- Link: https://linear.app/your-workspace/issue/LIN-XXX -->

---

## Constitution Checklist
> Every PR touching tenant data, documents, or access control must complete this.
> Skip only if PR is purely UI/styling with zero data layer changes.

- [ ] **Rule 1 — Data Ownership:** No landlord writes to tenant records
- [ ] **Rule 2 — Sharing ≠ Copying:** No raw S3 keys or permanent URLs returned to client. Pre-signed URLs only, max 1hr expiry.
- [ ] **Rule 3 — Consent Logged:** Every access event writes an `AuditEvent` row
- [ ] **Rule 4 — Revocation Backend-Enforced:** `requireActiveGrant()` called before any document is served. Not UI-only.
- [ ] **Rule 5 — Facts Only:** No scores, ratings, or predictive fields added
- [ ] **Rule 6 — Tenant Visibility:** Nothing added that a tenant cannot see about themselves
- [ ] **Rule 9 — Source Attribution:** All new recorded facts have `reportedBy` populated

---

## Testing
- [ ] TypeScript compiles with no errors (`tsc --noEmit`)
- [ ] Lint passes (`eslint`)
- [ ] Tests added or updated for changed logic
- [ ] Tested revocation flow locally (if access control changed)

## Migrations
- [ ] No DB migrations in this PR
- [ ] DB migration included and reviewed for backward compatibility

## Screenshots / Demo
<!-- For UI changes, include before/after screenshots -->
