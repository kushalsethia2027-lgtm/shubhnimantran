\set ON_ERROR_STOP on
begin;
insert into auth.users values ('10000000-0000-4000-8000-000000000001'),('10000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select public.save_wedding('{"bride":"Meera","groom":"Aarav","wedding_date":"2027-02-10","city":"Jaipur","venue":"Family courtyard","rsvp_contact":"Host","plan":"small","events":[{"id":"20000000-0000-4000-8000-000000000001","name":"Wedding","date":"2027-02-10","venue":"Family courtyard"},{"id":"20000000-0000-4000-8000-000000000002","name":"Mehndi","date":"2027-02-09","venue":"Home"}]}') as wid \gset
select set_config('test.wid',:'wid',true);
do $$ begin
 if (select count(*) from public.weddings)<>1 then raise exception 'Owner cannot read wedding'; end if;
 begin insert into public.weddings(owner_id,bride,groom,wedding_date,city,venue,rsvp_contact,plan) values(auth.uid(),'x','y','2027-01-01','c','v','r','small'); raise exception 'Direct write unexpectedly succeeded'; exception when insufficient_privilege then null; end;
 begin perform public.save_guests(current_setting('test.wid')::uuid,'[{"guest_name":"Invalid","relation":"Mama ji","language":"Hindi","whatsapp_number":"bad","invited_events":["20000000-0000-4000-8000-000000000001"]}]'); raise exception 'Invalid phone accepted'; exception when check_violation then null; end;
end $$;
select public.save_guests(:'wid','[{"guest_name":"Raj","relation":"Mama ji","language":"Hindi","whatsapp_number":"+919876543210","messaging_consent":true,"invited_events":["20000000-0000-4000-8000-000000000001"]},{"guest_name":"Asha","relation":"Mausi ji","language":"Hinglish","whatsapp_number":"+919876543211","invited_events":["20000000-0000-4000-8000-000000000002"]},{"guest_name":"Dev","relation":"College friend","language":"Hindi","whatsapp_number":"+919876543212","invited_events":["20000000-0000-4000-8000-000000000001"]}]');
select id as gid from public.guests where whatsapp_number='+919876543210' \gset
select set_config('test.gid',:'gid',true);
do $$ declare wid uuid:=current_setting('test.wid')::uuid; begin
 begin perform public.save_guests(wid,'[{"guest_name":"Valid before duplicate","relation":"Bua ji","language":"Hindi","whatsapp_number":"+919876543299","invited_events":["20000000-0000-4000-8000-000000000001"]},{"guest_name":"Duplicate","relation":"Mama ji","language":"Hindi","whatsapp_number":"+919876543210","invited_events":["20000000-0000-4000-8000-000000000001"]}]'); raise exception 'Duplicate accepted'; exception when unique_violation then null; end;
 if (select count(*) from public.guests)<>3 then raise exception 'Import was not atomic'; end if;
 begin perform public.save_guests(wid,'[{"guest_name":"Bad event","relation":"Bua ji","language":"Hindi","whatsapp_number":"+919876543298","invited_events":["99999999-0000-4000-8000-000000000001"]}]'); raise exception 'Foreign event accepted'; exception when foreign_key_violation then null; end;
 begin perform public.enqueue_batch(wid,'40000000-0000-4000-8000-000000000001',gen_random_uuid(),3); raise exception 'Generation without consent succeeded'; exception when raise_exception then if sqlerrm not like '%provider-verified%' then raise; end if; end;
end $$;
select public.register_voice(:'wid','40000000-0000-4000-8000-000000000001','Speaker','Papa',:'wid'||'/40000000-0000-4000-8000-000000000001','audio/webm',35);
do $$ declare wid uuid:=current_setting('test.wid')::uuid; begin
 if (select count(*) from public.voice_consents where action='granted')<>1 then raise exception 'Consent missing'; end if;
 begin update public.voice_consents set consent_text='changed'; raise exception 'Consent history mutable'; exception when insufficient_privilege then null; end;
 begin update public.voice_recordings set provider_verified=true; raise exception 'Host can verify own voice'; exception when insufficient_privilege then null; end;
 begin perform public.enqueue_batch(wid,'40000000-0000-4000-8000-000000000001',gen_random_uuid(),3); raise exception 'Unverified voice accepted'; exception when raise_exception then if sqlerrm not like '%provider-verified%' then raise; end if; end;
end $$;
-- Editing a guest persists selected events; deletion removes assignments atomically.
select public.save_guests(:'wid',jsonb_build_array(jsonb_build_object('id',:'gid','guest_name','Raj updated','relation','Mama ji','language','Hindi','whatsapp_number','+919876543210','invited_events',jsonb_build_array('20000000-0000-4000-8000-000000000002'))));
do $$ declare items jsonb; begin
 if not exists(select 1 from public.guests where guest_name='Raj updated') then raise exception 'Guest edit failed'; end if;
 if not exists(select 1 from public.guest_event_assignments where guest_id=current_setting('test.gid')::uuid and event_id='20000000-0000-4000-8000-000000000002') then raise exception 'Guest events not updated'; end if;
 select jsonb_agg(jsonb_build_object('guest_name','Extra '||n,'relation','Family friend','language','Hindi','whatsapp_number','+91980000'||lpad(n::text,4,'0'),'invited_events',jsonb_build_array('20000000-0000-4000-8000-000000000001'))) into items from generate_series(1,48) n;
 begin perform public.save_guests(current_setting('test.wid')::uuid,items); raise exception 'Guest limit not enforced'; exception when raise_exception then if sqlerrm not like '%category limit%' then raise; end if; end;
 if (select count(*) from public.guests)<>3 then raise exception 'Over-limit import was not atomic'; end if;
end $$;
select public.save_guests(:'wid','[{"guest_name":"Delete me","relation":"Bua ji","language":"Hindi","whatsapp_number":"+919876543255","invited_events":["20000000-0000-4000-8000-000000000001"]}]');
select id as delete_gid from public.guests where guest_name='Delete me' \gset
select public.remove_guest(:'wid',:'delete_gid');
do $$ begin if (select count(*) from public.guests)<>3 then raise exception 'Guest deletion failed'; end if; end $$;
-- Owner B cannot discover or mutate owner A's rows, including through definer RPCs.
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
do $$ declare wid uuid:=current_setting('test.wid')::uuid; begin
 if (select count(*) from public.weddings)<>0 or (select count(*) from public.guests)<>0 or (select count(*) from public.voice_consents)<>0 then raise exception 'RLS isolation failed'; end if;
 begin perform public.remove_guest(wid,current_setting('test.gid')::uuid); raise exception 'Cross-owner delete succeeded'; exception when insufficient_privilege then null; end;
 begin perform public.save_script(wid,current_setting('test.gid')::uuid,'forged','', 'edited',true,0); raise exception 'Cross-owner script write succeeded'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select public.save_script(:'wid',:'gid','Raj Mama ji, Wedding on 2027-02-10 at Family courtyard.','', 'edited',true,0);
select public.save_script(:'wid',:'gid','Raj Mama ji, Wedding on 2027-02-10 at Family courtyard.','', 'approved',true,1);
do $$ begin
 if not exists(select 1 from public.invitation_scripts where approved_at is not null) then raise exception 'Approval not persisted'; end if;
 begin perform public.save_script(current_setting('test.wid')::uuid,current_setting('test.gid')::uuid,'stale','', 'edited',true,0); raise exception 'Stale revision accepted'; exception when raise_exception then if sqlerrm not like '%Script changed%' then raise; end if; end;
end $$;
select public.save_script(:'wid',:'gid','Edited invitation','Raaj', 'edited',true,1);
do $$ begin if exists(select 1 from public.invitation_scripts where approved_at is not null) then raise exception 'Editing did not invalidate approval'; end if; end $$;
-- Service provisioning of verified voice is a fixture, not a live provider verification.
reset role;
update public.voice_recordings set provider_verified=true where id='40000000-0000-4000-8000-000000000001';
set local role authenticated;
do $$ begin
 begin perform public.enqueue_batch(current_setting('test.wid')::uuid,'40000000-0000-4000-8000-000000000001',gen_random_uuid(),3); raise exception 'Sample gate bypassed'; exception when raise_exception then if sqlerrm not like '%three different%' then raise; end if; end;
end $$;
-- Approve all three representative scripts.
do $$ declare g record; rev int; begin for g in select * from public.guests loop
 select revision into rev from public.invitation_scripts where guest_id=g.id;
 if rev is null then perform public.save_script(g.wedding_id,g.id,'Reviewed invitation for '||g.guest_name,'','edited',true,0); rev:=1; end if;
 perform public.save_script(g.wedding_id,g.id,(select body from public.invitation_scripts where guest_id=g.id),(select pronunciation from public.invitation_scripts where guest_id=g.id),'approved',true,rev);
end loop; end $$;
select public.enqueue_batch(:'wid','40000000-0000-4000-8000-000000000001',gen_random_uuid(),3);
select public.enqueue_batch(:'wid','40000000-0000-4000-8000-000000000001',gen_random_uuid(),3);
do $$ begin if (select count(*) from public.jobs)<>3 then raise exception 'Duplicate jobs created'; end if; end $$;
reset role;
set local role service_role;
select count(*) from public.claim_job();
do $$ begin if (select count(*) from public.jobs where status='generating_audio' and attempts=1)<>1 then raise exception 'Job claim failed'; end if; end $$;
reset role;
set local role authenticated;
select public.revoke_voice(:'wid','40000000-0000-4000-8000-000000000001','Consent revoked','2026-10-v1');
do $$ begin
 if exists(select 1 from public.jobs where status in ('queued','generating_audio','rendering_video')) then raise exception 'Revocation did not cancel jobs'; end if;
 if not exists(select 1 from public.deletion_requests where status='pending') then raise exception 'Deletion request missing'; end if;
 if (select count(*) from public.voice_consents)<>2 then raise exception 'Consent audit not append-only'; end if;
 begin perform public.enqueue_batch(current_setting('test.wid')::uuid,'40000000-0000-4000-8000-000000000001',gen_random_uuid(),3); raise exception 'Revoked voice accepted'; exception when raise_exception then if sqlerrm not like '%provider-verified%' then raise; end if; end;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform * from public.guests; raise exception 'Anonymous guest access'; exception when insufficient_privilege then null; end;
 begin perform public.save_guests(current_setting('test.wid')::uuid,'[]'); raise exception 'Anonymous RPC access'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role service_role;
do $$ declare result boolean; begin
 if not public.take_rate_limit('test-limiter',1,300) then raise exception 'First rate-limit request blocked'; end if;
 if public.take_rate_limit('test-limiter',1,300) then raise exception 'Rate limit not enforced'; end if;
 result:=public.join_waitlist('{"name":"Family","phone":"+919876543210","email":"family@example.test","date":"2027-02","guest_count":50,"language":"Hindi","role":"Parent"}');
 if not result then raise exception 'First founding family not eligible'; end if;
 perform public.join_waitlist('{"name":"Family","phone":"+919876543210","email":"family@example.test","date":"2027-02","guest_count":50,"language":"Hindi","role":"Parent"}');
 if (select count(*) from public.waitlist_signups)<>1 then raise exception 'Waitlist not idempotent'; end if;
end $$;
reset role;
rollback;
\echo 'PASS: database ownership, atomic import, event isolation, consent, approvals, job deduplication/claim, revocation and anonymous restrictions'
