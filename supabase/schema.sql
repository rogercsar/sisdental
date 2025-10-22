-- Supabase Schema para SisDental (PostgreSQL)

-- Tabela de perfis (staff/paciente), vinculada ao auth.users
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('staff','paciente')),
  nome text,
  created_at timestamp with time zone default now()
);

-- Trigger para criar perfil automaticamente ao criar usuário no Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, nome)
  values (new.id, 'staff', null)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- Pacientes
create table if not exists pacientes (
  id bigserial primary key,
  nome text not null,
  cpf text unique,
  telefone text,
  email text,
  data_nascimento date
);

-- Agendamentos
create table if not exists agendamentos (
  id bigserial primary key,
  paciente_id bigint not null references pacientes(id) on delete restrict,
  servico text not null,
  data date not null,
  hora time not null,
  status text,
  observacoes text
);

-- Odontograma (tratamentos)
create table if not exists odontograma_tratamentos (
  id bigserial primary key,
  paciente_id bigint not null references pacientes(id) on delete cascade,
  dente_numero int,
  tipo_tratamento text,
  data_tratamento date,
  observacoes text,
  valor numeric(10,2),
  concluido boolean default false,
  data_criacao timestamp with time zone default now()
);

-- Financeiro
create table if not exists financeiro (
  id bigserial primary key,
  paciente_id bigint not null references pacientes(id) on delete cascade,
  descricao text not null,
  valor numeric(10,2) not null,
  status text default 'Pendente',
  data_vencimento date,
  data_pagamento date,
  tratamento_id bigint references odontograma_tratamentos(id) on delete set null
);

-- Documentos do paciente
create table if not exists documentos_paciente (
  id bigserial primary key,
  paciente_id bigint not null references pacientes(id) on delete cascade,
  tipo_documento text not null,
  data_geracao timestamp with time zone default now(),
  nome_arquivo text not null,
  storage_path text,
  descricao text
);

-- Serviços (catálogo de tratamentos)
create table if not exists servicos (
  id bigserial primary key,
  nome text not null,
  descricao text,
  preco_padrao numeric(10,2),
  ativo boolean default true,
  created_at timestamp with time zone default now()
);

-- Criar bucket de storage para documentos
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

-- Ativar RLS
alter table profiles enable row level security;
alter table pacientes enable row level security;
alter table agendamentos enable row level security;
alter table odontograma_tratamentos enable row level security;
alter table financeiro enable row level security;
alter table documentos_paciente enable row level security;
alter table servicos enable row level security;

-- Vincular perfil ao paciente
alter table profiles add column if not exists paciente_id bigint references pacientes(id) on delete set null;

-- Remover policies existentes e tornar schema idempotente
drop policy if exists "profiles_rw" on profiles;
drop policy if exists "pacientes_rw" on pacientes;
drop policy if exists "agendamentos_rw" on agendamentos;
drop policy if exists "odontograma_rw" on odontograma_tratamentos;
drop policy if exists "financeiro_rw" on financeiro;
drop policy if exists "documentos_rw" on documentos_paciente;
drop policy if exists "servicos_rw" on servicos;

-- Políticas nomeadas deste schema (drop antes de create para evitar erro 42710)
drop policy if exists "Read own profile" on profiles;
drop policy if exists "Staff manage profiles" on profiles;

drop policy if exists "Staff full access pacientes" on pacientes;
drop policy if exists "Paciente read own" on pacientes;

drop policy if exists "Staff full access agendamentos" on agendamentos;
drop policy if exists "Paciente read own agendamentos" on agendamentos;

drop policy if exists "Staff full access odontograma" on odontograma_tratamentos;
drop policy if exists "Paciente read own odontograma" on odontograma_tratamentos;

drop policy if exists "Staff full access financeiro" on financeiro;
drop policy if exists "Paciente read own financeiro" on financeiro;

drop policy if exists "Staff full access documentos_paciente" on documentos_paciente;
drop policy if exists "Paciente read own documentos_paciente" on documentos_paciente;
drop policy if exists "Staff full access servicos" on servicos;

-- Storage policies nomeadas
drop policy if exists "Staff read documentos" on storage.objects;
drop policy if exists "Staff insert documentos" on storage.objects;
drop policy if exists "Staff update documentos" on storage.objects;
drop policy if exists "Staff delete documentos" on storage.objects;
drop policy if exists "Paciente read own documentos" on storage.objects;

-- Perfis: leitura do próprio perfil; gestão por staff
create policy "Read own profile" on profiles
  for select to authenticated
  using (id = auth.uid());

-- REMOVIDO: policy "Staff manage profiles" causava recursão por referenciar a própria tabela
-- A gestão de perfis será feita via service role / RPC específica, evitando RLS recursiva.

-- Pacientes
create policy "Staff full access pacientes" on pacientes
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'staff'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'staff'));

create policy "Paciente read own" on pacientes
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'paciente' and pacientes.id = p.paciente_id));

-- Agendamentos
create policy "Staff full access agendamentos" on agendamentos
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'staff'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'staff'));

create policy "Paciente read own agendamentos" on agendamentos
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'paciente' and agendamentos.paciente_id = p.paciente_id));

-- Odontograma
create policy "Staff full access odontograma" on odontograma_tratamentos
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'staff'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'staff'));

create policy "Paciente read own odontograma" on odontograma_tratamentos
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'paciente' and odontograma_tratamentos.paciente_id = p.paciente_id));

-- Financeiro
create policy "Staff full access financeiro" on financeiro
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'staff'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'staff'));

create policy "Paciente read own financeiro" on financeiro
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'paciente' and financeiro.paciente_id = p.paciente_id));

-- Servicos
create policy "Staff full access servicos" on servicos
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'staff'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'staff'));

-- Documentos (metadata)
create policy "Staff full access documentos_paciente" on documentos_paciente
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'staff'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'staff'));

create policy "Paciente read own documentos_paciente" on documentos_paciente
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'paciente' and documentos_paciente.paciente_id = p.paciente_id));

-- Storage: tornar bucket privado e políticas de acesso
update storage.buckets set public = false where name = 'documentos';

-- Remover políticas amplas de storage existentes
drop policy if exists "Authenticated can read" on storage.objects;
drop policy if exists "Authenticated can insert" on storage.objects;
drop policy if exists "Authenticated can update" on storage.objects;
drop policy if exists "Authenticated can delete" on storage.objects;

-- Staff pode ler/escrever/atualizar/deletar no bucket 'documentos'
create policy "Staff read documentos" on storage.objects
  for select to authenticated
  using (bucket_id = 'documentos' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'staff'));

create policy "Staff insert documentos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documentos' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'staff'));

create policy "Staff update documentos" on storage.objects
  for update to authenticated
  using (bucket_id = 'documentos' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'staff'));

create policy "Staff delete documentos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documentos' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'staff'));

-- Paciente pode ler apenas seus próprios arquivos do bucket 'documentos'
create policy "Paciente read own documentos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documentos'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'paciente'
        and name like ('pacientes/' || p.paciente_id || '/%')
    )
  );

-- Atualizações de schema para multi-dentes e dentista
alter table if exists odontograma_tratamentos add column if not exists dente_numeros jsonb;
alter table if exists odontograma_tratamentos add column if not exists dentista text;

-- Orçamentos
create table if not exists orcamentos (
  id bigserial primary key,
  paciente_id bigint not null references pacientes(id) on delete cascade,
  titulo text,
  data date default now(),
  valor_total numeric(10,2),
  status text default 'Em aberto',
  observacoes text,
  created_at timestamp with time zone default now()
);

alter table if exists odontograma_tratamentos add column if not exists orcamento_id bigint references orcamentos(id) on delete set null;

-- Campos de pagamento nos Agendamentos
alter table if exists agendamentos add column if not exists status_pagamento text;
alter table if exists agendamentos add column if not exists valor_previsto numeric(10,2);

-- Policies de RLS para orcamentos
alter table orcamentos enable row level security;
drop policy if exists "Staff full access orcamentos" on orcamentos;
drop policy if exists "Paciente read own orcamentos" on orcamentos;
create policy "Staff full access orcamentos" on orcamentos
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'staff'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'staff'));
create policy "Paciente read own orcamentos" on orcamentos
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'paciente' and orcamentos.paciente_id = p.paciente_id));