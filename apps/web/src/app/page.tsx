import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

// ── Helpers ───────────────────────────────────────────────────────────────────

function Pill({ children }: { readonly children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border-1 bg-surface-1 px-3 py-1 text-xs font-medium text-fg-2">
      {children}
    </span>
  );
}

function CheckItem({ children }: { readonly children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-fg-1">
      <span className="mt-0.5 text-sage">✓</span>
      {children}
    </li>
  );
}

function CrossItem({ children }: { readonly children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-fg-2">
      <span className="mt-0.5 text-danger">✗</span>
      {children}
    </li>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const HomePage = async () => {
  const session = await auth();

  if (session?.user?.role === 'LANDLORD') redirect('/dashboard');
  if (session?.user?.role === 'TENANT') redirect('/profile');

  return (
    <main>
      {/* ── Hero (TEN-9) ──────────────────────────────────────────────────── */}
      <section className="px-6 pb-24 pt-20 text-center">
        <div className="mx-auto max-w-3xl">
          <Pill>Built in Canada · PIPEDA compliant</Pill>

          <h1 className="text-display mt-6 text-fg-1">
            Your rental application,<br />
            managed with trust.
          </h1>

          <p className="text-body mx-auto mt-6 max-w-xl text-fg-2">
            Upload your documents once. Share them with any landlord, on your
            terms. Revoke access the moment you sign — or any time before.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/auth/signin"
              className="inline-flex items-center rounded-md bg-sage px-6 py-3 text-sm font-medium text-white hover:bg-sage/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 transition-colors"
            >
              Get early access
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center rounded-md border border-border-1 bg-surface-1 px-6 py-3 text-sm font-medium text-fg-1 hover:bg-bg-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 transition-colors"
            >
              See how it works
            </Link>
          </div>

          {/* Social proof */}
          <div className="mt-10 flex items-center justify-center gap-3">
            <div className="flex -space-x-2">
              {['JL', 'MA', 'DP', 'SK', 'RB'].map((initials) => (
                <div
                  key={initials}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface-1 bg-sage-light text-xs font-medium text-sage"
                >
                  {initials}
                </div>
              ))}
            </div>
            <p className="text-sm text-fg-2">
              Join <span className="font-medium text-fg-1">2,400+</span> renters already on the waitlist
            </p>
          </div>
        </div>
      </section>

      {/* ── Trust gap comparison (TEN-10) ─────────────────────────────────── */}
      <section className="border-y border-border-1 bg-bg-2 px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-heading mb-10 text-center text-fg-1">
            The rental application is broken.
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Today */}
            <div className="rounded-lg border border-border-1 bg-surface-1 p-6">
              <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-fg-3">
                Tenants today
              </p>
              <ul className="space-y-3">
                <CrossItem>Email your passport to a stranger</CrossItem>
                <CrossItem>No idea who&apos;s seen your SIN number</CrossItem>
                <CrossItem>Re-upload everything for every application</CrossItem>
                <CrossItem>Can&apos;t revoke access once documents are sent</CrossItem>
                <CrossItem>No record of who viewed your information</CrossItem>
              </ul>
            </div>

            {/* With RentalTrust */}
            <div className="rounded-lg border border-sage/30 bg-sage-light/20 p-6">
              <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-sage">
                Tenants on RentalTrust
              </p>
              <ul className="space-y-3">
                <CheckItem>One secure vault — apply anywhere</CheckItem>
                <CheckItem>Full audit log of every access event</CheckItem>
                <CheckItem>Share only what each landlord needs</CheckItem>
                <CheckItem>Revoke access instantly, any time</CheckItem>
                <CheckItem>Time-limited access by default</CheckItem>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works (TEN-11) ─────────────────────────────────────────── */}
      <section id="how-it-works" className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-heading mb-3 text-center text-fg-1">How it works</h2>
          <p className="mb-12 text-center text-body text-fg-2">
            Three steps, and you&apos;re in control.
          </p>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex flex-col">
              <span className="font-mono text-3xl font-medium text-border-2">01</span>
              <h3 className="mt-3 text-lg font-semibold text-fg-1">Build your vault</h3>
              <p className="mt-2 text-sm text-fg-2">
                Upload your government ID, pay stubs, and references once. Your documents
                stay encrypted in Canada — never stored anywhere else.
              </p>
            </div>

            <div className="flex flex-col">
              <span className="font-mono text-3xl font-medium text-border-2">02</span>
              <h3 className="mt-3 text-lg font-semibold text-fg-1">Share with limits</h3>
              <p className="mt-2 text-sm text-fg-2">
                Choose exactly which documents each landlord can see, and for how long.
                Access is time-bound — no open-ended sharing, ever.
              </p>
            </div>

            <div className="flex flex-col">
              <span className="font-mono text-3xl font-medium text-border-2">03</span>
              <h3 className="mt-3 text-lg font-semibold text-fg-1">Sign with confidence</h3>
              <p className="mt-2 text-sm text-fg-2">
                Once you sign a lease, revoke the landlord&apos;s access in one click.
                Every view is logged — you always know who saw what.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Principles (TEN-12) ───────────────────────────────────────────── */}
      <section className="border-t border-border-1 bg-bg-2 px-6 py-20" id="principles">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-heading mb-3 text-center text-fg-1">Our commitments</h2>
          <p className="mb-12 text-center text-body text-fg-2">
            These aren&apos;t guidelines. They&apos;re hard constraints baked into every line of code.
          </p>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-lg border border-border-1 bg-surface-1 p-6">
              <Pill>Ownership</Pill>
              <h3 className="mt-3 font-semibold text-fg-1">Your data stays yours</h3>
              <p className="mt-2 text-sm text-fg-2">
                Landlords can never download, copy, or store your documents. They get a
                time-limited view — nothing more.
              </p>
            </div>

            <div className="rounded-lg border border-border-1 bg-surface-1 p-6">
              <Pill>Sharing ≠ Copying</Pill>
              <h3 className="mt-3 font-semibold text-fg-1">Views, not transfers</h3>
              <p className="mt-2 text-sm text-fg-2">
                Every document access uses a one-hour pre-signed URL. The raw file location
                never leaves our servers.
              </p>
            </div>

            <div className="rounded-lg border border-border-1 bg-surface-1 p-6">
              <Pill>Facts only</Pill>
              <h3 className="mt-3 font-semibold text-fg-1">No scores, no judgments</h3>
              <p className="mt-2 text-sm text-fg-2">
                We record facts — documents, dates, who viewed what. We never compute
                scores, ratings, or any predictive assessment of you.
              </p>
            </div>

            <div className="rounded-lg border border-border-1 bg-surface-1 p-6">
              <Pill>Time-bound by default</Pill>
              <h3 className="mt-3 font-semibold text-fg-1">Access that expires</h3>
              <p className="mt-2 text-sm text-fg-2">
                Every access grant requires an expiry date. Open-ended sharing is not
                possible — by design, not by policy.
              </p>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-fg-3">
            Read the full{' '}
            <Link href="/constitution" className="text-sage underline underline-offset-2 hover:text-sage/80">
              Platform Constitution
            </Link>
          </p>
        </div>
      </section>

      {/* ── Final CTA band (TEN-13) ───────────────────────────────────────── */}
      <section className="px-6 py-20 text-center">
        <div className="mx-auto max-w-xl">
          <h2 className="text-heading text-fg-1">Ready to take back control?</h2>
          <p className="text-body mt-4 text-fg-2">
            Create your free profile today. One vault, every application.
          </p>
          <Link
            href="/auth/signin"
            className="mt-8 inline-flex items-center rounded-md bg-sage px-8 py-3 text-sm font-medium text-white hover:bg-sage/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 transition-colors"
          >
            Get early access — it&apos;s free
          </Link>
          <p className="mt-4 text-xs text-fg-3">No credit card required.</p>
        </div>
      </section>
    </main>
  );
};

export default HomePage;
