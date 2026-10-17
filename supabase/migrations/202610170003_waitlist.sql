begin;
-- Serialize allocation so duplicate submissions do not consume founding-family places.
create function public.join_waitlist(payload jsonb) returns boolean language plpgsql security definer set search_path=public as $$
declare n bigint; begin
 perform pg_advisory_xact_lock(98238423);
 select founding_number into n from public.waitlist_signups where email=lower(payload->>'email');
 if n is null then
 select coalesce(max(founding_number),0)+1 into n from public.waitlist_signups;
 insert into public.waitlist_signups(name,phone,email,wedding_month,guest_count,language,role,founding_number) overriding system value values(payload->>'name',payload->>'phone',lower(payload->>'email'),payload->>'date',(payload->>'guest_count')::int,payload->>'language',payload->>'role',n);
 end if;
 return n<=100;
end $$;
revoke execute on function public.join_waitlist(jsonb) from public,anon,authenticated;
grant execute on function public.join_waitlist(jsonb) to service_role;
commit;
