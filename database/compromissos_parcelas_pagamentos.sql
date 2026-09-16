-- SQL Editor do Supabase: parcelas, valores variáveis e baixa atômica de compromissos.
-- Execute depois de transacao_descricao.sql. Pode ser executado novamente com segurança.
begin;

alter table public.compromissos alter column valor drop not null;
alter table public.compromissos add column if not exists parcelas_restantes integer;
alter table public.compromissos add column if not exists competencia_inicio date
  not null default date_trunc('month', current_date)::date;
alter table public.transacoes add column if not exists compromisso_id uuid;
alter table public.transacoes add column if not exists competencia_compromisso date;

alter table public.compromissos drop constraint if exists finance_compromissos_valores;
alter table public.compromissos add constraint finance_compromissos_valores
  check ((valor is null or (valor > 0 and valor < 90071992547409.92 and valor = round(valor, 2)))
    and dia_vencimento between 1 and 31
    and user_id is not null and descricao is not null and length(btrim(descricao)) > 0
    and (parcelas_restantes is null or parcelas_restantes between 0 and 600)
    and competencia_inicio = date_trunc('month', competencia_inicio)::date) not valid;

create unique index if not exists finance_compromissos_id_owner
  on public.compromissos (id, user_id);
create unique index if not exists finance_compromisso_pagamento_mes
  on public.transacoes (compromisso_id, competencia_compromisso)
  where compromisso_id is not null and competencia_compromisso is not null;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.transacoes'::regclass
      and conname = 'finance_transacao_compromisso_owner_fk'
  ) then
    alter table public.transacoes add constraint finance_transacao_compromisso_owner_fk
      foreign key (compromisso_id, user_id)
      references public.compromissos (id, user_id)
      on delete set null (compromisso_id) on update restrict not valid;
  end if;
end;
$$;

create or replace function public.marcar_compromisso_pago(
  p_compromisso_id uuid, p_valor numeric, p_competencia date
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_compromisso public.compromissos%rowtype;
  v_data_pagamento date;
  v_ultimo_dia integer;
  v_transacao_id uuid;
begin
  if v_user_id is null then raise exception 'SESSAO_INVALIDA'; end if;
  if p_valor is null or p_valor <= 0 or p_valor > 90071992547409.91
     or p_valor::text in ('NaN', 'Infinity', '-Infinity') or p_valor <> round(p_valor, 2) then
    raise exception 'VALOR_INVALIDO';
  end if;
  if p_competencia is null or p_competencia <> date_trunc('month', p_competencia)::date then
    raise exception 'COMPETENCIA_INVALIDA';
  end if;

  select c.* into v_compromisso from public.compromissos c
    where c.id = p_compromisso_id and c.user_id = v_user_id for update;
  if not found then raise exception 'COMPROMISSO_INDISPONIVEL'; end if;
  if v_compromisso.parcelas_restantes = 0 then raise exception 'COMPROMISSO_CONCLUIDO'; end if;
  if p_competencia < v_compromisso.competencia_inicio then raise exception 'COMPETENCIA_INVALIDA'; end if;
  if exists (select 1 from public.transacoes t
    where t.compromisso_id = p_compromisso_id and t.competencia_compromisso = p_competencia) then
    raise exception 'COMPROMISSO_JA_PAGO';
  end if;

  v_ultimo_dia := extract(day from (p_competencia + interval '1 month - 1 day'))::integer;
  v_data_pagamento := make_date(
    extract(year from p_competencia)::integer,
    extract(month from p_competencia)::integer,
    least(v_compromisso.dia_vencimento, v_ultimo_dia)
  );

  insert into public.transacoes (
    user_id, descricao, detalhes, valor, tipo, categoria, responsavel, icone,
    data_transacao, compromisso_id, competencia_compromisso
  ) values (
    v_user_id, v_compromisso.descricao, 'Pagamento de compromisso', p_valor,
    'despesa', coalesce(nullif(btrim(v_compromisso.categoria), ''), 'Geral'),
    coalesce(nullif(btrim(v_compromisso.responsavel), ''), 'Ambos'), 'calendar',
    v_data_pagamento, p_compromisso_id, p_competencia
  ) returning id into v_transacao_id;

  if v_compromisso.parcelas_restantes is not null then
    update public.compromissos set parcelas_restantes = parcelas_restantes - 1
      where id = p_compromisso_id and user_id = v_user_id;
    if not found then raise exception 'COMPROMISSO_INDISPONIVEL'; end if;
  end if;

  return v_transacao_id;
end;
$$;

revoke all on function public.marcar_compromisso_pago(uuid, numeric, date) from public, anon;
grant execute on function public.marcar_compromisso_pago(uuid, numeric, date) to authenticated;

notify pgrst, 'reload schema';
commit;
