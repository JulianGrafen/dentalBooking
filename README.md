# teeth.al

Termin- und Praxis-Management-SaaS für Zahnarztpraxen.

**Stack:** Next.js (App Router) · Supabase (Auth, Postgres + RLS, Edge Functions, pg_cron) · Tailwind CSS 4 · shadcn/ui

## Features (MVP)

| Feature | Umsetzung |
| --- | --- |
| Multi-Tenancy | Jede Tabelle trägt `practice_id`; strikte RLS-Policies (`practice_id = auth.uid()`) |
| Online-Buchung | `/book/[practiceId]` — 3-Schritt-Wizard (Versicherung → Behandlung → Termin) |
| Recall-Engine | Edge Function `recall-engine`, täglich via pg_cron; erinnert Patienten 6 Monate nach dem letzten Besuch |
| Smart-Fill | Edge Function `smart-fill`, ausgelöst per DB-Trigger bei kurzfristigen Absagen (< 48 h); benachrichtigt Wartelisten-Patienten |
| Dashboard | `/dashboard` — heutige Termine + Metriken (Recall-Buchungen, Smart-Fill-Lücken) |

## Setup

### 1. Environment

```bash
cp .env.example .env.local
# NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY eintragen
```

### 2. Datenbank

```bash
supabase link --project-ref <project-ref>
supabase db push          # führt supabase/migrations/*.sql aus
```

Vor den Migrationen 2 + 3 einmalig Vault-Secrets anlegen (SQL-Editor):

```sql
select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
select vault.create_secret('<anon-key>', 'anon_key');
select vault.create_secret('<random-secret-1>', 'recall_cron_secret');
select vault.create_secret('<random-secret-2>', 'smart_fill_webhook_secret');
```

### 3. Edge Functions

```bash
supabase secrets set RECALL_CRON_SECRET=<random-secret-1>
supabase secrets set SMART_FILL_WEBHOOK_SECRET=<random-secret-2>
supabase functions deploy recall-engine
supabase functions deploy smart-fill
```

### 4. Entwicklung

```bash
npm install
npm run dev
```

## Architektur-Notizen

- **Tenancy-Modell:** Ein Auth-User == eine Praxis (`practices.id` == `auth.users.id`). Ein Signup-Trigger provisioniert die Praxis-Zeile automatisch. Für Multi-Staff später: `practice_members`-Tabelle + Policy-Prädikat tauschen.
- **Öffentliche Buchung:** Anonyme Patienten kommen durch RLS bewusst nicht durch. Die Buchung läuft über eine Server Action mit Service-Role-Client und strikter zod-Validierung an der Systemgrenze (`app/book/[practiceId]/actions.ts`).
- **Types:** `types/database.ts` spiegelt die Migrationen im Format von `supabase gen types typescript` — nach dem Linken des Projekts einfach regenerieren.
- **E-Mail-Versand:** Im MVP simuliert (`console.log` in den Edge Functions); Austauschpunkt für Resend & Co. ist markiert.
