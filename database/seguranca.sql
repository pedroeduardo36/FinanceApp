-- SQL Editor: aplicar depois de revisar o schema e as políticas do projeto.
-- Modelo desta aplicação: cada registro pertence exclusivamente a user_id.
-- As políticas RESTRICTIVE impedem que políticas permissivas antigas liberem outra conta.
-- Não remover políticas de outros fluxos sem revisão. Este script não as apaga.
begin;

do $$
declare tabela text;
begin
  foreach tabela in array array['transacoes','cartoes_credito','compromissos','caixinhas','categorias','orcamentos','orcamento_percentuais'] loop
    execute format('alter table public.%I enable row level security', tabela);
    execute format('revoke all on public.%I from public, anon', tabela);
    execute format('grant select, insert, update, delete on public.%I to authenticated', tabela);
    execute format('drop policy if exists finance_owner_guard on public.%I', tabela);
    execute format('drop policy if exists finance_owner_access on public.%I', tabela);
    execute format('create policy finance_owner_guard on public.%I as restrictive for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', tabela);
    execute format('create policy finance_owner_access on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', tabela);
    execute format('create index if not exists %I on public.%I (user_id, id)', 'finance_' || tabela || '_owner', tabela);
  end loop;
end $$;

-- NOT VALID protege novas escritas sem rejeitar a instalação por dados legados.
-- Validar explicitamente as constraints após conferir/corrigir registros antigos.
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.transacoes'::regclass and conname = 'finance_transacoes_valor') then
    alter table public.transacoes add constraint finance_transacoes_valor
      check (valor is not null and valor > 0 and valor < 90071992547409.92 and valor = round(valor, 2)
        and user_id is not null and descricao is not null and length(btrim(descricao)) > 0 and data_transacao is not null
        and (total_parcelas is null or total_parcelas between 1 and 48)
        and (parcela_atual is null or parcela_atual between 1 and total_parcelas)) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.caixinhas'::regclass and conname = 'finance_caixinhas_saldo') then
    alter table public.caixinhas add constraint finance_caixinhas_saldo
      check (saldo_inicial is not null and saldo_inicial >= 0 and saldo_inicial < 90071992547409.92
        and saldo_inicial = round(saldo_inicial, 2) and user_id is not null and nome is not null and length(btrim(nome)) > 0
        and (meta_valor is null or (meta_valor > 0 and meta_valor < 90071992547409.92))) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.compromissos'::regclass and conname = 'finance_compromissos_valores') then
    alter table public.compromissos add constraint finance_compromissos_valores
      check (valor is not null and valor > 0 and valor < 90071992547409.92 and valor = round(valor, 2)
        and dia_vencimento is not null and dia_vencimento between 1 and 31 and user_id is not null and descricao is not null and length(btrim(descricao)) > 0) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.cartoes_credito'::regclass and conname = 'finance_cartoes_limite') then
    alter table public.cartoes_credito add constraint finance_cartoes_limite
      check (limite is not null and limite >= 0 and limite < 90071992547409.92 and limite = round(limite, 2)
        and user_id is not null and nome is not null and length(btrim(nome)) > 0) not valid;
  end if;
end $$;

-- Impede vincular a transação de A ao cartão de B e evita exclusão de cartão referenciado.
create unique index if not exists finance_cartoes_id_owner on public.cartoes_credito (id, user_id);
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.transacoes'::regclass and conname = 'finance_cartao_owner_fk') then
    alter table public.transacoes add constraint finance_cartao_owner_fk
      foreign key (cartao_id, user_id) references public.cartoes_credito (id, user_id)
      on delete restrict on update restrict not valid;
  end if;
end $$;

notify pgrst, 'reload schema';
commit;
