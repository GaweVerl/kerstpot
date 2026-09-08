-- Eenmalig uitvoeren in de SQL Editor van een Supabase-project.
begin;
create table if not exists public.kerstpot_state (
  id integer primary key check (id = 1), drawn boolean not null default false
);
insert into public.kerstpot_state(id) values(1) on conflict do nothing;
create table if not exists public.kerstpot_people (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(name) between 1 and 40),
  token_hash text unique not null,
  recipient uuid references public.kerstpot_people(id),
  created_at timestamptz not null default now(),
  check (recipient is null or recipient <> id)
);
create unique index if not exists kerstpot_unique_name on public.kerstpot_people(lower(name));
alter table public.kerstpot_state enable row level security;
alter table public.kerstpot_people enable row level security;
revoke all on public.kerstpot_state, public.kerstpot_people from anon, authenticated;

create or replace function public.kerstpot_action(p_action text, p_token_hash text, p_name text default '')
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_drawn boolean; v_me public.kerstpot_people; v_ids uuid[]; v_count integer; v_recipient text;
begin
  -- Eén gedeeld slot maakt aanmelden en trekken atomair, ook bij gelijktijdige klikken.
  select drawn into v_drawn from public.kerstpot_state where id=1 for update;
  select * into v_me from public.kerstpot_people where token_hash=p_token_hash;
  if p_action='join' then
    if v_me.id is not null then return jsonb_build_object('ok',true); end if;
    if v_drawn then return jsonb_build_object('error','De trekking is al open. Er kunnen geen namen meer bij.'); end if;
    if length(trim(p_name)) not between 1 and 40 then return jsonb_build_object('error','Vul een geldige naam in.'); end if;
    if exists(select 1 from public.kerstpot_people where lower(name)=lower(p_name)) then
      return jsonb_build_object('error','Die naam zit al in de pot. Ben jij het? Gebruik je oorspronkelijke toestel of persoonlijke link. Anders: voeg je achternaam toe.');
    end if;
    if (select count(*) from public.kerstpot_people)>=100 then return jsonb_build_object('error','De pot is vol (maximaal 100 deelnemers).'); end if;
    insert into public.kerstpot_people(name,token_hash) values(p_name,p_token_hash);
    return jsonb_build_object('ok',true);
  elsif p_action='draw' then
    if v_drawn then return jsonb_build_object('ok',true); end if;
    select array_agg(id order by random()) into v_ids from public.kerstpot_people;
    v_count=coalesce(array_length(v_ids,1),0);
    if v_count<2 then return jsonb_build_object('error','Er zijn minstens twee deelnemers nodig.'); end if;
    -- Een willekeurige kring: iedereen geeft en ontvangt precies één keer, nooit zichzelf.
    for i in 1..v_count loop
      update public.kerstpot_people set recipient=v_ids[(i % v_count)+1] where id=v_ids[i];
    end loop;
    update public.kerstpot_state set drawn=true where id=1;
    return jsonb_build_object('ok',true);
  elsif p_action='reveal' then
    if not v_drawn then return jsonb_build_object('error','De trekking is nog niet open.'); end if;
    if v_me.id is null then return jsonb_build_object('error','Je naam zit nog niet in de pot. Gebruik je persoonlijke link als je al meedoet.'); end if;
    select name into v_recipient from public.kerstpot_people where id=v_me.recipient;
    return jsonb_build_object('recipient',v_recipient);
  elsif p_action='status' then
    return jsonb_build_object('drawn',v_drawn,'me',v_me.name,'names',coalesce((select jsonb_agg(name order by created_at,id) from public.kerstpot_people),'[]'::jsonb));
  end if;
  return jsonb_build_object('error','Onbekende actie.');
end;
$$;
revoke all on function public.kerstpot_action(text,text,text) from public, anon, authenticated;
grant execute on function public.kerstpot_action(text,text,text) to service_role;
commit;
