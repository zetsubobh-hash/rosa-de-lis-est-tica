# Project rules

- PWA/app icons are local fixed files in `public/icons/` referenced by `vite.config.ts` manifest and `index.html` apple-touch-icon; never point them at remote storage — any remote change makes Android regenerate the installed icon. When icon artwork changes, use new filenames (version suffix) and keep a full-bleed `maskable` set so launchers never add a white plate.
- Agenda client directories use the shared paginated loader and normalized name matcher in `src/lib/agendaClients.ts`; requests above PostgREST's row cap silently omit clients, and accent-sensitive filtering hides valid matches.
- Client cleanup controls use separate admin-checked invoker RPCs for whitespace/emoji cleanup and leading punctuation cleanup, respecting profile protections and skipping empty results; separate actions preserve punctuation elsewhere, and technical maintenance belongs in System Health.
- The admin Clients tab searches through `search_admin_clients` before pagination with normalized name tokens; filtering only the visible page omits otherwise valid matches.
- Client name search normalizes compatibility lettering and leading cleanup punctuation without rewriting stored names; cleanup resets search/page so renamed clients do not appear deleted.
- Agenda autocomplete uses `useAgendaClientSearch` and the invoker RPC `search_agenda_clients` on every input change/open; search precedes result limits and must not use a stale in-memory directory after profile edits.
- Agenda phone search normalizes punctuation server-side before result limits, is restricted to admins, and returns only client IDs/names to preserve partner contact restrictions.
- Partner financial resets require server-side admin role and password reauthentication; a service-only atomic RPC clears payments and zeroes salary/commission without touching clinical or account data.
