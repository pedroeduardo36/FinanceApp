import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const A = '00000000-0000-0000-0000-000000000001';
const B = '00000000-0000-0000-0000-000000000002';
const CAIXINHA = '00000000-0000-0000-0000-000000000010';
let db;

before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create schema auth;
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to authenticated, anon;
    create table public.orcamentos (
      id uuid primary key, user_id uuid not null, nome text not null, unique (id, user_id)
    );
    create table public.categorias (
      id uuid primary key default gen_random_uuid(), user_id uuid not null, nome text not null,
      subcategoria text, tipo text not null default 'despesa'
    );
    create table public.caixinhas (
      id uuid primary key, user_id uuid not null, nome text not null, saldo_inicial numeric(14,2) not null
    );
    create table public.transacoes (
      id uuid primary key default gen_random_uuid(), user_id uuid not null, descricao text not null,
      valor numeric(14,2) not null, tipo text not null, categoria text, subcategoria text,
      responsavel text, icone text, data_transacao date not null, caixinha_id uuid
    );
    alter table public.orcamentos enable row level security;
    alter table public.categorias enable row level security;
    alter table public.caixinhas enable row level security;
    alter table public.transacoes enable row level security;
    create policy orcamentos_select on public.orcamentos for select to authenticated using (user_id = auth.uid());
    create policy categorias_insert on public.categorias for insert to authenticated with check (user_id = auth.uid());
    create policy caixinhas_select on public.caixinhas for select to authenticated using (user_id = auth.uid());
    create policy caixinhas_update on public.caixinhas for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
    create policy transacoes_select on public.transacoes for select to authenticated using (user_id = auth.uid());
    create policy transacoes_insert on public.transacoes for insert to authenticated with check (user_id = auth.uid());
    grant select on public.orcamentos to authenticated;
    grant insert on public.categorias to authenticated;
    grant select, update on public.caixinhas to authenticated;
    grant select, insert on public.transacoes to authenticated;
  `);
  const sql = await readFile(new URL('../database/orcamento_responsavel.sql', import.meta.url), 'utf8');
  await db.exec(sql); await db.exec(sql);
});

beforeEach(async () => {
  await db.exec('reset role; truncate public.orcamentos, public.categorias, public.caixinhas, public.transacoes;');
  await db.query('insert into public.orcamentos values ($1,$1,\'Moradia\'),($2,$2,\'Orçamento alheio\')', [A, B]);
  await db.query('insert into public.caixinhas values ($1,$2,\'Reserva\',100)', [CAIXINHA, A]);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [A]);
  await db.exec('set role authenticated');
});

after(async () => { await db?.close(); });

test('categoria aceita somente orçamento próprio e somente quando é despesa', async () => {
  await db.query("insert into public.categorias (user_id,nome,tipo,orcamento_id) values ($1,'Mercado','despesa',$1)", [A]);
  await assert.rejects(db.query("insert into public.categorias (user_id,nome,tipo,orcamento_id) values ($1,'Fraude','despesa',$2)", [A, B]), /foreign key/);
  await assert.rejects(db.query("insert into public.categorias (user_id,nome,tipo,orcamento_id) values ($1,'Salário','receita',$1)", [A]), /check constraint/);
});

test('transação aceita somente orçamento próprio e somente quando é despesa', async () => {
  await db.query("insert into public.transacoes (user_id,descricao,valor,tipo,data_transacao,orcamento_id) values ($1,'Mercado',10,'despesa',current_date,$1)", [A]);
  await assert.rejects(db.query("insert into public.transacoes (user_id,descricao,valor,tipo,data_transacao,orcamento_id) values ($1,'Fraude',10,'despesa',current_date,$2)", [A, B]), /foreign key/);
  await assert.rejects(db.query("insert into public.transacoes (user_id,descricao,valor,tipo,data_transacao,orcamento_id) values ($1,'Salário',10,'receita',current_date,$1)", [A]), /check constraint/);
});

test('despesa paga com caixinha preserva o orçamento escolhido atomicamente', async () => {
  const result = await db.query(
    'select public.registrar_despesa_caixinha($1,$2,$3,$4,$5,$6,$7,$8,$9) as id',
    [CAIXINHA, 'Material', '25.90', '2026-09-15', 'Educação', 'Livros', 'Pedro', 'tag', A],
  );
  assert.ok(result.rows[0].id);
  assert.deepEqual((await db.query('select valor::text, orcamento_id from public.transacoes')).rows,
    [{ valor: '25.90', orcamento_id: A }]);
  await db.exec('reset role');
  assert.equal((await db.query('select saldo_inicial::text as saldo from public.caixinhas')).rows[0].saldo, '74.10');
});

test('RPC recusa orçamento alheio sem alterar saldo nem criar despesa', async () => {
  await assert.rejects(db.query(
    'select public.registrar_despesa_caixinha($1,$2,$3,$4,$5,$6,$7,$8,$9)',
    [CAIXINHA, 'Fraude', '10', '2026-09-15', 'Geral', null, 'Pedro', 'tag', B],
  ), /ORCAMENTO_INDISPONIVEL/);
  await db.exec('reset role');
  assert.equal((await db.query('select saldo_inicial::text as saldo from public.caixinhas')).rows[0].saldo, '100.00');
  assert.equal((await db.query('select count(*)::int as total from public.transacoes')).rows[0].total, 0);
});
