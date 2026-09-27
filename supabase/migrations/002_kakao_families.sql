-- Run after 001_initial.sql. Existing household/member/payroll IDs are retained.
begin;
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(display_name) between 1 and 20),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.members add column auth_user_id uuid references auth.users(id) on delete set null;
alter table public.members alter column pin_hash drop not null;
alter table public.members drop constraint members_household_id_display_name_key;
create unique index members_household_user on public.members(household_id, auth_user_id);
create index members_auth_user on public.members(auth_user_id);
create table public.family_invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  sender_member_id uuid not null references public.members(id),
  recipient_user_id uuid references auth.users(id) on delete cascade,
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending','accepted','declined','revoked')),
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now()
);
alter table public.family_invitations enable row level security;
create index invitations_recipient on public.family_invitations(recipient_user_id);
grant all on public.profiles, public.family_invitations to service_role;
-- Data access remains server-only. No anon/authenticated RLS policies are added.
create function public.create_family(p_user uuid, p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_name text; v_house uuid; v_member uuid;
begin
  select display_name into v_name from public.profiles where id = p_user for update;
  if v_name is null then raise exception 'PROFILE_REQUIRED'; end if;
  if length(trim(p_name)) not between 1 and 30 then raise exception 'INVALID_NAME'; end if;
  insert into public.households(name) values (trim(p_name)) returning id into v_house;
  insert into public.members(household_id, auth_user_id, display_name, role)
    values(v_house, p_user, v_name, 'admin') returning id into v_member;
  insert into public.baby_status(household_id, updated_by) values(v_house, v_member);
  return v_house;
end $$;
create function public.claim_family_invite(p_user uuid, p_hash text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_inv public.family_invitations;
begin
  select * into v_inv from public.family_invitations where token_hash = p_hash for update;
  if not found or v_inv.status <> 'pending' or v_inv.expires_at <= now() then raise exception 'INVITE_UNAVAILABLE'; end if;
  if v_inv.recipient_user_id is not null and v_inv.recipient_user_id <> p_user then raise exception 'INVITE_UNAVAILABLE'; end if;
  if exists(select 1 from public.members where household_id = v_inv.household_id and auth_user_id = p_user) then raise exception 'ALREADY_MEMBER'; end if;
  if not exists(select 1 from public.members where id = v_inv.sender_member_id and active and role = 'admin') then raise exception 'INVITE_UNAVAILABLE'; end if;
  update public.family_invitations set recipient_user_id = p_user where id = v_inv.id;
  return v_inv.id;
end $$;
create function public.respond_family_invite(p_user uuid, p_invite uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare v_inv public.family_invitations; v_name text;
begin
  select display_name into v_name from public.profiles where id = p_user for update;
  if v_name is null then raise exception 'PROFILE_REQUIRED'; end if;
  select * into v_inv from public.family_invitations where id = p_invite for update;
  if not found or v_inv.recipient_user_id is distinct from p_user or v_inv.status <> 'pending' or v_inv.expires_at <= now() then raise exception 'INVITE_UNAVAILABLE'; end if;
  if p_accept then
    if not exists(select 1 from public.members where id = v_inv.sender_member_id and active and role = 'admin') then raise exception 'INVITE_UNAVAILABLE'; end if;
    if exists(select 1 from public.members where household_id = v_inv.household_id and auth_user_id = p_user and not active) then raise exception 'MEMBER_INACTIVE'; end if;
    insert into public.members(household_id, auth_user_id, display_name, role)
      values(v_inv.household_id, p_user, v_name, 'member')
      on conflict (household_id, auth_user_id) do nothing;
  end if;
  update public.family_invitations set status = case when p_accept then 'accepted' else 'declined' end where id = p_invite;
end $$;
revoke all on function public.create_family(uuid,text) from public, anon, authenticated;
revoke all on function public.claim_family_invite(uuid,text) from public, anon, authenticated;
revoke all on function public.respond_family_invite(uuid,uuid,boolean) from public, anon, authenticated;
grant execute on function public.create_family(uuid,text) to service_role;
grant execute on function public.claim_family_invite(uuid,text) to service_role;
grant execute on function public.respond_family_invite(uuid,uuid,boolean) to service_role;
commit;
