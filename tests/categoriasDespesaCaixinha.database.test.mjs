import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, beforeEach, after, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const A = '00000000-0000-0000-0000-000000000001';
const B = '00000000-0000-0000-0000-000000000002';
const CAIXINHA = '00000000-0000-0000-0000-000000000010';
let db;

before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth, public to authenticated, anon;
    create type public.tipo_transacao as enum ('receita', 'despesa', 'fatura_cartao');
    create table public.caixinhas (
      id uuid primary key, user_id uuid not null, nome text not null, saldo_inicial numeric(14,2) not null
    );
    create table public.categorias (
      id uuid primary key default gen_random_uuid(), user_id uuid not null,
      nome text not null, subcategoria text
    );
    create table public.transacoes (
      id uuid primary key default gen_random_uuid(), user_id uuid not null,
      descricao text not null, valor numeric(14,2) not null,
      tipo public.tipo_transacao not null, categoria text, subcategoria text,
      responsavel text, icone text, data_transacao date not null
    );
    alter table public.caixinhas enable row level security;
    alter table public.transacoes enable row level security;
    create policy caixinhas_select on public.caixinhas for select to authenticated using (user_id = auth.uid());
    create policy caixinhas_update on public.caixinhas for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
    create policy transacoes_select on public.transacoes for select to authenticated using (user_id = auth.uid());
    create policy transacoes_insert on public.transacoes for insert to authenticated with check (user_id = auth.uid());
    grant select, update on public.caixinhas to authenticated;
    grant select, insert on public.transacoes to authenticated;
    insert into public.categorias (user_id, nome, subcategoria) values
      ('${A}', 'Salário', 'Aulas Particulares'), ('${A}', 'Salário', 'Bônus'), ('${A}', 'Sem uso', null);
    insert into public.transacoes (user_id, descricao, valor, tipo, categoria, subcategoria, data_transacao)
      values ('${A}', 'Aula', 50, 'receita', 'Salário', 'Aulas Particulares', current_date);
  `);
  const sql = await readFile(new URL('../database/categorias_tipo_despesa_caixinha.sql', import.meta.url), 'utf8');
  await db.exec(sql);
  await db.exec(sql);
});

beforeEach(async () => {
  await db.exec('reset role; truncate public.caixinhas, public.transacoes;');
  await db.query('insert into public.caixinhas values ($1, $2, $3, 100), ($4, $4, $5, 500)', [CAIXINHA, A, 'Reserva', B, 'Outra conta']);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [A]);
  await db.exec('set role authenticated');
});

after(async () => { await db?.close(); });

const registrar = (id = CAIXINHA, valor = '30') => db.query(
  'select public.registrar_despesa_caixinha($1,$2,$3,$4,$5,$6,$7,$8)',
  [id, 'Material escolar', valor, '2026-09-14', 'Educação', 'Material', 'Pedro', 'tag'],
);

test('migração repetível classifica categorias antigas e restringe o tipo', async () => {
  await db.exec('reset role');
  const { rows } = await db.query('select nome, tipo from public.categorias order by nome');
  assert.deepEqual(rows, [
    { nome: 'Salário', tipo: 'receita' }, { nome: 'Salário', tipo: 'receita' },
    { nome: 'Sem uso', tipo: 'despesa' },
  ]);
  await assert.rejects(db.query("insert into public.categorias (user_id,nome,tipo) values ($1,'Inválida','outro')", [A]), /check constraint/);
});

test('desconta o saldo e cria a despesa vinculada atomicamente', async () => {
  await registrar();
  assert.deepEqual((await db.query('select saldo_inicial::text as saldo from public.caixinhas')).rows, [{ saldo: '70.00' }]);
  assert.deepEqual((await db.query(`select descricao, valor::text, tipo::text, categoria, subcategoria,
    responsavel, caixinha_id from public.transacoes`)).rows, [{
    descricao: 'Material escolar', valor: '30.00', tipo: 'despesa', categoria: 'Educação',
    subcategoria: 'Material', responsavel: 'Pedro', caixinha_id: CAIXINHA,
  }]);
});

test('saldo insuficiente ou caixinha alheia não produz escrita parcial', async () => {
  await assert.rejects(registrar(CAIXINHA, '100.01'), /SALDO_CAIXINHA_INSUFICIENTE/);
  await assert.rejects(registrar(B, '1'), /CAIXINHA_INDISPONIVEL/);
  assert.equal((await db.query('select count(*)::int as total from public.transacoes')).rows[0].total, 0);
  assert.equal((await db.query('select saldo_inicial::text as saldo from public.caixinhas')).rows[0].saldo, '100.00');
});

test('somente usuários autenticados podem executar a função', async () => {
  await db.exec('reset role');
  const { rows } = await db.query(`select p.prosecdef,
    has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'registrar_despesa_caixinha'`);
  assert.deepEqual(rows, [{ prosecdef: false, anon_execute: false, authenticated_execute: true }]);
});
