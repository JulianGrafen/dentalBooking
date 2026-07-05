-- ============================================================================
-- teeth.al — Recall Engine Scheduling
--
-- Invokes the 'recall-engine' Edge Function daily at 08:00 via pg_cron
-- + pg_net (async HTTP from Postgres).
--
-- NOTE: pg_cron on Supabase runs in UTC. '0 8 * * *' means 08:00 UTC
-- (= 09:00/10:00 in Europe/Berlin). For 08:00 Berlin time use
-- '0 6 * * *' (CEST) — adjust to your needs.
--
-- Secrets are read from Supabase Vault instead of being hardcoded here.
-- Before running this migration, create them once:
--
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<anon-key>',   'anon_key');
--   select vault.create_secret('<random-long-secret>', 'recall_cron_secret');
--
-- and set the same secret on the Edge Function:
--
--   supabase secrets set RECALL_CRON_SECRET=<random-long-secret>
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'invoke-recall-engine-daily',
  '0 8 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/recall-engine',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      -- Satisfies the platform JWT check on the function endpoint.
      'Authorization', 'Bearer ' ||
        (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key'),
      -- Actual invocation gate, verified inside the function.
      'X-Cron-Secret',
        (select decrypted_secret from vault.decrypted_secrets where name = 'recall_cron_secret')
    ),
    body := jsonb_build_object('invoked_at', now())
  );
  $$
);
