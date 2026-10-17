begin;
create function public.register_voice(wid uuid, vid uuid, speaker_name text, speaker_relation text, object_path text, media_type text, seconds int) returns uuid language plpgsql security definer set search_path=public as $$ begin
 perform public.require_owner(wid); perform 1 from public.weddings where id=wid for update;
 if (select count(*) from public.voice_recordings where wedding_id=wid and status<>'deleted')>=5 then raise exception 'Delete an existing voice before adding another (limit 5)'; end if;
 if object_path<>wid::text||'/'||vid::text then raise exception 'Invalid recording path'; end if;
 insert into public.voice_recordings(id,wedding_id,speaker,relationship,storage_path,mime_type,duration) values(vid,wid,speaker_name,speaker_relation,object_path,media_type,seconds);
 insert into public.voice_consents(wedding_id,recording_id,actor_id,consent_text,version,action) values(wid,vid,auth.uid(),'I am the speaker identified here. I freely agree to the recording and use of my voice to create personalised invitations only for this wedding. I understand that an external voice provider may process it, that provider verification is required before cloning, and that I can revoke consent and request deletion. I have included the spoken consent statement in this recording.','2026-10-v1','granted');
 insert into public.audit_events(wedding_id,actor_id,action,entity_id) values(wid,auth.uid(),'voice.consent_granted',vid); return vid;
end $$;
revoke execute on function public.register_voice(uuid,uuid,text,text,text,text,int) from public,anon,authenticated;
grant execute on function public.register_voice(uuid,uuid,text,text,text,text,int) to authenticated;
commit;
