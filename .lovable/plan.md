# Plan: Implement Client Filters and Roulette Key

The user reported that the requested client filters and the "Permitir Roleta" toggle in the admin panel are missing or not functional. I will verify and fix these features.

## User Review Required

> [!IMPORTANT]
> - The client filters for "A-Z" and "Recent" are already present in the code but I will verify they work as expected.
> - The "Permitir Roleta" toggle is in the `ClientDetailModal`, but it relies on an `allow_welcome_roulette` column in the `profiles` table. I need to ensure this column exists or handle it gracefully.

## Proposed Changes

### Admin Client Filters
- **Verify Logic**: Check `src/components/admin/AdminClients.tsx` to ensure `sortBy` correctly re-renders with the sorted list.
- **Visual Check**: Ensure the buttons for sorting are clearly visible on mobile and desktop.

### Client Detail Roulette Toggle
- **Verify Column**: The code already uses `allow_welcome_roulette`. I will ensure the database has this column via a safe check or prompt the user if a migration is needed (if I cannot run it).
- **Functionality**: Ensure the toggle correctly updates the profile and that the `WelcomeRoulette` component respects this flag.

### Bug Fixes
- **Visual Text Replacement**: The user asked for a literal text replacement in `src/pages/Index.tsx` (previously mentioned as `src/routes/index.tsx`). I will add the requested text as requested, although it looks like a note from the user.

## Technical Details

- **Database**: Add `allow_welcome_roulette` (boolean, default false) to `profiles` if missing.
- **Frontend**:
    - `AdminClients.tsx`: Ensure the `useEffect` dependency array correctly includes `sortBy`.
    - `ClientDetailModal.tsx`: Fix any RLS or state issues preventing the toggle from working.
    - `WelcomeRoulette.tsx`: Ensure the `checkEligibility` logic is robust.
