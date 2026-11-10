<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Roles live in `public.user_roles` (terapeuta/secretaria); first signup becomes terapeuta via DB trigger. Why: avoids privilege escalation via profile data.
- Clinical notes are a separate table readable only by terapeuta (RLS). Why: reception must never see clinical content.
- Clinic defaults (duration, price, reminder lead time) live in `src/lib/clinic.ts`. Why: one source for UI and future reminders.
- Private pages require a signed-in account that also holds a clinic role in `user_roles`; the `_authenticated` gate signs out role-less accounts and exposes `role` in route context for page-level gates (e.g. Equipe = terapeuta only). Why: a valid login alone must never open the system.
- Session overlap is blocked by a DB trigger (ignores `cancelada`, raises 23P01 with the patient name); finance rules (`summarize`/`isBillable`) and phone rules (`src/lib/phone.ts`, stored as 55+digits) are unit-tested. Why: the database is the last line against bad data, and UI and tests share one rule source.
