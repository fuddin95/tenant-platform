Document 1: The Revised Platform Constitution
Rental Trust Platform Constitution (v2.0)

We don’t help people find rentals. We help people prove trust when renting.
This document defines the non-negotiable principles governing how the Rental Trust platform is designed, built, and operated. It balances tenant rights with legal reality and landlord obligations.

1️⃣ Data Ownership (Non-Negotiable Rule)
Rule: Tenants always own their data.

Implications: All tenant documents are uploaded by tenants themselves. Landlords cannot upload, create, or modify tenant data.
Allowed: Tenant uploads documents; Tenant initiates sharing; Platform generates system records based on lease events.
Forbidden: Landlord-uploaded tenant documents; Automatic resharing of tenant data without explicit action.
2️⃣ Sharing ≠ Copying (With Legal Exception)
Rule: Sharing means permissioned access to the live vault, not duplication.

Standard Implication: Documents are viewed through controlled access. Access is time-bound and revocable.
The "Legal Retention" Exception: To comply with Provincial Residential Tenancy Acts (e.g., Ontario, BC), a "Static Legal Record" is automatically generated upon lease signing. This is a watermarked, immutable PDF of the signed lease stored in the Landlord's secure vault. This record cannot be edited or updated by future tenant revocations, satisfying the landlord's legal obligation to retain records for 2–3 years.
Allowed: Secure in-platform viewing; Watermarked "Legal Record" downloads for compliance.
Forbidden: Emailing raw source PDFs; Permanent public links to live data; Sharing the "Legal Record" with third parties unrelated to the tenancy.
3️⃣ Explicit, Granular, Logged Consent
Rule: Every access to tenant data requires explicit, granular consent.

Consent Must Record: Who requested access; What data was shared; When access began; When access ends; Who revoked access.
Allowed: Granular permissions (e.g., "View ID only" vs "View Payment History").
Forbidden: Blanket permissions; Implicit or assumed consent.
4️⃣ Revocation Must Be Immediate and Absolute (With Legal Exception)
Rule: Revocation immediately removes access to live data.

Implications: Access tokens are invalidated in real-time. Cached access to the tenant's active vault fails immediately.
The Exception: Revocation does not delete the "Static Legal Record" (the signed lease) generated during the tenancy, as landlords are legally required to keep this.
Allowed: Real-time token invalidation; Instant severance of live data streams.
Forbidden: UI-only revocation; Delayed removal of live access; Deleting the Landlord's copy of the executed lease.
5️⃣ Facts Only — No Interpretation
Rule: The platform records verifiable events, not opinions or judgments.

Allowed: Lease start and end dates; Payment recorded as "On-Time," "Late," or "Partial"; Verification events; "Notice Provided" events.
Forbidden: Risk scores; Ratings (e.g., "Bad Tenant"); Predictive or judgmental language.
UI Presentation: Data may be visualized (e.g., timelines, color-coded status) for readability, but the underlying data must always be raw facts.
6️⃣ Mandatory Source Attribution & Correction
Rule: Every recorded fact must clearly state its source.

The "Source Correction" Exception: The originator of a fact (e.g., the Landlord) may correct a factual error (e.g., changing a payment status from "Late" to "Paid" if they made a mistake).
Mechanism: The original record is struck-through but remains visible (for audit trail), and the corrected record is appended with a timestamp.
Allowed: "Reported by Landlord A on Oct 12"; "Corrected by Landlord A on Oct 14."
Forbidden: Anonymous or aggregated facts; The Tenant editing a Landlord's submitted fact (Tenant must Dispute, not Edit).
7️⃣ Full Tenant Visibility
Rule: Nothing about a tenant exists without their ability to see it.

Implications: Tenants can view all data associated with them; Tenants review access logs and reported events.
Allowed: Tenant viewing their own "Shadow Profile" (what landlords see).
Forbidden: Hidden notes; Internal-only tenant flags.
8️⃣ Disputes Are Recorded, Not Resolved
Rule: The platform does not arbitrate truth; it records disagreement.

Implications: Disputes preserve all reported facts. Status is clearly marked as "Disputed."
Refinement: If a Source Correction (Rule 6) resolves the issue, the dispute status is updated to "Resolved - Corrected."
Forbidden: Deleting contested records; Platform-side judgments on "who is right."
9️⃣ Time-Bound by Default
Rule: Access and relevance must be time-bound by default.

Implications: Sharing permissions expire automatically. Tenants control how much history they share.
Allowed: "Share last 2 years of history."
Forbidden: Permanent negative records (e.g., a 10-year-old eviction flag remains relevant forever without context); Unlimited default access.
