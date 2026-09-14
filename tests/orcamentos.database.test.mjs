import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const A = '00000000-0000-0000-0000-000000000001';
const B = '00000000-0000-0000-0000-000000000002';
let db;

before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to authenticated, anon;
    insert into auth.users (id) values ('${A}'), ('${B}');
  `);
  const sql = await readFile(new URL('../database/orcamentos.sql', import.meta.url), 'utf8');
  await db.exec(sql);
  await db.exec(sql);
});

beforeEach(async () => {
  await db.exec('reset role; truncate public.orcamentos cascade;');
  await db.query('select set_config(\'request.jwt.claim.sub\', $1, false)', [A]);
  await db.exec('set role authenticated');
});

after(async () => { await db?.close(); });

test('cada conta acessa somente seus orçamentos e percentuais', async () => {
  const own = (await db.query('insert into public.orcamentos (user_id, nome) values ($1, \'Moradia\') returning id', [A])).rows[0].id;
  await db.exec('reset role');
  const other = (await db.query('insert into public.orcamentos (user_id, nome) values ($1, \'Viagem\') returning id', [B])).rows[0].id;
  await db.exec('set role authenticated');
  assert.deepEqual((await db.query('select nome from public.orcamentos')).rows, [{ nome: 'Moradia' }]);
  await db.query('insert into public.orcamento_percentuais (user_id, orcamento_id, competencia, percentual) values ($1, $2, date \'2026-02-01\', 35)', [A, own]);
  await assert.rejects(db.query('insert into public.orcamento_percentuais (user_id, orcamento_id, competencia, percentual) values ($1, $2, date \'2026-02-01\', 10)', [A, other]), /foreign key/);
  assert.deepEqual((await db.query('select percentual::text from public.orcamento_percentuais')).rows, [{ percentual: '35.000000' }]);
});

test('competências são independentes e aceitam somente o primeiro dia do mês', async () => {
  const budget = (await db.query('insert into public.orcamentos (user_id, nome) values ($1, \'Reserva\') returning id', [A])).rows[0].id;
  await db.query(`insert into public.orcamento_percentuais (user_id, orcamento_id, competencia, percentual)
    values ($1, $2, date '2026-02-01', 20), ($1, $2, date '2026-03-01', 45)`, [A, budget]);
  assert.deepEqual((await db.query('select competencia::text, percentual::text from public.orcamento_percentuais order by competencia')).rows,
    [{ competencia: '2026-02-01', percentual: '20.000000' }, { competencia: '2026-03-01', percentual: '45.000000' }]);
  await assert.rejects(db.query('insert into public.orcamento_percentuais (user_id, orcamento_id, competencia, percentual) values ($1, $2, date \'2026-03-02\', 1)', [A, budget]), /check constraint/);
  await assert.rejects(db.query('update public.orcamento_percentuais set percentual = 101'), /check constraint/);
});

test('a soma de uma competência não pode ultrapassar 100%', async () => {
  const first = (await db.query('insert into public.orcamentos (user_id, nome) values ($1, \'Essenciais\') returning id', [A])).rows[0].id;
  const second = (await db.query('insert into public.orcamentos (user_id, nome) values ($1, \'Lazer\') returning id', [A])).rows[0].id;
  await db.query('insert into public.orcamento_percentuais (user_id, orcamento_id, competencia, percentual) values ($1, $2, date \'2026-04-01\', 70)', [A, first]);
  await assert.rejects(db.query('insert into public.orcamento_percentuais (user_id, orcamento_id, competencia, percentual) values ($1, $2, date \'2026-04-01\', 31)', [A, second]), /TOTAL_ORCAMENTO_ACIMA_DE_100/);
  assert.equal((await db.query('select sum(percentual)::text as total from public.orcamento_percentuais')).rows[0].total, '70.000000');
});

test('percentuais calculados por valor preservam seis casas decimais', async () => {
  const budget = (await db.query('insert into public.orcamentos (user_id, nome) values ($1, \'Curso\') returning id', [A])).rows[0].id;
  await db.query('insert into public.orcamento_percentuais (user_id, orcamento_id, competencia, percentual) values ($1, $2, date \'2026-05-01\', 4.119464)', [A, budget]);
  assert.equal((await db.query('select percentual::text from public.orcamento_percentuais')).rows[0].percentual, '4.119464');
});

test('nomes duplicados na mesma conta são rejeitados sem diferenciar maiúsculas', async () => {
  await db.query('insert into public.orcamentos (user_id, nome) values ($1, \'Moradia\')', [A]);
  await assert.rejects(db.query('insert into public.orcamentos (user_id, nome) values ($1, \'  MORADIA  \')', [A]), /unique constraint/);
});
