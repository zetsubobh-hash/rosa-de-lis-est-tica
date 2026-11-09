# Project rules

- PWA/app icons are local fixed files in `public/icons/` referenced by `vite.config.ts` manifest and `index.html` apple-touch-icon; never point them at remote storage — any remote change makes Android regenerate the installed icon. When icon artwork changes, use new filenames (version suffix) and keep a full-bleed `maskable` set so launchers never add a white plate.
- Agenda client directories use the shared paginated loader and normalized name matcher in `src/lib/agendaClients.ts`; requests above PostgREST's row cap silently omit clients, and accent-sensitive filtering hides valid matches.
- Client cleanup controls call admin-checked RPCs: technical maintenance never mutates operational records, and name cleanup uses invoker privileges to respect profile protections and skips names that would become empty.
- The admin Clients tab searches through `search_admin_clients` before pagination with normalized name tokens; filtering only the visible page omits otherwise valid matches.
- Agenda autocomplete uses `useAgendaClientSearch` and the invoker RPC `search_agenda_clients` on every input change/open; search precedes result limits and must not use a stale in-memory directory after profile edits.
