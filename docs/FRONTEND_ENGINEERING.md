# Frontend Engineering Guide — Keyring / RentalTrust

> Read this before writing or reviewing any frontend code.
> This is the authoritative standard for architecture, component design, testing, and code quality.

---

## 1. Repository Layer Architecture

Every UI concern lives in exactly one of four layers. No layer may import from a layer above it.

```
app/                  ← Layer 4: Pages — route shells only, 30 lines max
views/                ← Layer 3: Sections — compose containers + components into UI regions
containers/           ← Layer 2: Smart wrappers — data fetching, state, server actions
components/           ← Layer 1: Dumb atoms — pure functions of props, no side effects
```

### Layer 1 — `components/`

Pure UI. No data fetching. No server actions. No business logic. Stateless where possible.

```
components/
  ui/               # Design-system atoms: Button, Input, Badge, Pill, Icon, Modal, Skeleton
  glass/            # Glass-system surfaces: GlassCard, GlassPanel, GlassModal, LiquidBackground
  layout/           # Structural: AppShell, Sidebar, TopNav, PageHeader, Footer
  shared/           # Cross-domain: EmptyState, ErrorState, VerifyingOrb, CountdownTimer
```

Rules:
- Accept data as props; emit events via callbacks.
- No `import` from `lib/actions`, `lib/auth`, or `hooks/` that touches external data.
- All visual variants driven by explicit prop values (not internal logic).
- Export named component + its prop types from the same file.

### Layer 2 — `containers/`

Smart wrappers. The only layer that calls server actions, reads session, or subscribes to state.

```
containers/
  auth/             # OAuthButtonsContainer, EmailOTPContainer
  vault/            # VaultDataContainer, DocumentsContainer, ActiveSharesContainer
  sharing/          # ShareModalContainer, RevokeGrantContainer
  onboarding/       # OnboardingFlowContainer, IDCaptureContainer
  landlord/         # LandlordViewContainer, ApplicationReviewContainer
```

Rules:
- Import a component from `components/`, fetch data, pass result as props.
- One container = one data concern (vault stats, active shares, etc.).
- `'use client'` goes here when needed, not in `components/`.
- Error and loading states are the container's responsibility.

### Layer 3 — `views/`

Assembled sections. Compose containers + components into complete UI regions. No raw data fetching — if data is needed, reach for a container.

```
views/
  landing/          # HeroView, TrustGapView, StepsView, PrinciplesView, CTAView
  auth/             # SignInView, VerifyEmailView
  onboarding/       # ChooseIDView, CaptureIDView, SelfieView, VerifyingView, SuccessView
  vault/            # VaultDashboardView, DocumentsView, ActiveSharesView, TimelineView
  landlord/         # LandlordProfileView, FactsGridView, AccessEndedView, EmailPreviewView
```

Rules:
- A view's logic is layout and composition only.
- Views own the arrangement of their children, nothing more.
- May accept route params passed down from a page.

### Layer 4 — `app/`

Thin route shells. Extract params, pick the right view, done.

```typescript
// ✅ Correct — page is a thin shell
export default async function ProfilePage() {
  return <VaultDashboardView />;
}

// ❌ Wrong — business logic in a page
export default async function ProfilePage() {
  const session = await auth();
  const docs = await db.document.findMany({ where: { tenantId: session.user.id } });
  return <div>{docs.map(d => <div key={d.id}>{d.name}</div>)}</div>;
}
```

Rules:
- No UI primitives in page files.
- No inline query logic.
- Maximum 30 lines. If you need more, create a view.

---

## 2. Directory Structure (full)

```
apps/web/src/
├── app/                          # Next.js App Router route shells
│   ├── layout.tsx                # Root layout (LiquidBackground + SVG defs)
│   ├── page.tsx                  # → <LandingView />
│   ├── auth/
│   │   ├── signin/page.tsx       # → <SignInView />
│   │   └── verify-email/page.tsx # → <VerifyEmailView />
│   ├── onboarding/
│   │   └── step/[step]/page.tsx  # → dispatches to step view by param
│   ├── (tenant)/
│   │   ├── layout.tsx
│   │   ├── profile/page.tsx      # → <VaultDashboardView />
│   │   ├── activity/page.tsx     # → <AuditLogView />
│   │   └── settings/page.tsx     # → <SettingsView />
│   ├── (landlord)/
│   │   └── ...
│   └── v/[token]/
│       ├── page.tsx              # → <LandlordProfileView token={token} />
│       └── verify/page.tsx       # → <LandlordVerifyView token={token} />
│
├── views/                        # Assembled sections (Layer 3)
│   ├── landing/
│   ├── auth/
│   ├── onboarding/
│   ├── vault/
│   └── landlord/
│
├── containers/                   # Smart data wrappers (Layer 2)
│   ├── auth/
│   ├── vault/
│   ├── sharing/
│   ├── onboarding/
│   └── landlord/
│
├── components/                   # Pure UI atoms (Layer 1)
│   ├── ui/
│   ├── glass/
│   ├── layout/
│   └── shared/
│
├── hooks/                        # Custom React hooks (pure, no data fetching)
│   ├── useCountdown.ts
│   ├── useTheme.ts
│   ├── useLocalStorage.ts
│   └── useVaultLayout.ts
│
├── lib/                          # Utilities, server actions, auth helpers
│   ├── actions/                  # Server actions (append to, never delete)
│   ├── auth.ts
│   └── utils.ts
│
├── types/                        # TypeScript types, branded types, Zod codecs
└── styles/
    └── globals.css               # Design tokens, glass utilities, animations
```

---

## 3. Ten Principles of a 10× Frontend Engineer

### P1 — Layers enforce themselves

The import direction is one-way: `app → view → container → component → (nothing)`.

If you find yourself importing a server action inside `components/ui/Button.tsx`, you have broken a layer boundary. Stop. Extract a container.

```typescript
// ❌ component reaching into data layer
function DocumentCard({ id }: { id: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => { viewDocument(id).then(setUrl); }, [id]); // reaches into lib/actions
  ...
}

// ✅ container handles data; component is pure
// containers/vault/DocumentCardContainer.tsx
export async function DocumentCardContainer({ id }: { id: string }) {
  const url = await viewDocument(id);
  return <DocumentCard url={url} />;
}
```

### P2 — Before creating, grep

Search before writing. Three lines in a new file can often be one import from an existing component.

```bash
# Before building a new loading spinner:
grep -r "animate-spin\|verifying-spinner\|LoadingSpinner" src/components/
```

If it exists, use it. If it almost exists, generalize it (add a `size` or `variant` prop). Never duplicate.

### P3 — Props are API contracts

Every component's props interface is a contract between layers. It must be:
- Typed precisely (no `any`, no `object`, no `Record<string, unknown>` unless truly necessary)
- Documented when non-obvious
- Exported alongside the component

```typescript
// ✅ Explicit contract
type AccessMeterProps = {
  readonly createdAt: Date;
  readonly expiresAt: Date;
};

// ❌ Vague contract
type AccessMeterProps = {
  grant: any;
};
```

Prop changes between layers are coupling. Keep them minimal and named for the view's domain, not the data layer's domain.

### P4 — Variants, not conditionals

Visual branches belong in variant maps, not if/else chains. Variant maps are easier to extend, easier to read, and keep components closed-to-modification.

```typescript
// ✅ Variant map
const PILL_VARIANTS = {
  sage:    'bg-sage text-white',
  amber:   'bg-amber-100 text-amber-800',
  danger:  'bg-red-100 text-red-800',
  ink:     'bg-ink text-bg',
} satisfies Record<string, string>;

// ❌ Conditional chain
const cls = status === 'active' ? 'bg-sage text-white'
          : status === 'expiring' ? 'bg-amber-100 text-amber-800'
          : 'bg-red-100 text-red-800';
```

### P5 — Server Components first, `'use client'` last

In Next.js App Router, every component is a Server Component by default. Add `'use client'` only when you specifically need:
- `useState` / `useReducer`
- `useEffect` / browser APIs
- Event handlers beyond simple form actions
- Third-party client-only libraries

The surface area of client JS is a feature budget. Spend it deliberately.

```typescript
// ✅ Server Component — no 'use client' needed
export default async function ActiveSharesContainer() {
  const grants = await db.accessGrant.findMany({ ... });
  return <ActiveSharesSection grants={grants} />;
}

// Only this piece needs interactivity
'use client';
export function RevokeButton({ grantId }: { grantId: string }) {
  return <form action={revokeGrant}><button>Revoke</button></form>;
}
```

### P6 — Colocate everything

Tests, types, and stories live beside the thing they describe. Never put tests in a separate top-level `__tests__/` directory that mirrors the source tree.

```
components/ui/Button/
  Button.tsx
  Button.test.tsx        # ✅ alongside, not in src/__tests__/
  Button.types.ts        # if types are non-trivial
```

Exception: shared test utilities go in `src/__test-utils__/`.

### P7 — Accessibility is not optional

Every interactive component ships with:
- Semantic HTML (`<button>`, not `<div onClick>`)
- `aria-label` or visible label for icon-only elements
- `aria-busy` on loading states
- `aria-disabled` instead of `disabled` when you want the element focusable
- Focus ring visible in all themes (`focus-visible:ring-2`)
- Keyboard operability (Enter/Space for buttons, arrow keys for custom lists)

If you remove an accessibility attribute to "clean up" the JSX, the PR reviewer should block merge.

### P8 — Error and empty states are first-class UI

Every data-dependent view has three states: loading, empty, and error. Write them all before writing the happy path.

```typescript
// Container always handles all three
if (error) return <ErrorState message="Couldn't load your vault." retry={refetch} />;
if (!grants.length) return <EmptyState message="No active shares." action={<ShareButton />} />;
return <ActiveSharesGrid grants={grants} />;
```

The `EmptyState` and `ErrorState` components are in `components/shared/` — use them, do not inline.

### P9 — CSS tokens, never raw values

Every design decision lives in a CSS variable from `globals.css`. Never hardcode a color, radius, shadow, or font.

```typescript
// ✅ Token
style={{ color: 'var(--ink-2)', borderRadius: 'var(--radius-lg)' }}

// ❌ Hardcoded
style={{ color: '#6b7280', borderRadius: '12px' }}
```

Adding a new value that doesn't have a token? Add the token first, then use it.

### P10 — TypeScript errors are build failures

TypeScript strict mode is on. `any`, `// @ts-ignore`, `as unknown as X`, and `!` non-null assertions are treated like `console.log` left in prod — they must be justified with a comment, and the comment must say *why* the type system cannot be satisfied here.

If a type doesn't fit, fix the type. Do not fight the type system with escape hatches.

---

## 4. Code Writing Guide

### Component anatomy

```typescript
// 1. Types — exported, above the component
type GlassCardProps = {
  readonly children: React.ReactNode;
  readonly variant?: 'default' | 'strong' | 'soft';
  readonly className?: string;
};

// 2. Variant/size maps — const, above the component
const VARIANT_CLASSES: Record<NonNullable<GlassCardProps['variant']>, string> = {
  default: 'bg-glass backdrop-blur-glass border-glass-border',
  strong:  'bg-glass-strong backdrop-blur-glass-lg border-glass-border',
  soft:    'bg-glass-soft backdrop-blur-sm border-glass-border/50',
};

// 3. Component — forwardRef if it wraps a DOM element
const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  function GlassCard({ children, variant = 'default', className }, ref) {
    return (
      <div
        ref={ref}
        className={cn('rounded-glass shadow-glass', VARIANT_CLASSES[variant], className)}
      >
        {children}
      </div>
    );
  }
);

// 4. Display name — required for forwardRef
GlassCard.displayName = 'GlassCard';

// 5. Named export — never default export from component files
export { GlassCard };
export type { GlassCardProps };
```

### Server action anatomy

```typescript
'use server';

import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { requireActiveGrant } from '@/lib/guards';

// 1. Input schema — always Zod, always at the top
const CreateShareLinkSchema = z.object({
  recipientEmail: z.string().email(),
  recipientName:  z.string().min(1).max(100),
  allowedFacts:   z.array(z.enum(['IDENTITY', 'INCOME', 'RENTAL_HISTORY', 'REFERENCES'])).min(1),
  durationHours:  z.number().int().min(1).max(336),
});

// 2. Action — async function, explicit return type
export async function createShareLink(
  input: z.infer<typeof CreateShareLinkSchema>
): Promise<{ link: string }> {
  // 3. Auth — always first
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  // 4. Validate — always second
  const data = CreateShareLinkSchema.parse(input);

  // 5. Business logic
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + data.durationHours * 3_600_000);

  await db.shareLink.create({
    data: { tenantId: session.user.id, token, expiresAt, ...data },
  });

  // 6. Audit — always before return
  await db.auditEvent.create({
    data: {
      eventType: 'SHARE_LINK_CREATED',
      actorId:   session.user.id,
      actorType: 'TENANT',
      metadata:  { recipientEmail: data.recipientEmail },
      occurredAt: new Date(),
    },
  });

  return { link: `/v/${token}` };
}
```

### Custom hook anatomy

```typescript
// hooks/useCountdown.ts
import { useState, useEffect } from 'react';

type CountdownResult = {
  formatted: string;     // "HH:MM:SS"
  isExpired: boolean;
};

export function useCountdown(expiresAt: Date): CountdownResult {
  const [remaining, setRemaining] = useState(() => expiresAt.getTime() - Date.now());

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => {
      setRemaining(expiresAt.getTime() - Date.now());
    }, 1_000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (remaining <= 0) return { formatted: '00:00:00', isExpired: true };

  const totalSeconds = Math.floor(remaining / 1_000);
  const h = Math.floor(totalSeconds / 3_600).toString().padStart(2, '0');
  const m = Math.floor((totalSeconds % 3_600) / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');

  return { formatted: `${h}:${m}:${s}`, isExpired: false };
}
```

### File naming rules

| Thing | Convention | Example |
|-------|-----------|---------|
| Component | PascalCase `.tsx` | `GlassCard.tsx` |
| Container | PascalCase + `Container` | `VaultDataContainer.tsx` |
| View | PascalCase + `View` | `VaultDashboardView.tsx` |
| Hook | camelCase + `use` prefix | `useCountdown.ts` |
| Server action | camelCase | `createShareLink.ts` |
| Type-only file | camelCase | `grant.types.ts` |
| Test | same name + `.test.tsx` | `GlassCard.test.tsx` |

### The DRY checklist — before writing any new component

1. `grep -r "ComponentNameHint" src/components/` — does it exist?
2. Does an existing component cover 80% of your needs? Add a prop instead of a new component.
3. Are you copy-pasting JSX from another file? Extract the duplicated block into a shared component.
4. Are you writing the same Tailwind string in multiple files? Extract it into a CSS class in `globals.css`.
5. Are you writing the same server-side guard logic in multiple actions? Extract it into `lib/guards.ts`.

---

## 5. Testing Guide

### Philosophy

Test behavior, not implementation. A test that breaks when you rename a CSS class is a bad test. A test that breaks when you remove a button is a good test.

### Layer-specific test strategy

| Layer | Tool | What to test | What NOT to test |
|-------|------|-------------|-----------------|
| components/ | `@testing-library/react` | Renders correct output for props, user interactions trigger callbacks | CSS class names, internal state, DOM structure |
| containers/ | `@testing-library/react` + MSW | Data flows to component as expected props, loading/error states appear | Server action internals, DB queries |
| hooks/ | `renderHook` | Hook returns correct values, updates on input change | React internals |
| lib/actions/ | Vitest + Prisma mock | Correct DB writes, correct errors on invalid input, auth guard blocks unauthenticated calls | Prisma internals |
| E2E critical paths | Playwright | Full user journeys complete without error | Styling, animation timing |

### Component test pattern

```typescript
// components/ui/Button/Button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('shows spinner and disables when loading', () => {
    render(<Button loading>Save</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });

  it('calls onClick when clicked', async () => {
    const handler = vi.fn();
    render(<Button onClick={handler}>Save</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not call onClick when disabled', async () => {
    const handler = vi.fn();
    render(<Button disabled onClick={handler}>Save</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(handler).not.toHaveBeenCalled();
  });
});
```

### Server action test pattern

```typescript
// lib/actions/__tests__/createShareLink.test.ts
import { createShareLink } from '../createShareLink';
import { mockAuth, mockDb } from '@/__test-utils__/mocks';

describe('createShareLink', () => {
  it('creates a share link and audit event', async () => {
    mockAuth({ id: 'tenant-1' });

    const result = await createShareLink({
      recipientEmail: 'sam@example.com',
      recipientName:  'Sam Chen',
      allowedFacts:   ['IDENTITY'],
      durationHours:  24,
    });

    expect(result.link).toMatch(/^\/v\//);
    expect(mockDb.shareLink.create).toHaveBeenCalledOnce();
    expect(mockDb.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ eventType: 'SHARE_LINK_CREATED' }) })
    );
  });

  it('throws Unauthorized when not signed in', async () => {
    mockAuth(null);
    await expect(createShareLink({ ... })).rejects.toThrow('Unauthorized');
  });

  it('throws on invalid input', async () => {
    mockAuth({ id: 'tenant-1' });
    await expect(
      createShareLink({ recipientEmail: 'not-an-email', ... })
    ).rejects.toThrow();
  });
});
```

### E2E critical paths (Playwright)

Three flows must have E2E coverage before any sprint ships:

1. **Tenant signup → onboarding → vault visible** (happy path)
2. **Share link created → email sent → landlord verifies → profile visible → countdown ticks → revoke → "Access ended"**
3. **Expired grant → token returns 401 → Access ended page renders**

```typescript
// e2e/share-flow.spec.ts
test('tenant shares access and landlord sees verified profile', async ({ page }) => {
  await page.goto('/auth/signin');
  // ... auth steps ...
  await page.click('[data-testid="share-access-btn"]');
  await page.fill('[name="recipientName"]', 'Sam Chen');
  await page.fill('[name="recipientEmail"]', 'sam@example.com');
  await page.click('[data-testid="share-continue"]');
  // ... select scope ...
  await page.click('[data-testid="send-link"]');
  const linkText = await page.textContent('[data-testid="share-link-display"]');
  expect(linkText).toMatch(/\/v\//);
});
```

### Test ID convention

Use `data-testid` only on interactive elements that have no accessible role. Prefer `getByRole`, `getByLabelText`, `getByText` — they reflect what users actually see.

```typescript
// ✅ Prefer accessible queries
screen.getByRole('button', { name: 'Revoke' })
screen.getByLabelText('Recipient email')

// ✅ data-testid only when no accessible handle exists
<div data-testid="countdown-timer">{formatted}</div>
```

### What to never test

- CSS class names or Tailwind strings
- Internal React state (`wrapper.instance()`, etc.)
- Implementation order of Prisma calls (test the result, not the mechanism)
- Animation duration or CSS transitions
- `console.log` output

---

## 6. Code Review Checklist

Before approving any FE PR, verify:

- [ ] **Layer discipline** — no component reaches into `lib/actions` or `lib/auth`
- [ ] **No new duplication** — grep confirms the added component/hook/utility doesn't already exist
- [ ] **Props typed** — no `any`, all props have explicit types, exported
- [ ] **`'use client'` justified** — comment present if marking a Server Component as client
- [ ] **Accessibility** — interactive elements are `<button>` or `<a>`, have accessible names
- [ ] **Three states present** — loading, empty, error states all handled
- [ ] **CSS tokens** — no hardcoded colors or radii
- [ ] **Tests cover behavior** — at least happy path + one error path per container/action
- [ ] **Constitution** — if PR touches grants/documents, constitution checklist in PR description

---

*Maintained by Fahad. Last updated: 2026-05-17.*
*This document supersedes any inline comments about architecture decisions.*
