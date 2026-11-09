create type public.app_role as enum ('terapeuta', 'secretaria');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id) $$;

-- First account becomes terapeuta; later accounts become secretaria
create or replace function public.handle_new_user_role()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.user_roles where role = 'terapeuta') then
    insert into public.user_roles (user_id, role) values (new.id, 'terapeuta');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'secretaria');
  end if;
  return new;
end;
$$;
create trigger on_auth_user_created_role after insert on auth.users
  for each row execute function public.handle_new_user_role();

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null default '',
  email text,
  birth_date date,
  default_price numeric(10,2) not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.patients to authenticated;
grant all on public.patients to service_role;
alter table public.patients enable row level security;
create policy "Staff manage patients" on public.patients for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  starts_at timestamptz not null,
  duration_min integer not null default 60,
  price numeric(10,2) not null default 100,
  status text not null default 'agendada',
  payment_status text not null default 'pendente',
  payment_method text,
  paid_at timestamptz,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index sessions_starts_at_idx on public.sessions(starts_at);
grant select, insert, update, delete on public.sessions to authenticated;
grant all on public.sessions to service_role;
alter table public.sessions enable row level security;
create policy "Staff manage sessions" on public.sessions for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create table public.clinical_notes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  content text not null,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.clinical_notes to authenticated;
grant all on public.clinical_notes to service_role;
alter table public.clinical_notes enable row level security;
create policy "Only therapist manages notes" on public.clinical_notes for all to authenticated
  using (public.has_role(auth.uid(), 'terapeuta')) with check (public.has_role(auth.uid(), 'terapeuta'));