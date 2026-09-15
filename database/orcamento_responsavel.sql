-- SQL Editor do Supabase: vincula categorias e despesas aos orçamentos do mesmo usuário.
-- Execute depois de orcamentos.sql e categorias_tipo_despesa_caixinha.sql.
-- Pode ser executado novamente com segurança.
begin;

alter table public.categorias add column if not exists orcamento_id uuid;
alter table public.transacoes add column if not exists orcamento_id uuid;

create index if not exists categorias_user_orcamento_idx
  on public.categorias (user_id, orcamento_id)
  where orcamento_id is not null;
create index if not exists transacoes_user_mes_orcamento_idx
  on public.transacoes (user_id, data_transacao, orcamento_id)
  where orcamento_id is not null and tipo = 'despesa';

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.categorias'::regclass
      and conname = 'categorias_orcamento_owner_fk'
  ) then
    alter table public.categorias add constraint categorias_orcamento_owner_fk
      foreign key (orcamento_id, user_id)
      references public.orcamentos (id, user_id)
      on delete restrict on update restrict not valid;
  end if;
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.categorias'::regclass
      and conname = 'categorias_orcamento_apenas_despesa'
  ) then
    alter table public.categorias add constraint categorias_orcamento_apenas_despesa
      check (orcamento_id is null or tipo = 'despesa') not valid;
  end if;
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.transacoes'::regclass
      and conname = 'transacoes_orcamento_owner_fk'
  ) then
    alter table public.transacoes add constraint transacoes_orcamento_owner_fk
      foreign key (orcamento_id, user_id)
      references public.orcamentos (id, user_id)
      on delete restrict on update restrict not valid;
  end if;
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.transacoes'::regclass
      and conname = 'transacoes_orcamento_apenas_despesa'
  ) then
    alter table public.transacoes add constraint transacoes_orcamento_apenas_despesa
      check (orcamento_id is null or tipo = 'despesa') not valid;
  end if;
end $$;

-- A assinatura anterior não inclui o orçamento e precisa ser substituída.
drop function if exists public.registrar_despesa_caixinha(uuid, text, numeric, date, text, text, text, text);
create or replace function public.registrar_despesa_caixinha(
  p_caixinha_id uuid,
  p_descricao text,
  p_valor numeric,
  p_data_transacao date,
  p_categoria text,
  p_subcategoria text,
  p_responsavel text,
  p_icone text,
  p_orcamento_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_saldo numeric;
  v_transacao_id uuid;
  v_linhas integer;
begin
  if v_user_id is null then raise exception 'SESSAO_INVALIDA'; end if;
  if p_valor is null or p_valor <= 0 or p_valor > 90071992547409.91
     or p_valor::text in ('NaN', 'Infinity', '-Infinity')
     or p_valor <> round(p_valor, 2) then
    raise exception 'VALOR_INVALIDO';
  end if;
  if p_caixinha_id is null or p_data_transacao is null
     or p_descricao is null or length(btrim(p_descricao)) = 0
     or p_responsavel is null or length(btrim(p_responsavel)) = 0 then
    raise exception 'DADOS_INVALIDOS';
  end if;
  if p_orcamento_id is not null and not exists (
    select 1 from public.orcamentos o
    where o.id = p_orcamento_id and o.user_id = v_user_id
  ) then
    raise exception 'ORCAMENTO_INDISPONIVEL';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('movimentar_caixinha:' || v_user_id::text, 0)
  );

  select c.saldo_inicial into v_saldo
  from public.caixinhas c
  where c.id = p_caixinha_id and c.user_id = v_user_id
  for update;
  if not found then raise exception 'CAIXINHA_INDISPONIVEL'; end if;
  if v_saldo is null or v_saldo < p_valor then
    raise exception 'SALDO_CAIXINHA_INSUFICIENTE';
  end if;

  update public.caixinhas
  set saldo_inicial = saldo_inicial - p_valor
  where id = p_caixinha_id and user_id = v_user_id;
  get diagnostics v_linhas = row_count;
  if v_linhas <> 1 then raise exception 'CAIXINHA_INDISPONIVEL'; end if;

  insert into public.transacoes (
    user_id, descricao, valor, tipo, categoria, subcategoria,
    responsavel, icone, data_transacao, caixinha_id, orcamento_id
  ) values (
    v_user_id, btrim(p_descricao), p_valor, 'despesa',
    coalesce(nullif(btrim(p_categoria), ''), 'Geral'), nullif(btrim(p_subcategoria), ''),
    btrim(p_responsavel), coalesce(nullif(btrim(p_icone), ''), 'tag'),
    p_data_transacao, p_caixinha_id, p_orcamento_id
  ) returning id into v_transacao_id;

  if v_transacao_id is null then raise exception 'TRANSACAO_NAO_REGISTRADA'; end if;
  return v_transacao_id;
end;
$$;

revoke all on function public.registrar_despesa_caixinha(uuid, text, numeric, date, text, text, text, text, uuid) from public, anon;
grant execute on function public.registrar_despesa_caixinha(uuid, text, numeric, date, text, text, text, text, uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
