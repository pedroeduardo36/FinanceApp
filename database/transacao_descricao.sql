-- SQL Editor do Supabase: título e descrição separados nas transações.
-- Execute depois de caixinha_historico_edicao.sql. Pode ser executado novamente com segurança.
begin;

alter table public.transacoes add column if not exists detalhes text;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.transacoes'::regclass
      and conname = 'finance_transacoes_detalhes_tamanho'
  ) then
    alter table public.transacoes
      add constraint finance_transacoes_detalhes_tamanho
      check (detalhes is null or length(detalhes) <= 500) not valid;
  end if;
end;
$$;

-- A sobrecarga mantém a movimentação financeira na função atômica já instalada e
-- adiciona a descrição opcional dentro da mesma transação do Postgres.
create or replace function public.registrar_despesa_caixinha(
  p_caixinha_id uuid, p_descricao text, p_valor numeric, p_data_transacao date,
  p_categoria text, p_subcategoria text, p_responsavel text, p_icone text,
  p_orcamento_id uuid, p_detalhes text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_transacao_id uuid;
begin
  if p_detalhes is not null and length(p_detalhes) > 500 then
    raise exception 'DESCRICAO_MUITO_LONGA';
  end if;

  v_transacao_id := public.registrar_despesa_caixinha(
    p_caixinha_id, p_descricao, p_valor, p_data_transacao, p_categoria,
    p_subcategoria, p_responsavel, p_icone, p_orcamento_id
  );

  update public.transacoes
    set detalhes = nullif(btrim(p_detalhes), '')
    where id = v_transacao_id and user_id = auth.uid();
  if not found then raise exception 'DESPESA_CAIXINHA_INDISPONIVEL'; end if;

  return v_transacao_id;
end;
$$;

create or replace function public.editar_despesa_caixinha(
  p_transacao_id uuid, p_descricao text, p_valor numeric, p_data_transacao date,
  p_categoria text, p_subcategoria text, p_responsavel text, p_icone text,
  p_orcamento_id uuid, p_detalhes text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_detalhes is not null and length(p_detalhes) > 500 then
    raise exception 'DESCRICAO_MUITO_LONGA';
  end if;

  perform public.editar_despesa_caixinha(
    p_transacao_id, p_descricao, p_valor, p_data_transacao, p_categoria,
    p_subcategoria, p_responsavel, p_icone, p_orcamento_id
  );

  update public.transacoes
    set detalhes = nullif(btrim(p_detalhes), '')
    where id = p_transacao_id and user_id = auth.uid();
  if not found then raise exception 'DESPESA_CAIXINHA_INDISPONIVEL'; end if;
end;
$$;

revoke all on function public.registrar_despesa_caixinha(uuid, text, numeric, date, text, text, text, text, uuid, text) from public, anon;
grant execute on function public.registrar_despesa_caixinha(uuid, text, numeric, date, text, text, text, text, uuid, text) to authenticated;
revoke all on function public.editar_despesa_caixinha(uuid, text, numeric, date, text, text, text, text, uuid, text) from public, anon;
grant execute on function public.editar_despesa_caixinha(uuid, text, numeric, date, text, text, text, text, uuid, text) to authenticated;

notify pgrst, 'reload schema';
commit;
