-- ============================================================================
-- teeth.al — Fix ambiguous ON CONFLICT in invite acceptance
-- ============================================================================

create or replace function public.accept_practice_invite(invite_token uuid)
returns table(practice_id uuid, role public.practice_role)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  actor_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  invite_row public.practice_invites%rowtype;
begin
  if actor is null then
    raise exception 'not authenticated';
  end if;

  select *
  into invite_row
  from public.practice_invites pi
  where pi.token = invite_token
    and pi.accepted_at is null
    and pi.expires_at > now();

  if invite_row.id is null then
    raise exception 'invite not found or expired';
  end if;

  if lower(invite_row.email) <> actor_email then
    raise exception 'invite email does not match signed-in user';
  end if;

  insert into public.practice_members (practice_id, user_id, member_email, role)
  values (invite_row.practice_id, actor, actor_email, invite_row.role)
  on conflict on constraint practice_members_pkey
  do update set role = excluded.role, member_email = excluded.member_email;

  update public.practice_invites
  set accepted_at = now()
  where id = invite_row.id;

  return query select invite_row.practice_id, invite_row.role;
end;
$$;

revoke execute on function public.accept_practice_invite(uuid) from public, anon;
grant execute on function public.accept_practice_invite(uuid) to authenticated;
