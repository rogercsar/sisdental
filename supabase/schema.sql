-- Supabase Schema para SisDental (PostgreSQL)

-- Tabela de perfis (staff/paciente), vinculada ao auth.users
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('staff','paciente')),
  nome text,
  created_at timestamp with time zone default now()
);

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

-- Políticas temporárias: permitir leitura/escrita para usuários autenticados
create policy "profiles_rw" on profiles for all
  to authenticated using (true) with check (true);

create policy "pacientes_rw" on pacientes for all
  to authenticated using (true) with check (true);

create policy "agendamentos_rw" on agendamentos for all
  to authenticated using (true) with check (true);

create policy "odontograma_rw" on odontograma_tratamentos for all
  to authenticated using (true) with check (true);

create policy "financeiro_rw" on financeiro for all
  to authenticated using (true) with check (true);

create policy "documentos_rw" on documentos_paciente for all
  to authenticated using (true) with check (true);

-- Políticas de Storage para o bucket 'documentos'
create policy "Authenticated can read" on storage.objects
  as permissive for select
  to authenticated
  using (bucket_id = 'documentos');

create policy "Authenticated can insert" on storage.objects
  as permissive for insert
  to authenticated
  with check (bucket_id = 'documentos');

create policy "Authenticated can update" on storage.objects
  as permissive for update
  to authenticated
  using (bucket_id = 'documentos');

create policy "Authenticated can delete" on storage.objects
  as permissive for delete
  to authenticated
  using (bucket_id = 'documentos');