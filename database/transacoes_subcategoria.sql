-- SQL Editor do Supabase: preserva a subcategoria escolhida em cada transação.
-- Pode ser executado novamente com segurança.
begin;

alter table public.transacoes
  add column if not exists subcategoria text;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conrelid = 'public.transacoes'::regclass
       and conname = 'finance_transacoes_subcategoria'
  ) then
    alter table public.transacoes
      add constraint finance_transacoes_subcategoria
      check (subcategoria is null or length(btrim(subcategoria)) between 1 and 80)
      not valid;
  end if;
end $$;

notify pgrst, 'reload schema';
commit;
