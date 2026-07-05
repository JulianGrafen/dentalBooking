-- ============================================================================
-- teeth.al — Smart-Fill Database Webhook
--
-- Fires the 'smart-fill' Edge Function whenever an appointment transitions
-- into 'cancelled'. The transition check lives here (cheap, avoids useless
-- HTTP calls); the 48h business rule lives in the function (testable).
--
-- Secrets (Supabase Vault) — create once before running this migration:
--
--   select vault.create_secret('<random-long-secret>', 'smart_fill_webhook_secret');
--
-- ('project_url' and 'anon_key' were already created for the recall engine.)
--
-- And set the same secret on the Edge Function:
--
--   supabase secrets set SMART_FILL_WEBHOOK_SECRET=<random-long-secret>
-- ============================================================================

create function public.notify_smart_fill()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only the transition INTO 'cancelled' is relevant; ignore all other updates.
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    perform net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
             || '/functions/v1/smart-fill',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' ||
          (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key'),
        'X-Webhook-Secret',
          (select decrypted_secret from vault.decrypted_secrets where name = 'smart_fill_webhook_secret')
      ),
      -- Standard Supabase webhook payload shape.
      body := jsonb_build_object(
        'type', 'UPDATE',
        'table', 'appointments',
        'schema', 'public',
        'record', to_jsonb(new),
        'old_record', to_jsonb(old)
      )
    );
  end if;

  return new;
end;
$$;

create trigger on_appointment_cancelled
  after update of status on public.appointments
  for each row
  execute function public.notify_smart_fill();
