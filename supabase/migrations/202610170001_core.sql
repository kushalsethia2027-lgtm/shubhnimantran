-- Apply once through Supabase migrations. No provider secrets are stored here.
begin;
create extension if not exists pgcrypto;
create table public.profiles (id uuid primary key references auth.users on delete cascade, created_at timestamptz not null default now());
create table public.waitlist_signups (id uuid primary key default gen_random_uuid(), name text not null, phone text not null, email text not null unique, wedding_month text not null, guest_count int not null check(guest_count between 1 and 400), language text not null check(language in ('Hindi','Hinglish')), role text not null, founding_number bigint generated always as identity unique, created_at timestamptz not null default now());
create table public.weddings (id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users, bride text not null, groom text not null, wedding_date date not null, city text not null, venue text not null, rsvp_contact text not null, plan text not null check(plan in ('small','medium','grand')), notes text not null default '', tone text not null check(tone in ('traditional','warm','playful')) default 'warm', template text not null check(template in ('maroon','floral','royal','minimal')) default 'maroon', created_at timestamptz not null default now());
create index weddings_owner on public.weddings(owner_id);
create table public.wedding_events (id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings on delete cascade, name text not null, date date not null, venue text not null, unique(wedding_id,name), unique(wedding_id,id));
create table public.guests (id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings on delete cascade, guest_name text not null, relation text not null check(length(trim(relation))>0), language text not null check(language in ('Hindi','Hinglish')), whatsapp_number text not null check(whatsapp_number ~ '^\+[1-9][0-9]{7,14}$'), notes text not null default '', pronunciation text not null default '', messaging_consent boolean not null default false, opted_out boolean not null default false, unique(wedding_id,whatsapp_number), unique(wedding_id,id), created_at timestamptz not null default now());
create table public.guest_event_assignments (wedding_id uuid not null, guest_id uuid not null, event_id uuid not null, primary key(guest_id,event_id), foreign key(wedding_id,guest_id) references public.guests(wedding_id,id) on delete cascade, foreign key(wedding_id,event_id) references public.wedding_events(wedding_id,id) on delete cascade);
create table public.voice_recordings (id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings on delete cascade, speaker text not null, relationship text not null, storage_path text not null unique, mime_type text not null, duration int not null check(duration between 30 and 60), status text not null default 'stored' check(status in ('stored','deletion_requested','deleted','deletion_failed')), consent_status text not null default 'active' check(consent_status in ('active','revoked')), provider_voice_id text, provider_verified boolean not null default false, created_at timestamptz not null default now(), unique(wedding_id,id));
create table public.voice_consents (id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings, recording_id uuid not null references public.voice_recordings, actor_id uuid not null references auth.users, consent_text text not null, version text not null, action text not null check(action in ('granted','revoked')), created_at timestamptz not null default now());
create table public.invitation_scripts (id uuid primary key default gen_random_uuid(), wedding_id uuid not null, guest_id uuid not null unique, body text not null check(length(body) between 1 and 4000), pronunciation text not null default '', revision int not null default 1, sample boolean not null default false, approved_at timestamptz, source text not null check(source in ('manual','anthropic')), foreign key(wedding_id,guest_id) references public.guests(wedding_id,id) on delete cascade, unique(wedding_id,id));
create table public.sample_approvals (id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings, script_id uuid not null, revision int not null, actor_id uuid not null references auth.users, action text not null check(action in ('approved','rejected','edited')), created_at timestamptz not null default now());
create table public.jobs (id uuid primary key default gen_random_uuid(), wedding_id uuid not null, guest_id uuid not null, voice_id uuid, script_id uuid, script_revision int, kind text not null check(kind in ('video','delivery','deletion')), status text not null default 'queued' check(status in ('queued','generating_audio','rendering_video','ready','sending','submitted','delivered','read','failed','needs_review','cancelled')), idempotency_key text not null unique, provider_id text unique, scheduled_at timestamptz, claimed_at timestamptz, attempts int not null default 0, error text, approved_by uuid references auth.users, created_at timestamptz not null default now(), foreign key(wedding_id,guest_id) references public.guests(wedding_id,id) on delete cascade, foreign key(wedding_id,voice_id) references public.voice_recordings(wedding_id,id), foreign key(wedding_id,script_id) references public.invitation_scripts(wedding_id,id));
create index jobs_due on public.jobs(status,scheduled_at) where status='queued';
create table public.generated_assets (id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings, job_id uuid not null references public.jobs, storage_path text not null unique, kind text not null check(kind in ('audio','video')), created_at timestamptz not null default now());
create table public.delivery_events (id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings, job_id uuid not null references public.jobs, provider_event_id text not null unique, status text not null, created_at timestamptz not null default now());
create table public.deletion_requests (id uuid primary key default gen_random_uuid(), wedding_id uuid not null references public.weddings, recording_id uuid not null references public.voice_recordings, requested_by uuid not null references auth.users, status text not null default 'pending' check(status in ('pending','processing','completed','failed')), error text, completed_at timestamptz, created_at timestamptz not null default now());
create unique index one_pending_deletion on public.deletion_requests(recording_id) where status<>'completed';
create table public.audit_events (id uuid primary key default gen_random_uuid(), wedding_id uuid references public.weddings, actor_id uuid references auth.users, action text not null, entity_id uuid, created_at timestamptz not null default now());
create table public.rate_limits (key text primary key, window_start timestamptz not null, hits int not null);

create function public.owns_wedding(wid uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.weddings where id=wid and owner_id=auth.uid()) $$;
create function public.require_owner(wid uuid) returns void language plpgsql security definer set search_path=public as $$ begin if not public.owns_wedding(wid) then raise exception 'Wedding not found or access denied' using errcode='42501'; end if; end $$;
-- Only read access is exposed directly. All writes use constrained RPCs.
alter table public.profiles enable row level security;
create policy profile_read on public.profiles for select to authenticated using(id=auth.uid());
alter table public.weddings enable row level security;
create policy wedding_read on public.weddings for select to authenticated using(owner_id=auth.uid());
do $$ declare t text; begin foreach t in array array['wedding_events','guests','guest_event_assignments','voice_recordings','voice_consents','invitation_scripts','sample_approvals','jobs','generated_assets','delivery_events','deletion_requests','audit_events'] loop execute format('alter table public.%I enable row level security',t); execute format('create policy owner_read on public.%I for select to authenticated using(public.owns_wedding(wedding_id))',t); end loop; end $$;
alter table public.waitlist_signups enable row level security;
alter table public.rate_limits enable row level security;
revoke all on public.profiles,public.waitlist_signups,public.weddings,public.wedding_events,public.guests,public.guest_event_assignments,public.voice_recordings,public.voice_consents,public.invitation_scripts,public.sample_approvals,public.jobs,public.generated_assets,public.delivery_events,public.deletion_requests,public.audit_events,public.rate_limits from anon, authenticated;
grant select on public.profiles,public.weddings,public.wedding_events,public.guests,public.guest_event_assignments,public.voice_recordings,public.voice_consents,public.invitation_scripts,public.sample_approvals,public.jobs,public.generated_assets,public.delivery_events,public.deletion_requests,public.audit_events to authenticated;

create function public.save_wedding(payload jsonb, wid uuid default null) returns uuid language plpgsql security definer set search_path=public as $$
declare eid uuid; ev jsonb; result uuid; begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if wid is null then
 insert into public.weddings(owner_id,bride,groom,wedding_date,city,venue,rsvp_contact,plan,notes,tone,template) values(auth.uid(),payload->>'bride',payload->>'groom',(payload->>'wedding_date')::date,payload->>'city',payload->>'venue',payload->>'rsvp_contact',payload->>'plan',coalesce(payload->>'notes',''),coalesce(payload->>'tone','warm'),coalesce(payload->>'template','maroon')) returning id into result;
 else
 perform public.require_owner(wid); perform 1 from public.weddings where id=wid for update; result:=wid;
 if exists(select 1 from public.jobs where wedding_id=wid and status not in ('cancelled','failed')) then raise exception 'Wedding is locked while production or delivery exists'; end if;
 if (select count(*) from public.guests where wedding_id=wid)>(case payload->>'plan' when 'small' then 50 when 'medium' then 150 else 400 end) then raise exception 'Guest count exceeds selected category'; end if;
 update public.weddings set bride=payload->>'bride',groom=payload->>'groom',wedding_date=(payload->>'wedding_date')::date,city=payload->>'city',venue=payload->>'venue',rsvp_contact=payload->>'rsvp_contact',plan=payload->>'plan',notes=coalesce(payload->>'notes',''),tone=payload->>'tone',template=payload->>'template' where id=wid;
 -- Scripts refer to event details, so changing wedding information requires fresh wording and approval.
 delete from public.invitation_scripts where wedding_id=wid;
 end if;
 if coalesce(jsonb_array_length(payload->'events'),0) not between 1 and 12 then raise exception 'Add 1–12 events'; end if;
 for ev in select * from jsonb_array_elements(payload->'events') loop
 eid:=coalesce((ev->>'id')::uuid,gen_random_uuid());
 if exists(select 1 from public.wedding_events where id=eid and wedding_id<>result) then raise exception 'Invalid event'; end if;
 insert into public.wedding_events(id,wedding_id,name,date,venue) values(eid,result,ev->>'name',(ev->>'date')::date,ev->>'venue') on conflict(id) do update set name=excluded.name,date=excluded.date,venue=excluded.venue;
 end loop;
 -- Removing an assigned event is blocked instead of silently changing guest invitations.
 if exists(select 1 from public.guest_event_assignments where wedding_id=result and event_id not in(select (x->>'id')::uuid from jsonb_array_elements(payload->'events') x where x ? 'id')) then raise exception 'Remove guest assignments before deleting an event'; end if;
 delete from public.wedding_events where wedding_id=result and id not in(select coalesce((x->>'id')::uuid,e.id) from jsonb_array_elements(payload->'events') x join public.wedding_events e on e.wedding_id=result and e.name=x->>'name');
 insert into public.audit_events(wedding_id,actor_id,action,entity_id) values(result,auth.uid(),'wedding.saved',result); return result;
end $$;

create function public.save_guests(wid uuid, items jsonb) returns int language plpgsql security definer set search_path=public as $$
declare g jsonb; gid uuid; eid uuid; lim int; added int:=0; begin
 perform public.require_owner(wid); perform 1 from public.weddings where id=wid for update;
 select case plan when 'small' then 50 when 'medium' then 150 else 400 end into lim from public.weddings where id=wid;
 if jsonb_array_length(items)>400 then raise exception 'Too many rows'; end if;
 for g in select * from jsonb_array_elements(items) loop
 gid:=(g->>'id')::uuid;
 if gid is not null and not exists(select 1 from public.guests where id=gid and wedding_id=wid) then raise exception 'Guest not found'; end if;
 if exists(select 1 from public.jobs where guest_id=gid and status not in ('cancelled','failed')) then raise exception 'Guest is locked by production or delivery'; end if;
 if gid is null and (select count(*) from public.guests where wedding_id=wid)>=lim then raise exception 'Guest category limit reached'; end if;
 if coalesce(jsonb_array_length(g->'invited_events'),0)<1 then raise exception 'Select an event'; end if;
 gid:=coalesce(gid,gen_random_uuid());
 insert into public.guests(id,wedding_id,guest_name,relation,language,whatsapp_number,notes,pronunciation,messaging_consent) values(gid,wid,g->>'guest_name',g->>'relation',g->>'language',g->>'whatsapp_number',coalesce(g->>'notes',''),coalesce(g->>'pronunciation',''),coalesce((g->>'messaging_consent')::boolean,false)) on conflict(id) do update set guest_name=excluded.guest_name,relation=excluded.relation,language=excluded.language,whatsapp_number=excluded.whatsapp_number,notes=excluded.notes,pronunciation=excluded.pronunciation,messaging_consent=excluded.messaging_consent;
 delete from public.guest_event_assignments where guest_id=gid;
 for eid in select value::uuid from jsonb_array_elements_text(g->'invited_events') loop insert into public.guest_event_assignments values(wid,gid,eid); end loop;
 delete from public.invitation_scripts where guest_id=gid;
 added:=added+1;
 end loop;
 insert into public.audit_events(wedding_id,actor_id,action) values(wid,auth.uid(),'guests.saved'); return added;
end $$;
create function public.remove_guest(wid uuid, gid uuid) returns void language plpgsql security definer set search_path=public as $$ begin
 perform public.require_owner(wid);
 if exists(select 1 from public.jobs where wedding_id=wid and guest_id=gid and status not in ('cancelled','failed')) then raise exception 'Cancel outstanding jobs before deleting this guest'; end if;
 delete from public.jobs where wedding_id=wid and guest_id=gid;
 delete from public.guests where wedding_id=wid and id=gid;
 insert into public.audit_events(wedding_id,actor_id,action,entity_id) values(wid,auth.uid(),'guest.deleted',gid);
end $$;

create function public.save_script(wid uuid, gid uuid, wording text, phonetics text, action text default 'edited', is_sample boolean default false, expected_revision int default 0) returns void language plpgsql security definer set search_path=public as $$
declare rev int; body_before text; begin
 perform public.require_owner(wid); perform 1 from public.weddings where id=wid for update;
 if exists(select 1 from public.jobs where guest_id=gid and status not in ('cancelled','failed')) then raise exception 'Script locked by production'; end if;
 select revision,body into rev,body_before from public.invitation_scripts where wedding_id=wid and guest_id=gid for update;
 if coalesce(rev,0)<>expected_revision then raise exception 'Script changed. Reload before saving'; end if;
 if action not in ('edited','approved','rejected') then raise exception 'Invalid review action'; end if;
 if action='approved' and (rev is null or body_before<>wording or phonetics<>(select pronunciation from public.invitation_scripts where guest_id=gid)) then raise exception 'Save edits before approving'; end if;
 insert into public.invitation_scripts(wedding_id,guest_id,body,pronunciation,source,sample) values(wid,gid,wording,phonetics,'manual',is_sample)
 on conflict(guest_id) do update set body=excluded.body,pronunciation=excluded.pronunciation,revision=case when action='edited' then public.invitation_scripts.revision+1 else public.invitation_scripts.revision end,sample=excluded.sample,approved_at=case when action='approved' then now() else null end;
 insert into public.sample_approvals(wedding_id,script_id,revision,actor_id,action) select wid,id,revision,auth.uid(),action from public.invitation_scripts where guest_id=gid;
 insert into public.audit_events(wedding_id,actor_id,action,entity_id) values(wid,auth.uid(),'script.'||action,gid);
end $$;

create function public.revoke_voice(wid uuid, vid uuid, consent_copy text, consent_version text) returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid; begin
 perform public.require_owner(wid); perform 1 from public.weddings where id=wid for update;
 update public.voice_recordings set consent_status='revoked',status='deletion_requested' where id=vid and wedding_id=wid and status<>'deleted';
 if not found then raise exception 'Voice not found or already deleted'; end if;
 insert into public.voice_consents(wedding_id,recording_id,actor_id,consent_text,version,action) values(wid,vid,auth.uid(),consent_copy,consent_version,'revoked');
 update public.jobs set status='cancelled',error='Voice consent revoked' where voice_id=vid and status in ('queued','generating_audio','rendering_video');
 -- Include delivery jobs for that wedding: a revoked voice must never be sent again.
 update public.jobs set status='cancelled',error='Voice consent revoked' where wedding_id=wid and kind='delivery' and status='queued';
 insert into public.deletion_requests(wedding_id,recording_id,requested_by) values(wid,vid,auth.uid()) on conflict(recording_id) where status<>'completed' do update set status='pending' returning id into result;
 insert into public.audit_events(wedding_id,actor_id,action,entity_id) values(wid,auth.uid(),'voice.revoked',vid); return result;
end $$;

-- Queues are durable. Provider calls require a separately deployed worker; no fake success.
create function public.enqueue_batch(wid uuid, vid uuid, request_key uuid, confirmed_count int) returns int language plpgsql security definer set search_path=public as $$
declare n int; approved int; begin
 perform public.require_owner(wid); perform 1 from public.weddings where id=wid for update;
 if not exists(select 1 from public.voice_recordings where id=vid and wedding_id=wid and consent_status='active' and status='stored' and provider_verified) then raise exception 'A consented, provider-verified voice is required'; end if;
 select count(distinct lower(g.relation)) into approved from public.invitation_scripts s join public.guests g on g.id=s.guest_id where s.wedding_id=wid and s.sample and s.approved_at is not null;
 if approved<3 then raise exception 'Approve samples from three different relationship groups'; end if;
 select count(*) into n from public.guests where wedding_id=wid and not opted_out;
 if n<1 or n>200 or n<>confirmed_count then raise exception 'Confirm the current recipient count (1–200)'; end if;
 if exists(select 1 from public.guests g left join public.invitation_scripts s on s.guest_id=g.id where g.wedding_id=wid and not g.opted_out and (s.id is null or s.approved_at is null)) then raise exception 'Approve every guest script before production'; end if;
 insert into public.jobs(wedding_id,guest_id,voice_id,script_id,script_revision,kind,idempotency_key,approved_by) select wid,g.id,vid,s.id,s.revision,'video','video:'||s.id||':'||s.revision||':'||vid,auth.uid() from public.guests g join public.invitation_scripts s on s.guest_id=g.id where g.wedding_id=wid and not g.opted_out on conflict(idempotency_key) do nothing;
 insert into public.audit_events(wedding_id,actor_id,action,entity_id) values(wid,auth.uid(),'batch.approved',request_key); return n;
end $$;
create function public.cancel_job(wid uuid, jid uuid) returns void language plpgsql security definer set search_path=public as $$ begin perform public.require_owner(wid); update public.jobs set status='cancelled' where id=jid and wedding_id=wid and status='queued'; if not found then raise exception 'Only queued jobs can be cancelled'; end if; insert into public.audit_events(wedding_id,actor_id,action,entity_id) values(wid,auth.uid(),'job.cancelled',jid); end $$;
create function public.claim_job() returns setof public.jobs language sql security definer set search_path=public as $$ update public.jobs set claimed_at=now(),attempts=attempts+1,status=case when kind='video' then 'generating_audio' else 'sending' end where id=(select id from public.jobs where status='queued' and (scheduled_at is null or scheduled_at<=now()) order by created_at for update skip locked limit 1) returning * $$;
create function public.take_rate_limit(bucket text, max_hits int, seconds int) returns boolean language plpgsql security definer set search_path=public as $$ declare n int; begin insert into public.rate_limits(key,window_start,hits) values(bucket,now(),1) on conflict(key) do update set hits=case when public.rate_limits.window_start<now()-make_interval(secs=>seconds) then 1 else public.rate_limits.hits+1 end,window_start=case when public.rate_limits.window_start<now()-make_interval(secs=>seconds) then now() else public.rate_limits.window_start end returning hits into n; return n<=max_hits; end $$;

-- Storage is private; signed links are issued only after ownership checks.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('voices','voices',false,12582912,array['audio/webm','audio/ogg','audio/mp4']),('invitations','invitations',false,52428800,array['audio/mpeg','video/mp4']) on conflict(id) do nothing;
-- Browser uploads/deletes are intentionally not granted: auditable server endpoints manage files.
-- No anonymous storage policies and no public bucket listing.

-- PostgreSQL defaults functions to PUBLIC execute: explicitly close all mutation RPCs.
revoke execute on function public.require_owner(uuid),public.save_wedding(jsonb,uuid),public.save_guests(uuid,jsonb),public.remove_guest(uuid,uuid),public.save_script(uuid,uuid,text,text,text,boolean,int),public.revoke_voice(uuid,uuid,text,text),public.enqueue_batch(uuid,uuid,uuid,int),public.cancel_job(uuid,uuid),public.claim_job(),public.take_rate_limit(text,int,int) from public,anon,authenticated;
grant execute on function public.save_wedding(jsonb,uuid),public.save_guests(uuid,jsonb),public.remove_guest(uuid,uuid),public.save_script(uuid,uuid,text,text,text,boolean,int),public.revoke_voice(uuid,uuid,text,text),public.enqueue_batch(uuid,uuid,uuid,int),public.cancel_job(uuid,uuid) to authenticated;
grant execute on function public.claim_job(),public.take_rate_limit(text,int,int) to service_role;
grant all on public.profiles,public.waitlist_signups,public.weddings,public.wedding_events,public.guests,public.guest_event_assignments,public.voice_recordings,public.voice_consents,public.invitation_scripts,public.sample_approvals,public.jobs,public.generated_assets,public.delivery_events,public.deletion_requests,public.audit_events,public.rate_limits to service_role;
grant usage,select on sequence public.waitlist_signups_founding_number_seq to service_role;
commit;
