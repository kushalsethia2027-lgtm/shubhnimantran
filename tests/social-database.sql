\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values ('aa000000-0000-4000-8000-000000000001'),('aa000000-0000-4000-8000-000000000002'),('aa000000-0000-4000-8000-000000000003'),('aa000000-0000-4000-8000-000000000004');
set local role authenticated;
select set_config('request.jwt.claim.sub','aa000000-0000-4000-8000-000000000001',true);
select social_profile('Host One','A friendly host','1995-01-01');
select set_config('request.jwt.claim.sub','aa000000-0000-4000-8000-000000000002',true);
select social_profile('Guest One','Board games and coffee','1997-01-01');
select set_config('request.jwt.claim.sub','aa000000-0000-4000-8000-000000000003',true);
select social_profile('Other Host','Another friendly host','1990-01-01');
select set_config('request.jwt.claim.sub','aa000000-0000-4000-8000-000000000004',true);
do $$ begin
 begin perform social_profile('Underage','test',(current_date-interval '17 years')::date);raise exception 'FAIL underage accepted';exception when raise_exception then if sqlerrm like 'FAIL%' then raise;end if;end;
end $$;
select social_profile('Guest Two','I love social games','1994-01-01');
select set_config('request.jwt.claim.sub','aa000000-0000-4000-8000-000000000001',true);
select social_publish(jsonb_build_object('title','A real board game social','description','A welcoming afternoon of board games with a host who explains every game.','category','games','city','Gurgaon','neighbourhood','Sector 29','starts_at',now()+interval '2 days','ends_at',now()+interval '2 days 3 hours','price',0,'capacity',2,'min_age',18,'food','Snacks','drinks','Water','includes','Hosted games','extra_costs','Nothing','bring','Curiosity','rules','Respect everyone and ask before taking photos.','cancellation','Cancel before the event begins.','atmosphere','Playful','language','English and Hindi','accessibility','Ground floor','solo',true,'alcohol_free',true,'lat',28.467891,'lng',77.062891,'address','Private venue exact address only for confirmed guests')) as event \gset
select set_config('test.event',:'event',true);
select social_edit_event(:'event',1,jsonb_build_object('title','A real board game social','description','A welcoming afternoon of board games with a host who explains every game.','food','Vegetarian snacks','drinks','Water','includes','Hosted games','extra_costs','Nothing','bring','Curiosity','rules','Respect everyone and ask before taking photos.','cancellation','Cancel before the event begins.'));
do $$ begin
 begin perform social_edit_event(current_setting('test.event')::uuid,1,'{}');raise exception 'FAIL stale listing edit';exception when raise_exception then if sqlerrm like 'FAIL%' then raise;end if;end;
end $$;
do $$ begin
 if (select lat from social_events() where id=current_setting('test.event')::uuid)<>28.47 then raise exception 'FAIL location not rounded';end if;
 begin update social_listings set price=1 where id=current_setting('test.event')::uuid;raise exception 'FAIL direct listing update';exception when insufficient_privilege then null;end;
 begin update social_accounts set dob='1980-01-01';raise exception 'FAIL editable age';exception when insufficient_privilege then null;end;
 begin perform social_profile('Host One','A friendly host','1980-01-01');raise exception 'FAIL DOB changed';exception when raise_exception then if sqlerrm like 'FAIL%' then raise;end if;end;
 begin perform social_request(current_setting('test.event')::uuid,'I am the host trying to join.');raise exception 'FAIL host booked own event';exception when raise_exception then if sqlerrm like 'FAIL%' then raise;end if;end;
end $$;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 if (select count(*) from social_events())<>1 then raise exception 'FAIL anon event read';end if;
 begin perform * from social_venues;raise exception 'FAIL anon private venue';exception when insufficient_privilege then null;end;
 begin perform * from social_accounts;raise exception 'FAIL anon DOB';exception when insufficient_privilege then null;end;
 begin perform * from social_bookings;raise exception 'FAIL anon bookings';exception when insufficient_privilege then null;end;
 begin perform social_request(current_setting('test.event')::uuid,'An anonymous booking attempt');raise exception 'FAIL anon requested';exception when insufficient_privilege then null;end;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','aa000000-0000-4000-8000-000000000002',true);
do $$ begin
 if exists(select 1 from social_venues) then raise exception 'FAIL unconfirmed address read';end if;
 if (select count(*) from social_accounts)<>1 then raise exception 'FAIL foreign DOB leaked';end if;
 begin insert into social_bookings(event_id,user_id,introduction,status) values(current_setting('test.event')::uuid,auth.uid(),'Forged confirmed booking','confirmed');raise exception 'FAIL forged confirmation';exception when insufficient_privilege then null;end;
 begin perform social_review(current_setting('test.event')::uuid,5,'A fabricated attendance review');raise exception 'FAIL unverified review';exception when raise_exception then if sqlerrm like 'FAIL%' then raise;end if;end;
end $$;
select social_request(:'event','I am new to Gurgaon and would love to learn a board game.') as booking \gset
select set_config('test.booking',:'booking',true);
do $$ begin
 begin perform social_request(current_setting('test.event')::uuid,'A duplicate request for the same event.');raise exception 'FAIL duplicate booking';exception when unique_violation then null;end;
 if exists(select 1 from social_venues) then raise exception 'FAIL requested address leak';end if;
 if (select checkin_code from social_my_bookings() limit 1) is not null then raise exception 'FAIL pending ticket code';end if;
 begin perform checkin_code from social_bookings;raise exception 'FAIL pending code direct API read';exception when insufficient_privilege then null;end;
 begin perform social_booking_action(current_setting('test.booking')::uuid,'approve');raise exception 'FAIL guest self approved';exception when raise_exception then if sqlerrm like 'FAIL%' then raise;end if;end;
end $$;
select set_config('request.jwt.claim.sub','aa000000-0000-4000-8000-000000000003',true);
do $$ begin
 if exists(select 1 from social_bookings) then raise exception 'FAIL other host booking read';end if;
 if exists(select 1 from social_event_guests(current_setting('test.event')::uuid)) then raise exception 'FAIL other host guest RPC';end if;
 begin perform social_booking_action(current_setting('test.booking')::uuid,'approve');raise exception 'FAIL other host approved';exception when raise_exception then if sqlerrm like 'FAIL%' then raise;end if;end;
 begin perform social_cancel_event(current_setting('test.event')::uuid);raise exception 'FAIL other host cancelled';exception when raise_exception then if sqlerrm like 'FAIL%' then raise;end if;end;
end $$;
select social_request(:'event','I would love to join this welcoming game evening.') as second_booking \gset
select set_config('test.second',:'second_booking',true);
select set_config('request.jwt.claim.sub','aa000000-0000-4000-8000-000000000004',true);
select social_request(:'event','I am interested in learning a new game with everyone.') as third_booking \gset
select set_config('test.third',:'third_booking',true);
select set_config('request.jwt.claim.sub','aa000000-0000-4000-8000-000000000001',true);
do $$ begin
 begin perform social_edit_event(current_setting('test.event')::uuid,2,'{}');raise exception 'FAIL changed event after request';exception when raise_exception then if sqlerrm like 'FAIL%' then raise;end if;end;
end $$;
select social_booking_action(:'booking','approve');
select social_booking_action(:'second_booking','approve');
do $$ begin
 begin perform social_booking_action(current_setting('test.third')::uuid,'approve');raise exception 'FAIL capacity exceeded';exception when raise_exception then if sqlerrm like 'FAIL%' then raise;end if;end;
 if (select confirmed_count from social_events() limit 1)<>2 then raise exception 'FAIL count mismatch';end if;
end $$;
select set_config('request.jwt.claim.sub','aa000000-0000-4000-8000-000000000002',true);
do $$ begin
 if not exists(select 1 from social_venues) then raise exception 'FAIL confirmed address unavailable';end if;
 if (select checkin_code from social_my_bookings() limit 1) is null then raise exception 'FAIL confirmed ticket missing';end if;
end $$;
select checkin_code as code from social_my_bookings() where id=:'booking' \gset
select set_config('test.code',:'code',true);
select set_config('request.jwt.claim.sub','aa000000-0000-4000-8000-000000000001',true);
do $$ begin
 begin perform social_booking_action(current_setting('test.booking')::uuid,'checkin',current_setting('test.code')::uuid);raise exception 'FAIL early checkin';exception when raise_exception then if sqlerrm like 'FAIL%' then raise;end if;end;
end $$;
reset role;
update social_listings set starts_at=now()-interval '1 hour',ends_at=now()+interval '1 hour' where id=:'event';
set local role authenticated;
select set_config('request.jwt.claim.sub','aa000000-0000-4000-8000-000000000001',true);
do $$ begin
 begin perform social_booking_action(current_setting('test.booking')::uuid,'checkin','00000000-0000-4000-8000-000000000000');raise exception 'FAIL wrong code accepted';exception when raise_exception then if sqlerrm like 'FAIL%' then raise;end if;end;
end $$;
select social_booking_action(:'booking','checkin',:'code');
reset role;
update social_listings set ends_at=now()-interval '1 minute' where id=:'event';
set local role authenticated;
select set_config('request.jwt.claim.sub','aa000000-0000-4000-8000-000000000002',true);
select social_review(:'event',5,'A welcoming host and thoughtfully explained games.');
do $$ begin
 begin perform social_review(current_setting('test.event')::uuid,5,'A duplicate verified review attempt.');raise exception 'FAIL duplicate review';exception when unique_violation then null;end;
end $$;
select social_report(:'event','A test report saved for the operator to review.');
select set_config('request.jwt.claim.sub','aa000000-0000-4000-8000-000000000003',true);
do $$ begin
 if exists(select 1 from social_reports) then raise exception 'FAIL other user report leaked';end if;
 begin perform social_review(current_setting('test.event')::uuid,4,'Confirmed but not checked in.');raise exception 'FAIL unchecked review';exception when raise_exception then if sqlerrm like 'FAIL%' then raise;end if;end;
end $$;
reset role;
update social_listings set starts_at=now()+interval '2 days',ends_at=now()+interval '2 days 2 hours',price=100 where id=:'event';
update social_bookings set status='requested' where id=:'third_booking';
update social_bookings set status='cancelled' where id in (:'booking',:'second_booking');
set local role authenticated;
select set_config('request.jwt.claim.sub','aa000000-0000-4000-8000-000000000001',true);
do $$ begin
 begin perform social_booking_action(current_setting('test.third')::uuid,'approve');raise exception 'FAIL paid booking approved without payment';exception when raise_exception then if sqlerrm like 'FAIL%' then raise;end if;end;
end $$;
select social_cancel_event(:'event');
select set_config('request.jwt.claim.sub','aa000000-0000-4000-8000-000000000004',true);
do $$ begin
 if (select status from social_my_bookings() limit 1)<>'cancelled' then raise exception 'FAIL cancel event did not update booking';end if;
end $$;
rollback;
\echo 'Social RLS, age, host ownership, booking capacity, address privacy, ticket, review, report and paid-confirmation denial checks passed.'
