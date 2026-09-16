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
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to authenticated, anon;
    create table public.orcamentos (
      id uuid primary key, user_id uuid not null, nome text not null, unique (id, user_id)
    );
    create table public.caixinhas (
      id uuid primary key, user_id uuid not null references auth.users(id), nome text not null,
      saldo_inicial numeric(14,2) not null, meta_valor numeric(14,2), data_criacao timestamptz not null default now()
    );
    create table public.transacoes (
      id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
      descricao text not null, valor numeric(14,2) not null, tipo text not null, categoria text,
      subcategoria text, responsavel text, icone text, data_transacao date not null,
      caixinha_id uuid, orcamento_id uuid,
      unique (id, user_id),
      foreign key (orcamento_id, user_id) references public.orcamentos(id, user_id)
    );
    alter table public.orcamentos enable row level security;
    alter table public.caixinhas enable row level security;
    alter table public.transacoes enable row level security;
    create policy orcamentos_select on public.orcamentos for select to authenticated using (user_id = auth.uid());
    create policy caixinhas_select on public.caixinhas for select to authenticated using (user_id = auth.uid());
    create policy caixinhas_update on public.caixinhas for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
    create policy transacoes_select on public.transacoes for select to authenticated using (user_id = auth.uid());
    create policy transacoes_insert on public.transacoes for insert to authenticated with check (user_id = auth.uid());
    create policy transacoes_update on public.transacoes for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
    create policy transacoes_delete on public.transacoes for delete to authenticated using (user_id = auth.uid());
    grant select on public.orcamentos to authenticated;
    grant select, update on public.caixinhas to authenticated;
    grant select, insert, update, delete on public.transacoes to authenticated;
  `);
  const sql = await readFile(new URL('../database/caixinha_historico_edicao.sql', import.meta.url), 'utf8');
  await db.exec(sql);
  await db.exec(sql);
  const descriptionSql = await readFile(new URL('../database/transacao_descricao.sql', import.meta.url), 'utf8');
  await db.exec(descriptionSql);
  await db.exec(descriptionSql);
});

beforeEach(async () => {
  await db.exec('reset role; truncate public.caixinha_movimentos, public.transacoes, public.caixinhas, public.orcamentos, auth.users cascade;');
  await db.query('insert into auth.users values ($1),($2)', [A, B]);
  await db.query("insert into public.orcamentos values ($1,$1,'Moradia'),($2,$2,'Alheio')", [A, B]);
  await db.query("insert into public.caixinhas (id,user_id,nome,saldo_inicial,data_criacao) values ($1,$2,'Reserva',100,'2026-08-01')", [CAIXINHA, A]);
  await db.query("insert into public.transacoes (user_id,descricao,valor,tipo,data_transacao) values ($1,'Receita',200,'receita','2026-08-01')", [A]);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [A]);
  await db.exec('set role authenticated');
});

after(async () => { await db?.close(); });

async function registrar(valor = '30') {
  const result = await db.query(
    'select public.registrar_despesa_caixinha($1,$2,$3,$4,$5,$6,$7,$8,$9) as id',
    [CAIXINHA, 'Livro', valor, '2026-09-10', 'Educação', 'Livros', 'Pedro', 'book', A],
  );
  return result.rows[0].id;
}

async function saldo() {
  await db.exec('reset role');
  const value = (await db.query('select saldo_inicial::text as saldo from public.caixinhas where id=$1', [CAIXINHA])).rows[0].saldo;
  await db.exec('set role authenticated');
  return value;
}

test('registro e edição ajustam saldo, transação e histórico na mesma operação', async () => {
  const id = await registrar();
  assert.equal(await saldo(), '70.00');
  await db.query('select public.editar_despesa_caixinha($1,$2,$3,$4,$5,$6,$7,$8,$9)',
    [id, 'Livro revisado', '20', '2026-09-11', 'Educação', 'Livros', 'Pedro', 'book', A]);
  assert.equal(await saldo(), '80.00');
  assert.deepEqual((await db.query(`select t.valor::text, t.descricao, m.valor::text as movimento,
    m.descricao as movimento_descricao, m.data_movimento::text as data
    from public.transacoes t join public.caixinha_movimentos m on m.transacao_id=t.id where t.id=$1`, [id])).rows, [{
      valor:'20.00', descricao:'Livro revisado', movimento:'-20.00', movimento_descricao:'Livro revisado', data:'2026-09-11',
    }]);
});

test('aumento acima do saldo é recusado sem alteração parcial', async () => {
  const id = await registrar();
  await assert.rejects(db.query('select public.editar_despesa_caixinha($1,$2,$3,$4,$5,$6,$7,$8,$9)',
    [id, 'Livro', '150', '2026-09-10', 'Educação', null, 'Pedro', 'book', A]), /SALDO_CAIXINHA_INSUFICIENTE/);
  assert.equal(await saldo(), '70.00');
  assert.equal((await db.query('select valor::text from public.transacoes where id=$1', [id])).rows[0].valor, '30.00');
});

test('exclusão devolve o valor e remove a despesa e seu movimento', async () => {
  const id = await registrar();
  await db.query('select public.excluir_despesa_caixinha($1)', [id]);
  assert.equal(await saldo(), '100.00');
  assert.equal((await db.query('select count(*)::int as total from public.transacoes where id=$1', [id])).rows[0].total, 0);
  assert.equal((await db.query('select count(*)::int as total from public.caixinha_movimentos where transacao_id=$1', [id])).rows[0].total, 0);
});

test('depósitos e resgates alimentam o histórico com sinais corretos', async () => {
  await db.query("select public.movimentar_caixinha($1,'deposito',50,'2026-09-01')", [CAIXINHA]);
  await db.query("select public.movimentar_caixinha($1,'resgate',10,'2026-09-12')", [CAIXINHA]);
  assert.equal(await saldo(), '140.00');
  assert.deepEqual((await db.query("select tipo, valor::text from public.caixinha_movimentos where tipo <> 'ajuste' order by data_movimento")).rows, [
    { tipo:'entrada', valor:'50.00' }, { tipo:'saida', valor:'-10.00' },
  ]);
});

test('RLS oculta dados alheios e bloqueia escrita direta no histórico', async () => {
  assert.equal((await db.query('select count(*)::int as total from public.caixinha_movimentos')).rows[0].total, 1);
  await assert.rejects(db.query(`insert into public.caixinha_movimentos
    (user_id,caixinha_id,tipo,valor,descricao,data_movimento) values ($1,$2,'entrada',1,'Fraude',current_date)`, [A, CAIXINHA]), /row-level security/);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [B]);
  assert.equal((await db.query('select count(*)::int as total from public.caixinha_movimentos')).rows[0].total, 0);
});

test('RPCs não elevam privilégios e anon não pode executá-las', async () => {
  const { rows } = await db.query(`select p.proname, p.prosecdef,
    has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and ((p.proname='editar_despesa_caixinha' and p.pronargs=10)
      or p.proname='excluir_despesa_caixinha') order by p.proname`);
  assert.deepEqual(rows, [
    { proname:'editar_despesa_caixinha', prosecdef:false, anon_execute:false, authenticated_execute:true },
    { proname:'excluir_despesa_caixinha', prosecdef:false, anon_execute:false, authenticated_execute:true },
  ]);
});

test('descrição opcional é gravada junto com despesa paga pela caixinha', async () => {
  const id = (await db.query(
    'select public.registrar_despesa_caixinha($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) as id',
    [CAIXINHA, 'Livro', '10', '2026-09-10', 'Educação', 'Livros', 'Pedro', 'book', A, 'Compra didática'],
  )).rows[0].id;
  assert.equal((await db.query('select detalhes from public.transacoes where id=$1', [id])).rows[0].detalhes, 'Compra didática');
  await assert.rejects(db.query(
    'select public.editar_despesa_caixinha($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
    [id, 'Livro', '10', '2026-09-10', 'Educação', 'Livros', 'Pedro', 'book', A, 'x'.repeat(501)],
  ), /DESCRICAO_MUITO_LONGA/);
});
