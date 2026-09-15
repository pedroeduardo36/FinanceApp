-- SQL Editor do Supabase: histórico e edição/exclusão atômica de despesas pagas com caixinha.
-- Execute depois de orcamento_responsavel.sql. Pode ser executado novamente com segurança.
begin;

create unique index if not exists finance_caixinhas_id_owner
  on public.caixinhas (id, user_id);
create unique index if not exists finance_transacoes_id_owner
  on public.transacoes (id, user_id);

create table if not exists public.caixinha_movimentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  caixinha_id uuid not null,
  transacao_id uuid,
  tipo text not null,
  valor numeric(14,2) not null,
  descricao text not null,
  data_movimento date not null,
  criado_em timestamptz not null default now(),
  chave text,
  constraint caixinha_movimentos_caixinha_owner_fk foreign key (caixinha_id, user_id)
    references public.caixinhas (id, user_id) on delete cascade on update restrict,
  constraint caixinha_movimentos_transacao_owner_fk foreign key (transacao_id, user_id)
    references public.transacoes (id, user_id) on delete cascade on update restrict,
  constraint caixinha_movimentos_tipo check (tipo in ('entrada', 'saida', 'gasto', 'ajuste')),
  constraint caixinha_movimentos_valor check (
    valor <> 0 and abs(valor) < 90071992547409.92 and valor = round(valor, 2)
  ),
  constraint caixinha_movimentos_descricao check (length(btrim(descricao)) > 0),
  constraint caixinha_movimentos_sinal check (
    (tipo = 'entrada' and valor > 0) or
    (tipo in ('saida', 'gasto') and valor < 0) or
    tipo = 'ajuste'
  )
);

create unique index if not exists caixinha_movimentos_transacao_unique
  on public.caixinha_movimentos (transacao_id) where transacao_id is not null;
create unique index if not exists caixinha_movimentos_chave_unique
  on public.caixinha_movimentos (chave) where chave is not null;
create index if not exists caixinha_movimentos_user_caixinha_data_idx
  on public.caixinha_movimentos (user_id, caixinha_id, data_movimento desc, id);

alter table public.caixinha_movimentos enable row level security;
revoke all on public.caixinha_movimentos from public, anon, authenticated;
grant select, insert, update, delete on public.caixinha_movimentos to authenticated;

drop policy if exists caixinha_movimentos_select on public.caixinha_movimentos;
drop policy if exists caixinha_movimentos_insert_interno on public.caixinha_movimentos;
drop policy if exists caixinha_movimentos_update_interno on public.caixinha_movimentos;
drop policy if exists caixinha_movimentos_delete_interno on public.caixinha_movimentos;
create policy caixinha_movimentos_select on public.caixinha_movimentos for select to authenticated
  using ((select auth.uid()) = user_id);
create policy caixinha_movimentos_insert_interno on public.caixinha_movimentos for insert to authenticated
  with check ((select auth.uid()) = user_id and current_setting('finance.internal_ledger', true) = 'on');
create policy caixinha_movimentos_update_interno on public.caixinha_movimentos for update to authenticated
  using ((select auth.uid()) = user_id and current_setting('finance.internal_ledger', true) = 'on')
  with check ((select auth.uid()) = user_id and current_setting('finance.internal_ledger', true) = 'on');
create policy caixinha_movimentos_delete_interno on public.caixinha_movimentos for delete to authenticated
  using ((select auth.uid()) = user_id and current_setting('finance.internal_ledger', true) = 'on');

-- Reconstrói os movimentos identificáveis do histórico antigo.
insert into public.caixinha_movimentos (
  user_id, caixinha_id, transacao_id, tipo, valor, descricao, data_movimento
)
select t.user_id, c.id, t.id,
  case when t.tipo = 'despesa' then 'entrada' else 'saida' end,
  case when t.tipo = 'despesa' then t.valor else -t.valor end,
  t.descricao, t.data_transacao::date
from public.transacoes t
join public.caixinhas c on c.user_id = t.user_id
where t.categoria = 'Economias'
  and ((t.tipo = 'despesa' and t.descricao = 'Depósito: ' || c.nome)
    or (t.tipo = 'receita' and t.descricao = 'Resgate: ' || c.nome))
on conflict (transacao_id) where transacao_id is not null do nothing;

insert into public.caixinha_movimentos (
  user_id, caixinha_id, transacao_id, tipo, valor, descricao, data_movimento
)
select t.user_id, t.caixinha_id, t.id, 'gasto', -t.valor, t.descricao, t.data_transacao::date
from public.transacoes t
where t.caixinha_id is not null and t.tipo = 'despesa'
on conflict (transacao_id) where transacao_id is not null do nothing;

-- Concilia saldos de abertura e movimentos antigos que não puderam ser associados pelo nome.
insert into public.caixinha_movimentos (
  user_id, caixinha_id, tipo, valor, descricao, data_movimento, chave
)
select c.user_id, c.id, 'ajuste',
  c.saldo_inicial - coalesce(sum(m.valor), 0),
  'Saldo anterior à implantação do histórico', c.data_criacao::date,
  'migracao:' || c.id::text
from public.caixinhas c
left join public.caixinha_movimentos m on m.caixinha_id = c.id
group by c.id, c.user_id, c.saldo_inicial, c.data_criacao
having c.saldo_inicial - coalesce(sum(m.valor), 0) <> 0
on conflict (chave) where chave is not null do nothing;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.registrar_saldo_inicial_caixinha()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.saldo_inicial <> 0 then
    insert into public.caixinha_movimentos (
      user_id, caixinha_id, tipo, valor, descricao, data_movimento, chave
    ) values (
      new.user_id, new.id, 'ajuste', new.saldo_inicial, 'Saldo inicial',
      new.data_criacao::date, 'inicial:' || new.id::text
    ) on conflict (chave) where chave is not null do nothing;
  end if;
  return new;
end;
$$;
revoke all on function private.registrar_saldo_inicial_caixinha() from public, anon, authenticated;
drop trigger if exists registrar_saldo_inicial_caixinha on public.caixinhas;
create trigger registrar_saldo_inicial_caixinha
after insert on public.caixinhas
for each row execute function private.registrar_saldo_inicial_caixinha();

create or replace function public.movimentar_caixinha(
  p_caixinha_id uuid, p_tipo text, p_valor numeric, p_data_transacao date
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_caixinha public.caixinhas%rowtype;
  v_saldo_conta numeric;
  v_tipo_transacao public.transacoes.tipo%type;
  v_descricao text;
  v_transacao_id uuid;
begin
  if v_user_id is null then raise exception 'SESSAO_INVALIDA'; end if;
  if p_valor is null or p_valor <= 0 or p_valor > 90071992547409.91
     or p_valor::text in ('NaN', 'Infinity', '-Infinity') or p_valor <> round(p_valor, 2) then
    raise exception 'VALOR_INVALIDO';
  end if;
  if p_tipo is null or p_tipo not in ('deposito', 'resgate') or p_data_transacao is null then
    raise exception 'MOVIMENTO_INVALIDO';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('movimentar_caixinha:' || v_user_id::text, 0));
  select c.* into v_caixinha from public.caixinhas c
  where c.id = p_caixinha_id and c.user_id = v_user_id for update;
  if not found then raise exception 'CAIXINHA_INDISPONIVEL'; end if;

  if p_tipo = 'resgate' then
    if p_valor > v_caixinha.saldo_inicial then raise exception 'SALDO_CAIXINHA_INSUFICIENTE'; end if;
    v_caixinha.saldo_inicial := v_caixinha.saldo_inicial - p_valor;
    v_tipo_transacao := 'receita'; v_descricao := 'Resgate: ' || v_caixinha.nome;
  else
    select coalesce(sum(case when t.tipo = 'receita' then t.valor else -t.valor end), 0)
      into v_saldo_conta from public.transacoes t
      where t.user_id = v_user_id and t.data_transacao::date <= (current_timestamp at time zone 'America/Sao_Paulo')::date
        and t.caixinha_id is null;
    if p_valor > v_saldo_conta then raise exception 'SALDO_CONTA_INSUFICIENTE'; end if;
    v_caixinha.saldo_inicial := v_caixinha.saldo_inicial + p_valor;
    v_tipo_transacao := 'despesa'; v_descricao := 'Depósito: ' || v_caixinha.nome;
  end if;

  update public.caixinhas set saldo_inicial = v_caixinha.saldo_inicial
  where id = p_caixinha_id and user_id = v_user_id;
  if not found then raise exception 'CAIXINHA_INDISPONIVEL'; end if;
  insert into public.transacoes (user_id, descricao, valor, tipo, categoria, icone, data_transacao, responsavel)
  values (v_user_id, v_descricao, p_valor, v_tipo_transacao, 'Economias', 'bank', p_data_transacao, 'Ambos')
  returning id into v_transacao_id;
  perform pg_catalog.set_config('finance.internal_ledger', 'on', true);
  insert into public.caixinha_movimentos (user_id, caixinha_id, transacao_id, tipo, valor, descricao, data_movimento)
  values (v_user_id, p_caixinha_id, v_transacao_id,
    case when p_tipo = 'deposito' then 'entrada' else 'saida' end,
    case when p_tipo = 'deposito' then p_valor else -p_valor end,
    v_descricao, p_data_transacao);
end;
$$;

create or replace function public.registrar_despesa_caixinha(
  p_caixinha_id uuid, p_descricao text, p_valor numeric, p_data_transacao date,
  p_categoria text, p_subcategoria text, p_responsavel text, p_icone text, p_orcamento_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid(); v_saldo numeric; v_transacao_id uuid;
begin
  if v_user_id is null then raise exception 'SESSAO_INVALIDA'; end if;
  if p_valor is null or p_valor <= 0 or p_valor > 90071992547409.91
     or p_valor::text in ('NaN', 'Infinity', '-Infinity') or p_valor <> round(p_valor, 2) then
    raise exception 'VALOR_INVALIDO';
  end if;
  if p_data_transacao is null or p_descricao is null or length(btrim(p_descricao)) = 0
     or p_responsavel is null or length(btrim(p_responsavel)) = 0 then raise exception 'DADOS_INVALIDOS'; end if;
  if p_orcamento_id is not null and not exists (
    select 1 from public.orcamentos o where o.id = p_orcamento_id and o.user_id = v_user_id
  ) then raise exception 'ORCAMENTO_INDISPONIVEL'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('movimentar_caixinha:' || v_user_id::text, 0));
  select c.saldo_inicial into v_saldo from public.caixinhas c
  where c.id = p_caixinha_id and c.user_id = v_user_id for update;
  if not found then raise exception 'CAIXINHA_INDISPONIVEL'; end if;
  if v_saldo < p_valor then raise exception 'SALDO_CAIXINHA_INSUFICIENTE'; end if;
  update public.caixinhas set saldo_inicial = saldo_inicial - p_valor
  where id = p_caixinha_id and user_id = v_user_id;
  insert into public.transacoes (
    user_id, descricao, valor, tipo, categoria, subcategoria, responsavel, icone,
    data_transacao, caixinha_id, orcamento_id
  ) values (
    v_user_id, btrim(p_descricao), p_valor, 'despesa', coalesce(nullif(btrim(p_categoria), ''), 'Geral'),
    nullif(btrim(p_subcategoria), ''), btrim(p_responsavel), coalesce(nullif(btrim(p_icone), ''), 'tag'),
    p_data_transacao, p_caixinha_id, p_orcamento_id
  ) returning id into v_transacao_id;
  perform pg_catalog.set_config('finance.internal_ledger', 'on', true);
  insert into public.caixinha_movimentos (user_id, caixinha_id, transacao_id, tipo, valor, descricao, data_movimento)
  values (v_user_id, p_caixinha_id, v_transacao_id, 'gasto', -p_valor, btrim(p_descricao), p_data_transacao);
  return v_transacao_id;
end;
$$;

create or replace function public.editar_despesa_caixinha(
  p_transacao_id uuid, p_descricao text, p_valor numeric, p_data_transacao date,
  p_categoria text, p_subcategoria text, p_responsavel text, p_icone text, p_orcamento_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid(); v_transacao public.transacoes%rowtype; v_saldo numeric; v_novo_saldo numeric;
begin
  if v_user_id is null then raise exception 'SESSAO_INVALIDA'; end if;
  if p_valor is null or p_valor <= 0 or p_valor > 90071992547409.91
     or p_valor::text in ('NaN', 'Infinity', '-Infinity') or p_valor <> round(p_valor, 2) then
    raise exception 'VALOR_INVALIDO';
  end if;
  if p_data_transacao is null or p_descricao is null or length(btrim(p_descricao)) = 0
     or p_responsavel is null or length(btrim(p_responsavel)) = 0 then raise exception 'DADOS_INVALIDOS'; end if;
  if p_orcamento_id is not null and not exists (
    select 1 from public.orcamentos o where o.id = p_orcamento_id and o.user_id = v_user_id
  ) then raise exception 'ORCAMENTO_INDISPONIVEL'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('movimentar_caixinha:' || v_user_id::text, 0));
  select t.* into v_transacao from public.transacoes t
  where t.id = p_transacao_id and t.user_id = v_user_id and t.tipo = 'despesa' and t.caixinha_id is not null for update;
  if not found then raise exception 'DESPESA_CAIXINHA_INDISPONIVEL'; end if;
  select c.saldo_inicial into v_saldo from public.caixinhas c
  where c.id = v_transacao.caixinha_id and c.user_id = v_user_id for update;
  if not found then raise exception 'CAIXINHA_INDISPONIVEL'; end if;
  v_novo_saldo := v_saldo + v_transacao.valor - p_valor;
  if v_novo_saldo < 0 then raise exception 'SALDO_CAIXINHA_INSUFICIENTE'; end if;
  update public.caixinhas set saldo_inicial = v_novo_saldo
  where id = v_transacao.caixinha_id and user_id = v_user_id;
  update public.transacoes set descricao = btrim(p_descricao), valor = p_valor,
    data_transacao = p_data_transacao, categoria = coalesce(nullif(btrim(p_categoria), ''), 'Geral'),
    subcategoria = nullif(btrim(p_subcategoria), ''), responsavel = btrim(p_responsavel),
    icone = coalesce(nullif(btrim(p_icone), ''), 'tag'), orcamento_id = p_orcamento_id
  where id = p_transacao_id and user_id = v_user_id;
  perform pg_catalog.set_config('finance.internal_ledger', 'on', true);
  insert into public.caixinha_movimentos (user_id, caixinha_id, transacao_id, tipo, valor, descricao, data_movimento)
  values (v_user_id, v_transacao.caixinha_id, p_transacao_id, 'gasto', -p_valor, btrim(p_descricao), p_data_transacao)
  on conflict (transacao_id) where transacao_id is not null do update
    set valor = excluded.valor, descricao = excluded.descricao, data_movimento = excluded.data_movimento;
end;
$$;

create or replace function public.excluir_despesa_caixinha(p_transacao_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid(); v_transacao public.transacoes%rowtype;
begin
  if v_user_id is null then raise exception 'SESSAO_INVALIDA'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('movimentar_caixinha:' || v_user_id::text, 0));
  select t.* into v_transacao from public.transacoes t
  where t.id = p_transacao_id and t.user_id = v_user_id and t.tipo = 'despesa' and t.caixinha_id is not null for update;
  if not found then raise exception 'DESPESA_CAIXINHA_INDISPONIVEL'; end if;
  update public.caixinhas set saldo_inicial = saldo_inicial + v_transacao.valor
  where id = v_transacao.caixinha_id and user_id = v_user_id;
  if not found then raise exception 'CAIXINHA_INDISPONIVEL'; end if;
  perform pg_catalog.set_config('finance.internal_ledger', 'on', true);
  delete from public.caixinha_movimentos where transacao_id = p_transacao_id and user_id = v_user_id;
  delete from public.transacoes where id = p_transacao_id and user_id = v_user_id;
  if not found then raise exception 'DESPESA_CAIXINHA_INDISPONIVEL'; end if;
end;
$$;

revoke all on function public.movimentar_caixinha(uuid, text, numeric, date) from public, anon;
grant execute on function public.movimentar_caixinha(uuid, text, numeric, date) to authenticated;
revoke all on function public.registrar_despesa_caixinha(uuid, text, numeric, date, text, text, text, text, uuid) from public, anon;
grant execute on function public.registrar_despesa_caixinha(uuid, text, numeric, date, text, text, text, text, uuid) to authenticated;
revoke all on function public.editar_despesa_caixinha(uuid, text, numeric, date, text, text, text, text, uuid) from public, anon;
grant execute on function public.editar_despesa_caixinha(uuid, text, numeric, date, text, text, text, text, uuid) to authenticated;
revoke all on function public.excluir_despesa_caixinha(uuid) from public, anon;
grant execute on function public.excluir_despesa_caixinha(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
