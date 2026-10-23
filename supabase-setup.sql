-- KARMADENT · configurazione database
-- Incolla tutto questo testo in Supabase → SQL Editor → New query, poi premi "Run".

-- 1) Contenuti del sito (testi, video, foto, numeri)
create table if not exists public.site_content (
  id int primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);
alter table public.site_content enable row level security;
drop policy if exists "contenuti: lettura pubblica" on public.site_content;
create policy "contenuti: lettura pubblica" on public.site_content for select using (true);
drop policy if exists "contenuti: modifica staff" on public.site_content;
create policy "contenuti: modifica staff" on public.site_content for all to authenticated using (true) with check (true);

-- 2) Richieste di preventivo dal modulo
create table if not exists public.richieste (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  sede text,
  nome text not null,
  telefono text not null,
  email text,
  trattamento text,
  messaggio text,
  gestita boolean not null default false
);
alter table public.richieste enable row level security;
drop policy if exists "richieste: invio pubblico" on public.richieste;
create policy "richieste: invio pubblico" on public.richieste for insert to anon, authenticated
  with check (gestita = false and char_length(nome) < 200 and char_length(telefono) < 40 and char_length(coalesce(messaggio,'')) < 3000);
drop policy if exists "richieste: lettura staff" on public.richieste;
create policy "richieste: lettura staff" on public.richieste for select to authenticated using (true);
drop policy if exists "richieste: modifica staff" on public.richieste;
create policy "richieste: modifica staff" on public.richieste for update to authenticated using (true) with check (true);
drop policy if exists "richieste: elimina staff" on public.richieste;
create policy "richieste: elimina staff" on public.richieste for delete to authenticated using (true);

-- 3) Archivio per foto e video (pubblico in lettura, max 50 MB a file)
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', true, 52428800)
on conflict (id) do update set public = true, file_size_limit = 52428800;
drop policy if exists "media: lettura pubblica" on storage.objects;
create policy "media: lettura pubblica" on storage.objects for select using (bucket_id = 'media');
drop policy if exists "media: caricamento staff" on storage.objects;
create policy "media: caricamento staff" on storage.objects for insert to authenticated with check (bucket_id = 'media');
drop policy if exists "media: modifica staff" on storage.objects;
create policy "media: modifica staff" on storage.objects for update to authenticated using (bucket_id = 'media');
drop policy if exists "media: elimina staff" on storage.objects;
create policy "media: elimina staff" on storage.objects for delete to authenticated using (bucket_id = 'media');
