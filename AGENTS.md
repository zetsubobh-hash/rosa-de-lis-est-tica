# Project rules

- PWA/app icons are local fixed files in `public/icons/` referenced by `vite.config.ts` manifest and `index.html` apple-touch-icon; never point them at remote storage — any remote change makes Android regenerate the installed icon. When icon artwork changes, use new filenames (version suffix) and keep a full-bleed `maskable` set so launchers never add a white plate.
- Agenda client directories use the shared paginated loader and normalized name matcher in `src/lib/agendaClients.ts`; requests above PostgREST's row cap silently omit clients, and accent-sensitive filtering hides valid matches.
- Client cleanup controls use separate admin-checked invoker RPCs for whitespace/emoji cleanup and leading punctuation cleanup, respecting profile protections and skipping empty results; separate actions preserve punctuation elsewhere, and technical maintenance belongs in System Health.
- The admin Clients tab searches through `search_admin_clients` before pagination with normalized name tokens; filtering only the visible page omits otherwise valid matches.
- Client name search normalizes compatibility lettering and leading cleanup punctuation without rewriting stored names; cleanup resets search/page so renamed clients do not appear deleted.
- Agenda autocomplete uses `useAgendaClientSearch` and the invoker RPC `search_agenda_clients` on every input change/open; search precedes result limits and must not use a stale in-memory directory after profile edits.
- Agenda phone search normalizes punctuation server-side before result limits, is restricted to admins, and returns only client IDs/names to preserve partner contact restrictions.
- Partner financial resets require server-side admin role and password reauthentication; a service-only atomic RPC clears payments and zeroes salary/commission without touching clinical or account data.
- Room capacity is enforced by the appointments BEFORE trigger (auto-assigns the lowest free room up to site_settings.treatment_rooms, 1-10) plus a unique (date,time,room) index; partner double-booking stays blocked by its own index, so clients never pick rooms themselves.
- WhatsApp booking bot lives in the `whatsapp-bot` edge function (Evolution webhook, secret token in query) and reads active services live from the database; never hardcode the service catalog in the bot prompt.
- Partner agenda and admin mirror use the shared paginated appointment loader without professional/date exclusions; client labels use the restricted RPC rather than widening profile access, preserving private contacts.
- DayTimelineView requires an onToday callback wired to the parent date filter; compute the local day at click time so Today changes the displayed date, including after midnight.
- lis-assistant edge function answers staff app questions with a guide prompt kept in the function; update that guide when app features change.
- Roulette ticket mutations use the existing admin-only coupons RLS and verify returned row IDs before reporting success; bulk deletion targets explicitly selected IDs only.
- The Prêmios da Roleta tab reuses the welcome roulette editor and its existing payment_settings key; wheel numbers follow item order so editor and client wheel stay aligned without duplicate configurations.
- Roulette client history reads paginated profiles and existing BV-/ANIV- coupons without mutations; grouping preserves unsuccessful spins but excludes them from prize and redemption totals.
- iPhone installation uses the shared IphoneInstallGuide and browser-context detection, including desktop-mode iPads; show Safari handoff instead of claiming automatic installation or programmatic Safari launch.
- Client loyalty rewards are issued only by the `claim_loyalty_reward` RPC from completed appointments (FID- coupons); clients cannot insert coupons directly.
