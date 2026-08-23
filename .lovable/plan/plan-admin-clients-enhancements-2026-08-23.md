# Plan - Admin Clients Enhancements

Add sorting options (Name vs. Recent) and display the total number of registered clients in the Admin Clients tab.

## User Review Required

> [!IMPORTANT]
> None identified.

## Proposed Changes

### Admin Interface

#### [src/components/admin/AdminClients.tsx]
- Add a new state variable `sortBy` with options `'name'` or `'recent'`.
- Add a sorting toggle UI (likely a dropdown or segmented control) next to the view mode toggle.
- Update the initial Supabase query or client-side sorting logic to handle both "A-Z" (default) and "Recent" (by `created_at`).
- Add a "Total Clientes" badge or text in the header to show the absolute count of registered profiles.
- Refine the existing "found clients" text to clearly distinguish between total and filtered results.

## Technical Details
- Use `order('created_at', { ascending: false })` for the "Recent" sort option.
- Ensure the total count is calculated from the `clients` array length to avoid extra database calls if already fetching all.

## Constraints & Assumptions
- Assumes the `profiles` table has a `created_at` column (standard in this project).
- Assumes mobile responsiveness is required for the new sort controls.
