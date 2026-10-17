-- Additive Guest & Travel Planner. Requires 001–003; does not reset invitation data.
begin;
alter table public.weddings add column name text not null default '';

create table public.wedding_members (
 wedding_id uuid not null references public.weddings on delete cascade,
 user_id uuid not null references auth.users on delete cascade,
 role text not null check (role in ('owner','bride_planner','groom_planner')),
 created_at timestamptz not null default now(), primary key(wedding_id,user_id)
);
create unique index planner_one_owner on public.wedding_members(wedding_id) where role='owner';
create index planner_members_user on public.wedding_members(user_id,wedding_id);
-- Activate planner ownership for existing weddings without changing their contents.
insert into public.wedding_members(wedding_id,user_id,role) select id,owner_id,'owner' from public.weddings;

-- New weddings created through the existing invitation app also become available.
create function public.planner_seed_owner() returns trigger language plpgsql security definer set search_path='' as $$ begin
 insert into public.wedding_members(wedding_id,user_id,role) values(new.id,new.owner_id,'owner') on conflict do nothing;
 return new;
end $$;
create trigger planner_seed_owner after insert on public.weddings for each row execute function public.planner_seed_owner();

create function public.planner_role(wid uuid) returns text language sql stable security definer set search_path='' as $$
 select m.role from public.wedding_members m join public.weddings w on w.id=m.wedding_id
 where m.wedding_id=wid and m.user_id=auth.uid()
 and ((m.role='owner' and w.owner_id=auth.uid()) or m.role in ('bride_planner','groom_planner'))
$$;
create function public.planner_can_write(wid uuid, family_side text) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(public.planner_role(wid) in ('owner',family_side||'_planner'),false)
$$;

create table public.families (
 id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings on delete cascade,
 side text not null check(side in ('bride','groom')), family_name text not null check(length(trim(family_name)) between 1 and 120),
 contact_name text not null default '' check(length(contact_name)<=120), contact_phone text not null default '' check(length(contact_phone)<=30),
 rsvp_status text not null default 'pending' check(rsvp_status in ('pending','confirmed','declined')),
 accommodation_required boolean not null default false,
 notes text not null default '' check(length(notes)<=2000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), revision int not null default 1,
 unique(wedding_id,id)
);
create index planner_families_wedding_side on public.families(wedding_id,side);
create function public.planner_family_write(wid uuid, fid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.families f where f.wedding_id=wid and f.id=fid and public.planner_can_write(wid,f.side))
$$;
create table public.family_members (
 id uuid primary key default gen_random_uuid(), wedding_id uuid not null, family_id uuid not null,
 full_name text not null check(length(trim(full_name)) between 1 and 120), category text not null default 'adult' check(category in ('adult','child')),
 rsvp_status text not null default 'pending' check(rsvp_status in ('pending','confirmed','declined')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), revision int not null default 1,
 foreign key(wedding_id,family_id) references public.families(wedding_id,id) on delete cascade
);
create index planner_people_family on public.family_members(wedding_id,family_id);
create table public.travel_groups (
 id uuid primary key default gen_random_uuid(), wedding_id uuid not null, family_id uuid not null,
 transport_mode text not null check(transport_mode in ('flight','train','bus','car','other')),
 origin text not null default '' check(length(origin)<=160), destination text not null default '' check(length(destination)<=160),
 operator_name text not null default '' check(length(operator_name)<=120), transport_number text not null default '' check(length(transport_number)<=80),
 arrival_datetime timestamptz, departure_datetime timestamptz,
 terminal_or_station text not null default '' check(length(terminal_or_station)<=160),
 passenger_count int not null default 1 check(passenger_count between 1 and 1000), luggage_count int not null default 0 check(luggage_count between 0 and 1000),
 pickup_required boolean not null default false, notes text not null default '' check(length(notes)<=2000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), revision int not null default 1,
 foreign key(wedding_id,family_id) references public.families(wedding_id,id) on delete cascade, unique(wedding_id,id),
 check(departure_datetime is null or arrival_datetime is null or departure_datetime>=arrival_datetime)
);
create index planner_travel_arrival on public.travel_groups(wedding_id,arrival_datetime);
create index planner_travel_family on public.travel_groups(wedding_id,family_id);
create table public.logistics_assignments (
 id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings on delete cascade,
 travel_group_id uuid, assignment_type text not null check(assignment_type in ('pickup','accommodation')),
 status text not null default 'needed' check(status in ('needed','assigned','completed')),
 vehicle text not null default '' check(length(vehicle)<=120), driver_name text not null default '' check(length(driver_name)<=120), driver_phone text not null default '' check(length(driver_phone)<=30),
 pickup_datetime timestamptz, hotel_name text not null default '' check(length(hotel_name)<=160),
 check_in date, check_out date, room_count int not null default 0 check(room_count between 0 and 1000),
 notes text not null default '' check(length(notes)<=2000), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), revision int not null default 1,
 foreign key(wedding_id,travel_group_id) references public.travel_groups(wedding_id,id) on delete cascade,
 check(check_out is null or check_in is null or check_out>=check_in),
 check(assignment_type<>'pickup' or travel_group_id is not null),
 check(status='needed' or (assignment_type='pickup' and length(trim(vehicle))>0 and length(trim(driver_name))>0 and pickup_datetime is not null) or (assignment_type='accommodation' and length(trim(hotel_name))>0 and check_in is not null and check_out is not null and room_count>0))
);
create index planner_assignments_wedding on public.logistics_assignments(wedding_id,assignment_type);
create index planner_assignments_travel on public.logistics_assignments(wedding_id,travel_group_id);
create unique index planner_one_pickup on public.logistics_assignments(travel_group_id) where assignment_type='pickup';

-- Identity/parent changes are disallowed. Updates always advance the concurrency token.
create function public.planner_stamp() returns trigger language plpgsql set search_path='' as $$ begin
 if new.id<>old.id or new.wedding_id<>old.wedding_id or new.created_at<>old.created_at then raise exception 'Record identity cannot change'; end if;
 if tg_table_name='families' then
  if new.side<>old.side then raise exception 'Family side cannot change'; end if;
 elsif tg_table_name in ('family_members','travel_groups') then
  if new.family_id<>old.family_id then raise exception 'Family cannot change'; end if;
 elsif tg_table_name='logistics_assignments' then
  if new.travel_group_id is distinct from old.travel_group_id or new.assignment_type<>old.assignment_type then raise exception 'Assignment target cannot change'; end if;
 end if;
 new.updated_at:=clock_timestamp(); new.revision:=old.revision+1; return new;
end $$;

do $$ declare t text; begin
 foreach t in array array['families','family_members','travel_groups','logistics_assignments'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy planner_read on public.%I for select to authenticated using(public.planner_role(wedding_id) is not null)',t);
  execute format('create trigger planner_stamp before update on public.%I for each row execute function public.planner_stamp()',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 end loop;
end $$;
create policy family_insert on public.families for insert to authenticated with check(public.planner_can_write(wedding_id,side));
create policy family_update on public.families for update to authenticated using(public.planner_can_write(wedding_id,side)) with check(public.planner_can_write(wedding_id,side));
create policy family_delete on public.families for delete to authenticated using(public.planner_can_write(wedding_id,side));
do $$ declare t text; begin
 foreach t in array array['family_members','travel_groups'] loop
  execute format('create policy side_insert on public.%I for insert to authenticated with check(public.planner_family_write(wedding_id,family_id))',t);
  execute format('create policy side_update on public.%I for update to authenticated using(public.planner_family_write(wedding_id,family_id)) with check(public.planner_family_write(wedding_id,family_id))',t);
  execute format('create policy side_delete on public.%I for delete to authenticated using(public.planner_family_write(wedding_id,family_id))',t);
 end loop;
end $$;
create policy shared_insert on public.logistics_assignments for insert to authenticated with check(public.planner_role(wedding_id) is not null);
create policy shared_update on public.logistics_assignments for update to authenticated using(public.planner_role(wedding_id) is not null) with check(public.planner_role(wedding_id) is not null);
create policy shared_delete on public.logistics_assignments for delete to authenticated using(public.planner_role(wedding_id) is not null);
alter table public.wedding_members enable row level security;
create policy member_read on public.wedding_members for select to authenticated using(public.planner_role(wedding_id) is not null);
revoke all on public.wedding_members from anon,authenticated;
grant select on public.wedding_members to authenticated;

-- Invitation tokens are random UUID-pair secrets (244 random bits); store only their SHA-256 hashes.
create table public.planner_invitations (
 id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings on delete cascade,
 email text not null check(length(email)<=254 and position('@' in email)>1),
 role text not null check(role in ('bride_planner','groom_planner')), token_hash bytea not null unique,
 expires_at timestamptz not null default now()+interval '7 days', accepted_at timestamptz, created_at timestamptz not null default now()
);
create index planner_invites_wedding on public.planner_invitations(wedding_id);
alter table public.planner_invitations enable row level security;
create policy invitation_owner_read on public.planner_invitations for select to authenticated using(public.planner_role(wedding_id)='owner');
revoke all on public.planner_invitations from anon,authenticated;
grant select(id,wedding_id,email,role,expires_at,accepted_at,created_at) on public.planner_invitations to authenticated;

create function public.planner_workspaces() returns table(id uuid,name text,wedding_date date,venue text,role text) language sql stable security definer set search_path='' as $$
 select w.id,coalesce(nullif(w.name,''),w.bride||' & '||w.groom),w.wedding_date,w.venue,m.role
 from public.weddings w join public.wedding_members m on m.wedding_id=w.id and m.user_id=auth.uid()
 where public.planner_role(w.id) is not null order by w.created_at
$$;
create function public.planner_create_workspace(workspace_name text, on_date date, at_venue text) returns uuid language plpgsql security definer set search_path='' as $$
declare wid uuid; begin
 if auth.uid() is null then raise exception 'Sign in first' using errcode='42501'; end if;
 if length(trim(workspace_name)) not between 1 and 120 or length(trim(at_venue)) not between 1 and 160 or on_date is null then raise exception 'Enter wedding name, date and venue'; end if;
 insert into public.weddings(name,owner_id,bride,groom,wedding_date,city,venue,rsvp_contact,plan)
 values(trim(workspace_name),auth.uid(),'Bride','Groom',on_date,'',trim(at_venue),'','small') returning id into wid;
 return wid;
end $$;
create function public.planner_invite(wid uuid, invite_email text, invite_role text) returns text language plpgsql security definer set search_path='' as $$
declare token text; begin
 if public.planner_role(wid) is distinct from 'owner' then raise exception 'Only the workspace owner can invite planners' using errcode='42501'; end if;
 if invite_role not in ('bride_planner','groom_planner') or length(trim(invite_email))>254 or position('@' in invite_email)<2 then raise exception 'Enter a valid email and planner role'; end if;
 token:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');
 insert into public.planner_invitations(wedding_id,email,role,token_hash) values(wid,lower(trim(invite_email)),invite_role,sha256(convert_to(token,'UTF8')));
 return token;
end $$;
create function public.planner_accept_invite(token text) returns uuid language plpgsql security definer set search_path='' as $$
declare inv public.planner_invitations; account_email text; begin
 select lower(email) into account_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if account_email is null then raise exception 'Sign in with a verified email first' using errcode='42501'; end if;
 select * into inv from public.planner_invitations where token_hash=sha256(convert_to(token,'UTF8')) for update;
 if inv.id is null or inv.accepted_at is not null or inv.expires_at<=now() or inv.email<>account_email then raise exception 'Invitation is invalid, expired, used or intended for another email' using errcode='42501'; end if;
 if exists(select 1 from public.wedding_members where wedding_id=inv.wedding_id and user_id=auth.uid()) then raise exception 'Already a workspace member. Owner must remove the old membership before changing role'; end if;
 -- Reject invitations after the planner workspace was removed.
 if not exists(select 1 from public.wedding_members where wedding_id=inv.wedding_id and role='owner') then raise exception 'Workspace no longer available'; end if;
 insert into public.wedding_members(wedding_id,user_id,role) values(inv.wedding_id,auth.uid(),inv.role);
 update public.planner_invitations set accepted_at=now() where id=inv.id; return inv.wedding_id;
end $$;
create function public.planner_remove_member(wid uuid, member_id uuid) returns void language plpgsql security definer set search_path='' as $$ begin
 if public.planner_role(wid) is distinct from 'owner' then raise exception 'Only the owner can remove members' using errcode='42501'; end if;
 delete from public.wedding_members where wedding_id=wid and user_id=member_id and role<>'owner';
end $$;
create function public.planner_revoke_invite(wid uuid, invite_id uuid) returns void language plpgsql security definer set search_path='' as $$ begin
 if public.planner_role(wid) is distinct from 'owner' then raise exception 'Only the owner can revoke invitations' using errcode='42501'; end if;
 delete from public.planner_invitations where wedding_id=wid and id=invite_id and accepted_at is null;
end $$;
create function public.planner_delete_workspace(wid uuid) returns void language plpgsql security definer set search_path='' as $$ begin
 if public.planner_role(wid) is distinct from 'owner' then raise exception 'Only the owner can delete the planner workspace' using errcode='42501'; end if;
 delete from public.logistics_assignments where wedding_id=wid;
 delete from public.families where wedding_id=wid;
 delete from public.planner_invitations where wedding_id=wid;
 delete from public.wedding_members where wedding_id=wid;
 -- Keep existing invitation wedding/events/guests/media intact.
end $$;
-- Deny default PUBLIC execution for every new helper and RPC.
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'planner_%' loop
  execute format('revoke all on function %s from public,anon',f.signature);
  execute format('grant execute on function %s to authenticated',f.signature);
 end loop;
end $$;
commit;
