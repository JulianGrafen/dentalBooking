-- Smart-Fill webhook must not block appointment cancellations when vault secrets
-- are missing (local dev) or pg_net is unavailable.

create or replace function public.notify_smart_fill()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_url text;
  anon_key text;
  webhook_secret text;
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    select ds.decrypted_secret
    into project_url
    from vault.decrypted_secrets ds
    where ds.name = 'project_url'
    limit 1;

    select ds.decrypted_secret
    into anon_key
    from vault.decrypted_secrets ds
    where ds.name = 'anon_key'
    limit 1;

    select ds.decrypted_secret
    into webhook_secret
    from vault.decrypted_secrets ds
    where ds.name = 'smart_fill_webhook_secret'
    limit 1;

    if project_url is not null
      and anon_key is not null
      and webhook_secret is not null then
      perform net.http_post(
        url := project_url || '/functions/v1/smart-fill',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || anon_key,
          'X-Webhook-Secret', webhook_secret
        ),
        body := jsonb_build_object(
          'type', 'UPDATE',
          'table', 'appointments',
          'schema', 'public',
          'record', to_jsonb(new),
          'old_record', to_jsonb(old)
        )
      );
    end if;
  end if;

  return new;
end;
$$;
