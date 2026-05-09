# Pending Tickets

Automated agent picks the first unchecked item, implements it, commits to a feature branch, and checks it off.

## Frontend

<!-- Add new tickets here -->

## Done

- [x] TEN-42: Add Property form — `/properties/new` page with a Server Action. Fields: address, city, unit number (optional), bedrooms (number input), rent (decimal, CAD), status (ACTIVE default). Validate with Zod. On success redirect to /properties.
- [x] TEN-43: Apply link public page — `/apply/[slug]` route (public, no auth required). Fetch the property by `applySlug`, show property details (address, city, bedrooms, rent), and a "Start application" call-to-action button. If slug not found, show 404.
- [x] TEN-44: Tenant application submission — `/apply/[slug]/submit` page. Authenticated tenant only. Server Action creates the Application record and redirects to /profile.
- [x] TEN-45: Landlord applicants page — `/applicants` page (landlord only). List all applications across all the landlord's properties with tenant name, property address, status badge, submitted date.
- [x] TEN-46: Tenant applications page — `/applications` page (tenant only). Card list of tenant's own applications with property address, city, submitted date, status badge.
