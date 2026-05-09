# Pending Tickets

Automated agent picks the first unchecked item, implements it, commits to a feature branch, and checks it off.

## Frontend

- [ ] TEN-42: Add Property form — `/properties/new` page with a Server Action. Fields: address, city, unit number (optional), bedrooms (number input), rent (decimal, CAD), status (ACTIVE default). Validate with Zod. On success redirect to /properties. Use TextInput, Select, Button UI components from `src/components/ui/`.
- [ ] TEN-43: Apply link public page — `/apply/[slug]` route (public, no auth required). Fetch the property by `applySlug`, show property details (address, city, bedrooms, rent), and a "Start application" call-to-action button. If slug not found, show 404.
- [ ] TEN-44: Tenant application submission — `/apply/[slug]/submit` page. Authenticated tenant only (redirect to signin if not). Show a confirmation form ("Apply for [address]?") with a submit button. Server Action creates the Application record (`db.application.create`) and redirects to /profile.
- [ ] TEN-45: Landlord applicants page — `/applicants` page (landlord only). List all applications across all the landlord's properties. Each row: tenant name, property address, status badge (use ApplicationStatusBadge), submitted date. Empty state if none.
- [ ] TEN-46: Tenant applications page — `/applications` page (tenant only). List the tenant's own applications. Each row: property address, city, submitted date, status badge. Empty state if none. Add this route to TopNav TENANT_LINKS (it's already defined as href `/applications`).

## Done

<!-- Move completed items here after implementation -->
