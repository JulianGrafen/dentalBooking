# teeth.al

Termin- und Praxis-Management-SaaS für Zahnarztpraxen.

**Stack:** Next.js (App Router) · Supabase (Auth, Postgres + RLS, Edge Functions, pg_cron) · Tailwind CSS 4 · shadcn/ui · tweetnacl (E2EE)

## Features (MVP)

| Feature | Umsetzung |
| --- | --- |
| Multi-Tenancy | Jede Tabelle trägt `practice_id`; strikte RLS-Policies (`practice_id = auth.uid()`) |
| Zero-Knowledge Buchung | `/book/[slug]` — Patientendaten werden im Browser verschlüsselt; Supabase sieht nur Ciphertext |
| E2EE Auth | `/register` generiert Keypair; Private Key nur im Browser + Recovery-Datei |
| Recall-Engine | Edge Function `recall-engine`, täglich via pg_cron |
| Smart-Fill | Edge Function `smart-fill`, DB-Trigger bei kurzfristigen Absagen |
| Dashboard | `/dashboard` — entschlüsselte Termine, Buchungslink, Metriken |

## Schnellstart (lokal)

### Option A — Hosted Supabase (empfohlen, kein Docker)

1. Projekt anlegen: [supabase.com/dashboard](https://supabase.com/dashboard)
2. **Authentication → Providers → Email:** „Confirm email" für Dev deaktivieren
3. Credentials setzen:

```bash
npm install
npm run setup -- https://DEIN-PROJEKT.supabase.co eyJ...anon-key...
npm run db:push    # nach `npx supabase login` + `npx supabase link`
npm run dev
```

4. Öffnen: [http://localhost:3000/register](http://localhost:3000/register)

### Option B — Lokales Supabase (Colima + Docker CLI)

```bash
brew install colima docker
colima start --cpu 2 --memory 4
npm install
npm run db:start      # Migrationen werden automatisch angewendet
npm run setup:local   # schreibt .env.local
npm run dev
```

Studio: [http://127.0.0.1:54323](http://127.0.0.1:54323) · Mailpit: [http://127.0.0.1:54324](http://127.0.0.1:54324)

> **Hinweis:** Analytics ist in `supabase/config.toml` deaktiviert (`[analytics] enabled = false`), damit der Stack unter Colima stabil startet.

## Routen

| Route | Beschreibung |
| --- | --- |
| `/` | Landing |
| `/register` | Praxis registrieren + Keypair + Recovery-Download |
| `/login` | Login → Dashboard oder `/unlock` |
| `/unlock` | Private Key wiederherstellen (neues Gerät) |
| `/dashboard` | Praxis-Dashboard (Termine entschlüsselt im Browser) |
| `/book/[slug]` | Öffentliche Patienten-Buchung (E2EE) |

## Datenbank & Edge Functions

Migrationen liegen in `supabase/migrations/`. Für Recall/Smart-Fill Cron-Jobs zusätzlich Vault-Secrets (siehe Migrationen 0002/0003).

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npm run db:push
npx supabase functions deploy recall-engine
npx supabase functions deploy smart-fill
```

## Architektur-Notizen

- **Tenancy:** Ein Auth-User == eine Praxis. Signup-Trigger provisioniert `practices` inkl. Slug.
- **Zero-Knowledge:** `appointments.encrypted_payload` ist Ciphertext; `practices.public_key` ist öffentlich lesbar für anon.
- **Private Key:** Nie an Supabase — nur `localStorage` + Recovery-Datei.
- **Types:** `types/database.ts` — regenerieren mit `npx supabase gen types typescript --linked`.
