-- SUPABASE SQL EDITOR: cole e execute este arquivo inteiro no projeto da aplicação.
-- Requisitos: tabelas public.caixinhas e public.transacoes existentes,
-- IDs UUID, valores NUMERIC e permissões/RLS conforme database/README.md.
-- Este script instala a função; não executa depósitos/resgates nem altera saldos.
-- Aplicar antes de publicar o frontend que chama esta RPC.
-- BEGIN/COMMIT tornam a instalação da função e de suas permissões atômica.
begin;

create or replace function public.movimentar_caixinha(
  p_caixinha_id uuid,
  p_tipo text,
  p_valor numeric,
  p_data_transacao date
)
returns void
language plpgsql
security invoker
-- Usa as permissões do usuário autenticado, preservando as políticas RLS.
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_caixinha public.caixinhas%rowtype;
  v_saldo_conta numeric;
  v_tipo_transacao public.transacoes.tipo%type;
  v_descricao text;
  v_linhas integer;
begin
  -- A identidade vem da sessão validada pelo Supabase, não do formulário.
  if v_user_id is null then
    raise exception 'SESSAO_INVALIDA';
  end if;
  if p_valor is null or p_valor <= 0 or p_valor > 90071992547409.91
     or p_valor::text in ('NaN', 'Infinity', '-Infinity')
     or p_valor <> round(p_valor, 2) then
    raise exception 'VALOR_INVALIDO';
  end if;
  if p_tipo is null or p_tipo not in ('deposito', 'resgate') or p_data_transacao is null then
    raise exception 'MOVIMENTO_INVALIDO';
  end if;

  -- Serializa estas movimentações por usuário, inclusive entre caixinhas distintas.
  -- O lock termina automaticamente no commit ou rollback da chamada RPC.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('movimentar_caixinha:' || v_user_id::text, 0)
  );

  select c.* into v_caixinha
  from public.caixinhas c
  where c.id = p_caixinha_id and c.user_id = v_user_id
  for update;
  if not found then
    raise exception 'CAIXINHA_INDISPONIVEL';
  end if;
  if v_caixinha.saldo_inicial is null or v_caixinha.saldo_inicial < 0
     or v_caixinha.saldo_inicial::text in ('NaN', 'Infinity', '-Infinity') then
    raise exception 'SALDO_INVALIDO';
  end if;

  if p_tipo = 'resgate' then
    if p_valor > v_caixinha.saldo_inicial then
      raise exception 'SALDO_CAIXINHA_INSUFICIENTE';
    end if;
    v_caixinha.saldo_inicial := v_caixinha.saldo_inicial - p_valor;
    v_tipo_transacao := 'receita';
    v_descricao := 'Resgate: ' || v_caixinha.nome;
  else
    -- Saldo até hoje: lançamentos futuros não financiam depósitos.
    select coalesce(sum(case when t.tipo = 'receita' then t.valor else -t.valor end), 0)
    into v_saldo_conta
    from public.transacoes t where t.user_id = v_user_id
      and t.data_transacao::date <= (current_timestamp at time zone 'America/Sao_Paulo')::date;
    if p_valor > v_saldo_conta then
      raise exception 'SALDO_CONTA_INSUFICIENTE';
    end if;
    v_caixinha.saldo_inicial := v_caixinha.saldo_inicial + p_valor;
    v_tipo_transacao := 'despesa';
    v_descricao := 'Depósito: ' || v_caixinha.nome;
  end if;

  update public.caixinhas set saldo_inicial = v_caixinha.saldo_inicial
  where id = p_caixinha_id and user_id = v_user_id;
  if not found then
    raise exception 'CAIXINHA_INDISPONIVEL';
  end if;

  insert into public.transacoes (
    user_id, descricao, valor, tipo, categoria, icone, data_transacao, responsavel
  ) values (
    v_user_id, v_descricao, p_valor, v_tipo_transacao, 'Economias', 'bank', p_data_transacao, 'Ambos'
  );
  get diagnostics v_linhas = row_count;
  if v_linhas <> 1 then
    raise exception 'TRANSACAO_NAO_REGISTRADA';
  end if;
  -- Qualquer erro acima desfaz também o UPDATE; não há gravação parcial.
end;
$$;

revoke all on function public.movimentar_caixinha(uuid, text, numeric, date) from public, anon;
grant execute on function public.movimentar_caixinha(uuid, text, numeric, date) to authenticated;

-- Solicita que a API reconheça a função após o commit da instalação.
notify pgrst, 'reload schema';

commit;
