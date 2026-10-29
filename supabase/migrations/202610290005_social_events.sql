-- Additive social-events replacement. Does not delete wedding data.
-- Standalone with Supabase auth schema; legacy wedding migrations need not be reapplied.
begin;
create table public.social_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check(length(trim(display_name)) between 2 and 60),
 bio text not null default '' check(length(bio)<=600), created_at timestamptz not null default now()
);
create table public.social_accounts (
 user_id uuid primary key references public.social_profiles(id) on delete cascade,
 dob date not null check(dob>=date '1900-01-01'),
 referral_from uuid references public.social_profiles(id),
 check(referral_from is distinct from user_id)
);
create table public.social_listings (
 id uuid primary key default gen_random_uuid(), host_id uuid not null references public.social_profiles(id),
 title text not null check(length(trim(title)) between 5 and 100),description text not null check(length(trim(description)) between 30 and 3000),
 category text not null check(category in ('dance','games','food','art','outdoors','social')),
 city text not null check(city in ('Gurgaon','Delhi','Noida','Faridabad','Ghaziabad')),
 neighbourhood text not null check(length(trim(neighbourhood)) between 2 and 100),
 starts_at timestamptz not null, ends_at timestamptz not null, check(ends_at>starts_at),
 price integer not null check(price between 0 and 50000),capacity integer not null check(capacity between 2 and 200),
 min_age integer not null default 18 check(min_age between 18 and 100),max_age integer check(max_age>=min_age and max_age<=100),
 food text not null check(length(trim(food)) between 2 and 500),drinks text not null check(length(trim(drinks)) between 2 and 500),
 includes text not null check(length(trim(includes)) between 2 and 1000),extra_costs text not null check(length(trim(extra_costs)) between 2 and 500),
 bring text not null default '' check(length(bring)<=500),rules text not null check(length(trim(rules)) between 10 and 1500),
 cancellation text not null check(length(trim(cancellation)) between 10 and 1000),
 atmosphere text not null check(atmosphere in ('Conversational','Relaxed','Playful','High energy')),
 language text not null check(length(trim(language)) between 2 and 100),accessibility text not null check(length(trim(accessibility)) between 2 and 500),
 solo boolean not null default true,alcohol_free boolean not null default true,
 check(alcohol_free or min_age>=25),
 lat numeric not null check(lat between 28.1 and 29),lng numeric not null check(lng between 76.5 and 77.7),
 status text not null default 'published' check(status in ('published','cancelled')),
 revision integer not null default 1,created_at timestamptz not null default now()
);
create table public.social_venues (
 event_id uuid primary key references public.social_listings(id) on delete cascade,
 address text not null check(length(trim(address)) between 10 and 1000)
);
create table public.social_bookings (
 id uuid primary key default gen_random_uuid(),event_id uuid not null references public.social_listings(id),user_id uuid not null references public.social_profiles(id),
 introduction text not null check(length(trim(introduction)) between 20 and 1000),
 status text not null default 'requested' check(status in ('requested','awaiting_payment','confirmed','checked_in','cancelled','declined')),
 checkin_code uuid not null default gen_random_uuid(),created_at timestamptz not null default now(),unique(event_id,user_id)
);
create table public.social_reviews (
 id uuid primary key default gen_random_uuid(),event_id uuid not null references public.social_listings(id),user_id uuid not null references public.social_profiles(id),
 rating integer not null check(rating between 1 and 5),body text not null check(length(trim(body)) between 10 and 1500),
 host_reply text check(length(host_reply) between 2 and 1000),created_at timestamptz not null default now(),unique(event_id,user_id)
);
create table public.social_saved (
 user_id uuid not null references public.social_profiles(id) on delete cascade,event_id uuid not null references public.social_listings(id) on delete cascade,primary key(user_id,event_id)
);
create table public.social_reports (
 id uuid primary key default gen_random_uuid(),reporter_id uuid not null references public.social_profiles(id),event_id uuid not null references public.social_listings(id),
 body text not null check(length(trim(body)) between 10 and 2000),created_at timestamptz not null default now()
);
create index social_listing_date on public.social_listings(starts_at) where status='published';
create index social_listing_host on public.social_listings(host_id);
create index social_booking_event on public.social_bookings(event_id,status);
create index social_booking_user on public.social_bookings(user_id);
create index social_review_event on public.social_reviews(event_id);
alter table public.social_profiles enable row level security;
alter table public.social_accounts enable row level security;
alter table public.social_listings enable row level security;
alter table public.social_venues enable row level security;
alter table public.social_bookings enable row level security;
alter table public.social_reviews enable row level security;
alter table public.social_saved enable row level security;
alter table public.social_reports enable row level security;
-- All writes other than saved items are scoped RPCs. No client-supplied authority.
revoke all on public.social_profiles,public.social_accounts,public.social_listings,public.social_venues,public.social_bookings,public.social_reviews,public.social_saved,public.social_reports from public,anon,authenticated;
grant select on public.social_profiles,public.social_accounts,public.social_listings,public.social_venues,public.social_bookings,public.social_reviews,public.social_saved,public.social_reports to authenticated;
grant select on public.social_profiles,public.social_listings,public.social_reviews to anon;
grant insert,delete on public.social_saved to authenticated;
-- Booking codes are available only through the confirmed-booking RPC.
revoke select on public.social_bookings from authenticated;
grant select(id,event_id,user_id,introduction,status,created_at) on public.social_bookings to authenticated;
create policy social_profile_read on public.social_profiles for select using(true);
create policy social_account_self on public.social_accounts for select to authenticated using(user_id=auth.uid());
create policy social_listing_read on public.social_listings for select using(status='published' or host_id=auth.uid());
create policy social_venue_read on public.social_venues for select to authenticated using(
 exists(select 1 from public.social_listings e where e.id=event_id and e.host_id=auth.uid()) or
 exists(select 1 from public.social_bookings b where b.event_id=social_venues.event_id and b.user_id=auth.uid() and b.status in ('confirmed','checked_in'))
);
create policy social_booking_read on public.social_bookings for select to authenticated using(user_id=auth.uid() or exists(select 1 from public.social_listings e where e.id=event_id and e.host_id=auth.uid()));
create policy social_review_read on public.social_reviews for select using(true);
create policy social_saved_self on public.social_saved for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy social_report_self on public.social_reports for select to authenticated using(reporter_id=auth.uid());

create function public.social_profile(p_name text,p_bio text,p_dob date,p_referral uuid default null) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'Sign in first';end if;
 if p_dob> (current_date-interval '18 years')::date then raise exception 'Nimantran is for adults aged 18 and over';end if;
 if exists(select 1 from social_accounts where user_id=auth.uid() and dob<>p_dob) then raise exception 'Date of birth cannot be changed through the app. Contact support to correct it.';end if;
 insert into social_profiles(id,display_name,bio) values(auth.uid(),p_name,p_bio) on conflict(id) do update set display_name=excluded.display_name,bio=excluded.bio;
 insert into social_accounts(user_id,dob,referral_from) values(auth.uid(),p_dob,(select id from social_profiles where id=p_referral and id<>auth.uid())) on conflict(user_id) do nothing;
end $$;
create function public.social_events() returns table(
 id uuid,host_id uuid,title text,description text,category text,city text,neighbourhood text,starts_at timestamptz,ends_at timestamptz,price integer,capacity integer,min_age integer,max_age integer,
 food text,drinks text,includes text,extra_costs text,bring text,rules text,cancellation text,atmosphere text,language text,accessibility text,solo boolean,alcohol_free boolean,lat numeric,lng numeric,status text,revision integer,
 host_name text,confirmed_count bigint,host_events bigint,rating numeric,review_count bigint
) language sql stable security definer set search_path=public,pg_temp as $$
 select e.id,e.host_id,e.title,e.description,e.category,e.city,e.neighbourhood,e.starts_at,e.ends_at,e.price,e.capacity,e.min_age,e.max_age,e.food,e.drinks,e.includes,e.extra_costs,e.bring,e.rules,e.cancellation,e.atmosphere,e.language,e.accessibility,e.solo,e.alcohol_free,e.lat,e.lng,e.status,e.revision,
 p.display_name,(select count(*) from social_bookings b where b.event_id=e.id and b.status in ('confirmed','checked_in')),
 (select count(*) from social_listings h where h.host_id=e.host_id and h.ends_at<now() and h.status='published' and exists(select 1 from social_bookings attended where attended.event_id=h.id and attended.status='checked_in')),
 (select round(avg(r.rating),1) from social_reviews r join social_listings h on h.id=r.event_id where h.host_id=e.host_id),
 (select count(*) from social_reviews r join social_listings h on h.id=r.event_id where h.host_id=e.host_id)
 from social_listings e join social_profiles p on p.id=e.host_id where (e.status='published' and e.ends_at>now()) or e.host_id=auth.uid() or exists(select 1 from social_bookings own where own.event_id=e.id and own.user_id=auth.uid()) order by e.starts_at limit 1000
$$;
create function public.social_publish(p_data jsonb) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare eid uuid;
begin
 if not exists(select 1 from social_accounts where user_id=auth.uid() and dob<=(current_date-interval '18 years')::date) then raise exception 'Complete your adult profile before hosting';end if;
 if (p_data->>'starts_at')::timestamptz<=now() then raise exception 'Choose a future start time';end if;
 insert into social_listings(host_id,title,description,category,city,neighbourhood,starts_at,ends_at,price,capacity,min_age,max_age,food,drinks,includes,extra_costs,bring,rules,cancellation,atmosphere,language,accessibility,solo,alcohol_free,lat,lng)
 values(auth.uid(),p_data->>'title',p_data->>'description',p_data->>'category',p_data->>'city',p_data->>'neighbourhood',(p_data->>'starts_at')::timestamptz,(p_data->>'ends_at')::timestamptz,(p_data->>'price')::int,(p_data->>'capacity')::int,(p_data->>'min_age')::int,nullif(p_data->>'max_age','')::int,p_data->>'food',p_data->>'drinks',p_data->>'includes',p_data->>'extra_costs',coalesce(p_data->>'bring',''),p_data->>'rules',p_data->>'cancellation',p_data->>'atmosphere',p_data->>'language',p_data->>'accessibility',(p_data->>'solo')::boolean,(p_data->>'alcohol_free')::boolean,round((p_data->>'lat')::numeric,2),round((p_data->>'lng')::numeric,2)) returning id into eid;
 insert into social_venues(event_id,address) values(eid,p_data->>'address');return eid;
end $$;
create function public.social_request(p_event uuid,p_intro text) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare e social_listings; birthday date;bid uuid;age integer;
begin
 select * into e from social_listings where id=p_event for update;
 if e.id is null or e.status<>'published' or e.starts_at<=now() then raise exception 'This event is not accepting requests';end if;
 if e.host_id=auth.uid() then raise exception 'You cannot book your own event';end if;
 select dob into birthday from social_accounts where user_id=auth.uid();
 if birthday is null then raise exception 'Complete your adult profile first';end if;
 age:=extract(year from age(current_date,birthday));
 if age<e.min_age or (e.max_age is not null and age>e.max_age) then raise exception 'You do not meet this event age eligibility';end if;
 if (select count(*) from social_bookings where event_id=p_event and status in ('awaiting_payment','confirmed','checked_in'))>=e.capacity then raise exception 'This event is full';end if;
 insert into social_bookings(event_id,user_id,introduction) values(p_event,auth.uid(),p_intro) returning id into bid;return bid;
end $$;
create function public.social_booking_action(p_booking uuid,p_action text,p_code uuid default null) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare e social_listings;b social_bookings;
begin
 -- Always lock event before booking, serialising capacity decisions.
 select e0.* into e from social_listings e0 join social_bookings b0 on b0.event_id=e0.id where b0.id=p_booking for update of e0;
 select * into b from social_bookings where id=p_booking for update;
 if b.id is null or auth.uid() is null then raise exception 'Booking not found';end if;
 if p_action='cancel' and b.user_id=auth.uid() and b.status in ('requested','awaiting_payment','confirmed') and e.starts_at>now() then
 update social_bookings set status='cancelled' where id=b.id;return;end if;
 if e.host_id<>auth.uid() then raise exception 'Only this event host can perform this action';end if;
 if e.status<>'published' then raise exception 'This event is cancelled';end if;
 if p_action in ('approve','decline') and b.status='requested' and e.starts_at>now() then
  if p_action='approve' then
   if (select count(*) from social_bookings where event_id=e.id and status in ('awaiting_payment','confirmed','checked_in'))>=e.capacity then raise exception 'This event is full';end if;
   -- Paid checkout is deliberately not enabled. No fake payment confirmations.
   if e.price>0 then raise exception 'Paid bookings are not enabled. Connect a supported marketplace checkout before approving paid requests.';end if;
  end if;
  update social_bookings set status=case when p_action='decline' then 'declined' else 'confirmed' end where id=b.id;
 elsif p_action='checkin' and b.status='confirmed' and e.starts_at<=now() and e.ends_at+interval '1 day'>now() and p_code=b.checkin_code then
  update social_bookings set status='checked_in' where id=b.id;
 else raise exception 'This action is unavailable, already completed, or the check-in code does not match';end if;
end $$;
create function public.social_cancel_event(p_event uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform 1 from social_listings where id=p_event and host_id=auth.uid() and status='published' and starts_at>now() for update;
 if not found then raise exception 'Only the host can cancel an upcoming event';end if;
 update social_listings set status='cancelled',revision=revision+1 where id=p_event;
 update social_bookings set status='cancelled' where event_id=p_event and status in ('requested','awaiting_payment','confirmed');
end $$;
create function public.social_my_bookings() returns table(id uuid,event_id uuid,user_id uuid,status text,created_at timestamptz,guest_name text,checkin_code uuid) language sql stable security definer set search_path=public,pg_temp as $$
 select b.id,b.event_id,b.user_id,b.status,b.created_at,p.display_name,case when b.status in ('confirmed','checked_in') then b.checkin_code else null end
 from social_bookings b join social_profiles p on p.id=b.user_id where b.user_id=auth.uid() order by b.created_at desc
$$;
create function public.social_event_guests(p_event uuid) returns table(id uuid,event_id uuid,user_id uuid,status text,created_at timestamptz,guest_name text,checkin_code uuid,introduction text,bio text) language sql stable security definer set search_path=public,pg_temp as $$
 select b.id,b.event_id,b.user_id,b.status,b.created_at,p.display_name,null::uuid,b.introduction,p.bio from social_bookings b join social_profiles p on p.id=b.user_id
 where b.event_id=p_event and exists(select 1 from social_listings e where e.id=p_event and e.host_id=auth.uid()) order by b.created_at
$$;
create function public.social_event_reviews(p_event uuid) returns table(id uuid,event_id uuid,user_id uuid,rating integer,body text,created_at timestamptz,guest_name text,host_reply text) language sql stable security definer set search_path=public,pg_temp as $$
 select r.id,r.event_id,r.user_id,r.rating,r.body,r.created_at,p.display_name,r.host_reply from social_reviews r join social_profiles p on p.id=r.user_id where r.event_id=p_event order by r.created_at desc
$$;
create function public.social_review(p_event uuid,p_rating integer,p_body text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not exists(select 1 from social_bookings b join social_listings e on e.id=b.event_id where b.event_id=p_event and b.user_id=auth.uid() and b.status='checked_in' and e.ends_at<=now()) then raise exception 'Only checked-in guests can review after the event ends';end if;
 insert into social_reviews(event_id,user_id,rating,body) values(p_event,auth.uid(),p_rating,p_body);
end $$;
create function public.social_reply(p_review uuid,p_body text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update social_reviews r set host_reply=p_body from social_listings e where e.id=r.event_id and r.id=p_review and e.host_id=auth.uid();if not found then raise exception 'Only the host can reply';end if;
end $$;
create function public.social_report(p_event uuid,p_body text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not exists(select 1 from social_profiles where id=auth.uid()) then raise exception 'Complete your profile first';end if;
 insert into social_reports(reporter_id,event_id,body) values(auth.uid(),p_event,p_body);
end $$;
create function public.social_edit_event(p_event uuid,p_revision integer,p_data jsonb) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare e social_listings;
begin
 select * into e from social_listings where id=p_event and host_id=auth.uid() and status='published' and starts_at>now() for update;
 if e.id is null then raise exception 'Only the host can edit an upcoming event';end if;
 if e.revision<>p_revision then raise exception 'This listing changed. Refresh before editing again.';end if;
 if exists(select 1 from social_bookings where event_id=e.id and status not in ('cancelled','declined')) then raise exception 'This listing already has guest requests. Cancel and create a new event rather than changing what guests agreed to.';end if;
 update social_listings set title=p_data->>'title',description=p_data->>'description',food=p_data->>'food',drinks=p_data->>'drinks',includes=p_data->>'includes',extra_costs=p_data->>'extra_costs',bring=p_data->>'bring',rules=p_data->>'rules',cancellation=p_data->>'cancellation',revision=revision+1 where id=e.id;
end $$;
revoke all on function public.social_edit_event(uuid,integer,jsonb) from public,anon;
grant execute on function public.social_edit_event(uuid,integer,jsonb) to authenticated;
-- Explicitly revoke default PUBLIC execution on every new RPC.
revoke all on function public.social_profile(text,text,date,uuid),public.social_events(),public.social_publish(jsonb),public.social_request(uuid,text),public.social_booking_action(uuid,text,uuid),public.social_cancel_event(uuid),public.social_my_bookings(),public.social_event_guests(uuid),public.social_event_reviews(uuid),public.social_review(uuid,integer,text),public.social_reply(uuid,text),public.social_report(uuid,text) from public,anon;
grant execute on function public.social_events(),public.social_event_reviews(uuid) to anon,authenticated;
grant execute on function public.social_profile(text,text,date,uuid),public.social_publish(jsonb),public.social_request(uuid,text),public.social_booking_action(uuid,text,uuid),public.social_cancel_event(uuid),public.social_my_bookings(),public.social_event_guests(uuid),public.social_review(uuid,integer,text),public.social_reply(uuid,text),public.social_report(uuid,text) to authenticated;
commit;
