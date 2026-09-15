-- SUPABASE SQL EDITOR: execute este arquivo inteiro antes de publicar o frontend.
-- Adiciona o tipo das categorias e permite registrar uma despesa debitada de uma caixinha.
begin;

alter table public.categorias add column if not exists tipo text;

-- Preserva categorias antigas exclusivamente usadas em receitas; as demais começam como despesa.
update public.categorias c
set tipo = case when (exists (
    select 1 from public.transacoes t
    where t.user_id = c.user_id
      and t.tipo = 'receita'
      and btrim(t.categoria) = btrim(c.nome)
      and coalesce(nullif(btrim(t.subcategoria), ''), '') = coalesce(nullif(btrim(c.subcategoria), ''), '')
  ) and not exists (
    select 1 from public.transacoes t
    where t.user_id = c.user_id
      and t.tipo in ('despesa', 'fatura_cartao')
      and btrim(t.categoria) = btrim(c.nome)
      and coalesce(nullif(btrim(t.subcategoria), ''), '') = coalesce(nullif(btrim(c.subcategoria), ''), '')
  )) or (
    not exists (
      select 1 from public.transacoes t
      where t.user_id = c.user_id and btrim(t.categoria) = btrim(c.nome)
        and coalesce(nullif(btrim(t.subcategoria), ''), '') = coalesce(nullif(btrim(c.subcategoria), ''), '')
    )
    and exists (
      select 1 from public.transacoes t
      where t.user_id = c.user_id and t.tipo = 'receita' and btrim(t.categoria) = btrim(c.nome)
    )
    and not exists (
      select 1 from public.transacoes t
      where t.user_id = c.user_id and t.tipo in ('despesa', 'fatura_cartao') and btrim(t.categoria) = btrim(c.nome)
    )
  ) then 'receita' else 'despesa' end
where c.tipo is null;

alter table public.categorias alter column tipo set default 'despesa';
alter table public.categorias alter column tipo set not null;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.categorias'::regclass
      and conname = 'finance_categorias_tipo'
  ) then
    alter table public.categorias add constraint finance_categorias_tipo
      check (tipo in ('receita', 'despesa')) not valid;
  end if;
end $$;

create index if not exists finance_categorias_owner_tipo
  on public.categorias (user_id, tipo, id);

alter table public.transacoes add column if not exists caixinha_id uuid;
create unique index if not exists finance_caixinhas_id_owner
  on public.caixinhas (id, user_id);
create index if not exists finance_transacoes_caixinha
  on public.transacoes (caixinha_id) where caixinha_id is not null;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.transacoes'::regclass
      and conname = 'finance_transacao_caixinha_owner_fk'
  ) then
    alter table public.transacoes add constraint finance_transacao_caixinha_owner_fk
      foreign key (caixinha_id, user_id)
      references public.caixinhas (id, user_id)
      on delete restrict on update restrict not valid;
  end if;
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.transacoes'::regclass
      and conname = 'finance_transacao_caixinha_despesa'
  ) then
    alter table public.transacoes add constraint finance_transacao_caixinha_despesa
      check (caixinha_id is null or tipo = 'despesa') not valid;
  end if;
end $$;

create or replace function public.registrar_despesa_caixinha(
  p_caixinha_id uuid,
  p_descricao text,
  p_valor numeric,
  p_data_transacao date,
  p_categoria text,
  p_subcategoria text,
  p_responsavel text,
  p_icone text
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

  -- Usa a mesma trava das demais movimentações para serializar o saldo por usuário.
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
    responsavel, icone, data_transacao, caixinha_id
  ) values (
    v_user_id, btrim(p_descricao), p_valor, 'despesa',
    coalesce(nullif(btrim(p_categoria), ''), 'Geral'), nullif(btrim(p_subcategoria), ''),
    btrim(p_responsavel), coalesce(nullif(btrim(p_icone), ''), 'tag'),
    p_data_transacao, p_caixinha_id
  ) returning id into v_transacao_id;

  if v_transacao_id is null then raise exception 'TRANSACAO_NAO_REGISTRADA'; end if;
  return v_transacao_id;
end;
$$;

revoke all on function public.registrar_despesa_caixinha(uuid, text, numeric, date, text, text, text, text) from public, anon;
grant execute on function public.registrar_despesa_caixinha(uuid, text, numeric, date, text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
commit;
