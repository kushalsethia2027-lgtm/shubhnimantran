\set ON_ERROR_STOP on
begin;
-- Disposable fixture models verified Supabase identities. No real emails/accounts.
alter table auth.users add column email text, add column email_confirmed_at timestamptz;
insert into auth.users(id,email,email_confirmed_at) values
 ('11000000-0000-4000-8000-000000000001','owner@example.invalid',now()),
 ('11000000-0000-4000-8000-000000000002','bride@example.invalid',now()),
 ('11000000-0000-4000-8000-000000000003','groom@example.invalid',now()),
 ('11000000-0000-4000-8000-000000000004','outsider@example.invalid',now());
set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000001',true);
select public.planner_create_workspace('Shared wedding','2027-02-10','Jaipur') as wid \gset
select public.planner_create_workspace('Other wedding','2027-03-10','Delhi') as other \gset
select set_config('test.wid',:'wid',true),set_config('test.other',:'other',true);
select public.planner_invite(:'wid','bride@example.invalid','bride_planner') as bride_token \gset
select public.planner_invite(:'wid','groom@example.invalid','groom_planner') as groom_token \gset
select set_config('test.token',:'bride_token',true);
insert into public.families(id,wedding_id,side,family_name) values
 ('22000000-0000-4000-8000-000000000001',:'wid','bride','Bride family'),
 ('22000000-0000-4000-8000-000000000002',:'wid','groom','Groom family'),
 ('22000000-0000-4000-8000-000000000003',:'other','bride','Other family');
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000004',true);
do $$ begin
 if exists(select 1 from public.families) or exists(select 1 from public.wedding_members) or exists(select 1 from public.planner_workspaces()) then raise exception 'Outsider read'; end if;
 begin perform public.planner_accept_invite(current_setting('test.token')); raise exception 'Wrong email accepted invite'; exception when insufficient_privilege then null; end;
 begin insert into public.families(wedding_id,side,family_name) values(current_setting('test.wid')::uuid,'bride','forged'); raise exception 'Outsider insert'; exception when insufficient_privilege then null; end;
 begin insert into public.logistics_assignments(wedding_id,assignment_type) values(current_setting('test.wid')::uuid,'accommodation'); raise exception 'Outsider assignment'; exception when insufficient_privilege then null; end;
 begin perform public.planner_delete_workspace(current_setting('test.wid')::uuid); raise exception 'Outsider delete workspace'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000002',true);
select public.planner_accept_invite(:'bride_token');
do $$ declare changed int; begin
 if (select count(*) from public.families)<>2 then raise exception 'Bride common read failed'; end if;
 if exists(select 1 from public.guests) then raise exception 'Invitation guests leaked'; end if;
 begin perform public.planner_accept_invite(current_setting('test.token')); raise exception 'Reused token accepted'; exception when insufficient_privilege then null; end;
 begin insert into public.wedding_members(wedding_id,user_id,role) values(current_setting('test.other')::uuid,auth.uid(),'owner'); raise exception 'Self promotion'; exception when insufficient_privilege then null; end;
 begin perform public.planner_invite(current_setting('test.wid')::uuid,'x@example.invalid','groom_planner'); raise exception 'Planner invited'; exception when insufficient_privilege then null; end;
 begin perform public.planner_remove_member(current_setting('test.wid')::uuid,'11000000-0000-4000-8000-000000000003'); raise exception 'Planner removed member'; exception when insufficient_privilege then null; end;
 begin perform public.planner_delete_workspace(current_setting('test.wid')::uuid); raise exception 'Planner deleted workspace'; exception when insufficient_privilege then null; end;
 begin insert into public.families(wedding_id,side,family_name) values(current_setting('test.wid')::uuid,'groom','forged'); raise exception 'Bride wrote groom'; exception when insufficient_privilege then null; end;
 update public.families set notes='forged' where id='22000000-0000-4000-8000-000000000002'; get diagnostics changed=row_count; if changed<>0 then raise exception 'Bride updated groom'; end if;
 delete from public.families where id='22000000-0000-4000-8000-000000000002'; get diagnostics changed=row_count; if changed<>0 then raise exception 'Bride deleted groom'; end if;
 begin insert into public.family_members(wedding_id,family_id,full_name) values(current_setting('test.wid')::uuid,'22000000-0000-4000-8000-000000000002','forged'); raise exception 'Bride wrote groom child'; exception when insufficient_privilege then null; end;
 begin insert into public.travel_groups(wedding_id,family_id,transport_mode) values(current_setting('test.other')::uuid,'22000000-0000-4000-8000-000000000001','train'); raise exception 'Cross workspace child'; exception when insufficient_privilege then null; end;
end $$;
insert into public.family_members(wedding_id,family_id,full_name,rsvp_status) values(:'wid','22000000-0000-4000-8000-000000000001','Bride guest','confirmed');
insert into public.travel_groups(id,wedding_id,family_id,transport_mode,pickup_required) values
 ('33000000-0000-4000-8000-000000000001',:'wid','22000000-0000-4000-8000-000000000001','train',true),
 ('33000000-0000-4000-8000-000000000002',:'wid','22000000-0000-4000-8000-000000000001','flight',true);
update public.families set notes='saved' where id='22000000-0000-4000-8000-000000000001' and revision=1;
do $$ declare changed int; begin
 update public.families set notes='stale' where id='22000000-0000-4000-8000-000000000001' and revision=1;
 get diagnostics changed=row_count; if changed<>0 then raise exception 'Stale update overwrote'; end if;
 if (select revision from public.families where id='22000000-0000-4000-8000-000000000001')<>2 then raise exception 'Revision not incremented'; end if;
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000003',true);
select public.planner_accept_invite(:'groom_token');
insert into public.family_members(wedding_id,family_id,full_name) values(:'wid','22000000-0000-4000-8000-000000000002','Groom guest');
insert into public.travel_groups(id,wedding_id,family_id,transport_mode) values('33000000-0000-4000-8000-000000000003',:'wid','22000000-0000-4000-8000-000000000002','car');
-- Both sides can coordinate the other side's travel, but not edit that travel.
insert into public.logistics_assignments(id,wedding_id,travel_group_id,assignment_type) values('44000000-0000-4000-8000-000000000001',:'wid','33000000-0000-4000-8000-000000000001','pickup');
do $$ declare changed int; begin
 if (select count(*) from public.travel_groups)<>3 then raise exception 'Multiple travel groups not shared'; end if;
 update public.family_members set full_name='forged' where family_id='22000000-0000-4000-8000-000000000001'; get diagnostics changed=row_count; if changed<>0 then raise exception 'Groom updated bride member'; end if;
 delete from public.family_members where family_id='22000000-0000-4000-8000-000000000001'; get diagnostics changed=row_count; if changed<>0 then raise exception 'Groom deleted bride member'; end if;
 update public.travel_groups set origin='forged' where family_id='22000000-0000-4000-8000-000000000001'; get diagnostics changed=row_count; if changed<>0 then raise exception 'Groom updated bride travel'; end if;
 delete from public.travel_groups where family_id='22000000-0000-4000-8000-000000000001'; get diagnostics changed=row_count; if changed<>0 then raise exception 'Groom deleted bride travel'; end if;
 begin insert into public.family_members(wedding_id,family_id,full_name) values(current_setting('test.wid')::uuid,'22000000-0000-4000-8000-000000000001','forged'); raise exception 'Groom wrote bride child'; exception when insufficient_privilege then null; end;
 begin insert into public.logistics_assignments(wedding_id,travel_group_id,assignment_type) values(current_setting('test.other')::uuid,'33000000-0000-4000-8000-000000000001','pickup'); raise exception 'Cross wedding assignment'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000002',true);
update public.logistics_assignments set status='assigned',vehicle='Van',driver_name='Driver',pickup_datetime=now() where id='44000000-0000-4000-8000-000000000001' and revision=1;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000003',true);
do $$ begin
 if not exists(select 1 from public.logistics_assignments where status='assigned' and revision=2) then raise exception 'Shared update invisible to groom'; end if;
end $$;
-- Owner remains able to maintain both sides; composite FK rejects foreign parent even for owner.
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000001',true);
do $$ begin
 begin insert into public.family_members(wedding_id,family_id,full_name) values(current_setting('test.wid')::uuid,'22000000-0000-4000-8000-000000000003','forged'); raise exception 'Foreign parent accepted'; exception when check_violation or foreign_key_violation or insufficient_privilege then null; end;
 begin insert into public.logistics_assignments(wedding_id,travel_group_id,assignment_type) values(current_setting('test.other')::uuid,'33000000-0000-4000-8000-000000000002','pickup'); raise exception 'Foreign assignment accepted'; exception when foreign_key_violation then null; end;
end $$;
-- Expiry and revocation remain enforced for an otherwise valid, verified recipient.
select public.planner_invite(:'wid','outsider@example.invalid','bride_planner') as expired_token \gset
select public.planner_invite(:'wid','outsider@example.invalid','groom_planner') as revoked_token \gset
select id as revoke_id from public.planner_invitations where email='outsider@example.invalid' and role='groom_planner' \gset
select public.planner_revoke_invite(:'wid',:'revoke_id');
select set_config('test.expired',:'expired_token',true),set_config('test.revoked',:'revoked_token',true);
reset role;
update public.planner_invitations set expires_at=now()-interval '1 second' where email='outsider@example.invalid';
set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000004',true);
do $$ begin
 begin perform public.planner_accept_invite(current_setting('test.expired')); raise exception 'Expired invitation accepted'; exception when insufficient_privilege then null; end;
 begin perform public.planner_accept_invite(current_setting('test.revoked')); raise exception 'Revoked invitation accepted'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000001',true);
select public.planner_remove_member(:'wid','11000000-0000-4000-8000-000000000002');
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000002',true);
do $$ begin if exists(select 1 from public.families) or exists(select 1 from public.logistics_assignments) then raise exception 'Revoked member retained access'; end if; end $$;
set local role anon;
do $$ declare t text; begin
 foreach t in array array['families','family_members','travel_groups','logistics_assignments','wedding_members','planner_invitations'] loop
  begin execute format('select count(*) from public.%I',t); raise exception 'Anonymous private read: %',t; exception when insufficient_privilege then null; end;
 end loop;
 begin perform public.planner_workspaces(); raise exception 'Anonymous RPC'; exception when insufficient_privilege then null; end;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-4000-8000-000000000001',true);
select public.planner_delete_workspace(:'wid');
do $$ begin
 if exists(select 1 from public.families where wedding_id=current_setting('test.wid')::uuid) then raise exception 'Deletion not complete'; end if;
 if not exists(select 1 from public.weddings where id=current_setting('test.wid')::uuid) then raise exception 'Existing invitation wedding deleted'; end if;
end $$;
rollback;
\echo 'PASS planner SQL: owner/bride/groom/outsider/anonymous, shared reads/writes, denied role escalation, invitation binding/replay, foreign parents, stale updates, revocation and planner-only deletion'
