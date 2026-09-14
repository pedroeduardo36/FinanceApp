-- SQL Editor do Supabase: cria os orçamentos permanentes e suas porcentagens mensais.
-- Pode ser executado novamente com segurança.
begin;

create table if not exists public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  criado_em timestamptz not null default now(),
  constraint orcamentos_nome_valido check (length(btrim(nome)) between 1 and 80),
  constraint orcamentos_id_user_unique unique (id, user_id)
);

create unique index if not exists orcamentos_user_nome_unique
  on public.orcamentos (user_id, lower(btrim(nome)));
create index if not exists orcamentos_user_id_idx
  on public.orcamentos (user_id, id);

create table if not exists public.orcamento_percentuais (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  orcamento_id uuid not null,
  competencia date not null,
  percentual numeric(9,6) not null default 0,
  constraint orcamento_percentuais_mes check (competencia = date_trunc('month', competencia)::date),
  constraint orcamento_percentuais_intervalo check (percentual between 0 and 100),
  constraint orcamento_percentuais_orcamento_mes unique (orcamento_id, competencia),
  constraint orcamento_percentuais_owner_fk foreign key (orcamento_id, user_id)
    references public.orcamentos (id, user_id) on delete cascade on update restrict
);

-- Atualiza instalações anteriores, que armazenavam somente duas casas decimais.
alter table public.orcamento_percentuais
  alter column percentual type numeric(9,6) using percentual::numeric(9,6);

create index if not exists orcamento_percentuais_user_mes_idx
  on public.orcamento_percentuais (user_id, competencia);

-- A validação é adiada até o fim da transação para permitir redistribuições em lote.
-- O lock serializa gravações concorrentes da mesma conta e competência.
create or replace function public.validar_total_orcamento()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  total numeric;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.user_id::text || ':' || new.competencia::text, 0)
  );
  select coalesce(sum(item.percentual), 0)
    into total
    from public.orcamento_percentuais item
   where item.user_id = new.user_id
     and item.competencia = new.competencia;
  if total > 100 then
    raise exception using errcode = '23514', message = 'TOTAL_ORCAMENTO_ACIMA_DE_100';
  end if;
  return null;
end;
$$;
revoke all on function public.validar_total_orcamento() from public, anon, authenticated;
drop trigger if exists validar_total_orcamento on public.orcamento_percentuais;
create constraint trigger validar_total_orcamento
after insert or update on public.orcamento_percentuais
deferrable initially deferred
for each row execute function public.validar_total_orcamento();

alter table public.orcamentos enable row level security;
alter table public.orcamento_percentuais enable row level security;
revoke all on public.orcamentos, public.orcamento_percentuais from public, anon;
grant select, insert, update, delete on public.orcamentos, public.orcamento_percentuais to authenticated;

drop policy if exists finance_owner_guard on public.orcamentos;
drop policy if exists finance_owner_access on public.orcamentos;
create policy finance_owner_guard on public.orcamentos as restrictive for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy finance_owner_access on public.orcamentos for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists finance_owner_guard on public.orcamento_percentuais;
drop policy if exists finance_owner_access on public.orcamento_percentuais;
create policy finance_owner_guard on public.orcamento_percentuais as restrictive for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy finance_owner_access on public.orcamento_percentuais for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';
commit;
