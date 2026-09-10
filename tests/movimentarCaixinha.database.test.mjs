import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, beforeEach, after, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const usuario = '00000000-0000-0000-0000-000000000001';
const outroUsuario = '00000000-0000-0000-0000-000000000002';
const caixinha = '00000000-0000-0000-0000-000000000010';
const outraCaixinha = '00000000-0000-0000-0000-000000000020';
let db;

before(async () => {
  db = new PGlite();
  // Contrato mínimo inferido do frontend, não é um dump do banco real.
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
      id uuid primary key, user_id uuid not null, nome text not null,
      saldo_inicial numeric(14,2) not null
    );
    create table public.transacoes (
      id uuid primary key default gen_random_uuid(), user_id uuid not null,
      descricao text not null, valor numeric(14,2) not null,
      tipo public.tipo_transacao not null, categoria text, icone text,
      data_transacao date not null, responsavel text
    );
    alter table public.caixinhas enable row level security;
    alter table public.transacoes enable row level security;
    create policy caixinhas_select on public.caixinhas for select to authenticated
      using (user_id = auth.uid());
    create policy caixinhas_update on public.caixinhas for update to authenticated
      using (user_id = auth.uid()) with check (user_id = auth.uid());
    create policy transacoes_select on public.transacoes for select to authenticated
      using (user_id = auth.uid());
    create policy transacoes_insert on public.transacoes for insert to authenticated
      with check (user_id = auth.uid() and coalesce(current_setting('test.deny_insert', true), '') <> 'yes');
    grant select, update on public.caixinhas to authenticated;
    grant select, insert on public.transacoes to authenticated;
    create function public.simular_falha() returns trigger language plpgsql as $$
    begin
      if current_setting('test.insert_failure', true) = 'raise' then
        raise exception 'FALHA_INSERT_SIMULADA';
      elsif current_setting('test.insert_failure', true) = 'skip' then
        return null;
      end if;
      return new;
    end;
    $$;
    create trigger falha_insert before insert on public.transacoes
      for each row execute function public.simular_falha();
  `);
  await db.exec(await readFile(new URL('../database/movimentar_caixinha.sql', import.meta.url), 'utf8'));
});

beforeEach(async () => {
  await db.exec(`reset role;
    select set_config('test.insert_failure', '', false);
    select set_config('test.deny_insert', '', false);
    truncate public.caixinhas, public.transacoes;
  `);
  await db.query(`insert into public.caixinhas values
    ($1, $2, 'Reserva', 100), ($3, $4, 'Outra conta', 500)`,
  [caixinha, usuario, outraCaixinha, outroUsuario]);
  await db.query(`insert into public.transacoes (user_id, descricao, valor, tipo, data_transacao)
    values ($1, 'Saldo inicial', 200, 'receita', '2026-09-01')`, [usuario]);
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [usuario]);
  await db.exec('set role authenticated');
});

after(async () => { await db?.close(); });

function movimentar(tipo, valor, id = caixinha) {
  return db.query('select public.movimentar_caixinha($1, $2, $3, $4)', [id, tipo, valor, '2026-09-08']);
}

async function estado() {
  return {
    caixinhas: (await db.query('select id, saldo_inicial::text as saldo from public.caixinhas order by id')).rows,
    transacoes: (await db.query(`select user_id, descricao, valor::text, tipo::text, categoria
      from public.transacoes order by descricao, valor`)).rows,
  };
}

test('R$ 100 não permitem resgate de R$ 200: nenhuma escrita', async () => {
  const antes = await estado();
  await assert.rejects(movimentar('resgate', '200'), /SALDO_CAIXINHA_INSUFICIENTE/);
  assert.deepEqual(await estado(), antes);
});

test('resgate exato zera a caixinha e cria somente a receita correspondente', async () => {
  await movimentar('resgate', '100');
  const depois = await estado();
  assert.equal(depois.caixinhas[0].saldo, '0.00');
  assert.deepEqual(depois.transacoes[0], {
    user_id: usuario, descricao: 'Resgate: Reserva', valor: '100.00', tipo: 'receita', categoria: 'Economias',
  });
  assert.equal(depois.transacoes.length, 2);
});

test('depósito atualiza o saldo e lança a despesa com centavos exatos', async () => {
  await movimentar('deposito', '10.25');
  const depois = await estado();
  assert.equal(depois.caixinhas[0].saldo, '110.25');
  assert.equal(depois.transacoes[0].valor, '10.25');
  assert.equal(depois.transacoes[0].tipo, 'despesa');
});

test('depósito sem saldo é recusado pelo banco', async () => {
  const antes = await estado();
  await assert.rejects(movimentar('deposito', '200.01'), /SALDO_CONTA_INSUFICIENTE/);
  assert.deepEqual(await estado(), antes);
});

test('validação no banco também recusa valores inválidos enviados diretamente', async () => {
  const antes = await estado();
  for (const valor of [null, '0', '-1', 'NaN', 'Infinity', '-Infinity', '1.001', '90071992547409.92']) {
    await assert.rejects(movimentar('resgate', valor), /VALOR_INVALIDO/);
  }
  for (const tipo of [null, '', 'invalido']) {
    await assert.rejects(movimentar(tipo, '1'), /MOVIMENTO_INVALIDO/);
  }
  assert.deepEqual(await estado(), antes);
});

test('falha no INSERT desfaz o UPDATE anterior', async () => {
  const antes = await estado();
  await db.exec("select set_config('test.insert_failure', 'raise', false)");
  await assert.rejects(movimentar('resgate', '20'), /FALHA_INSERT_SIMULADA/);
  assert.deepEqual(await estado(), antes);
});

test('INSERT silenciosamente suprimido por trigger também desfaz o UPDATE', async () => {
  const antes = await estado();
  await db.exec("select set_config('test.insert_failure', 'skip', false)");
  await assert.rejects(movimentar('deposito', '20'), /TRANSACAO_NAO_REGISTRADA/);
  assert.deepEqual(await estado(), antes);
});

test('RLS recusando o lançamento desfaz a alteração da caixinha', async () => {
  const antes = await estado();
  await db.exec("select set_config('test.deny_insert', 'yes', false)");
  await assert.rejects(movimentar('resgate', '20'), /row-level security/);
  assert.deepEqual(await estado(), antes);
});

test('usa o saldo atual do banco a cada chamada, sem sobrescrever movimentação anterior', async () => {
  await movimentar('resgate', '70');
  await assert.rejects(movimentar('resgate', '70'), /SALDO_CAIXINHA_INSUFICIENTE/);
  await movimentar('deposito', '10');
  await movimentar('deposito', '20');
  assert.equal((await estado()).caixinhas[0].saldo, '60.00');
});

test('depósitos em caixinhas diferentes consomem o mesmo saldo da conta', async () => {
  await db.exec('reset role');
  await db.query('update public.caixinhas set user_id = $1 where id = $2', [usuario, outraCaixinha]);
  await db.exec('set role authenticated');
  await movimentar('deposito', '150');
  const antes = await estado();
  await assert.rejects(movimentar('deposito', '100', outraCaixinha), /SALDO_CONTA_INSUFICIENTE/);
  assert.deepEqual(await estado(), antes);
});

test('caixinha alheia ou inexistente não pode ser movimentada', async () => {
  const antes = await estado();
  await assert.rejects(movimentar('resgate', '1', outraCaixinha), /CAIXINHA_INDISPONIVEL/);
  await assert.rejects(movimentar('resgate', '1', '00000000-0000-0000-0000-000000000099'), /CAIXINHA_INDISPONIVEL/);
  assert.deepEqual(await estado(), antes);
});

test('sem identidade autenticada a função não movimenta dinheiro', async () => {
  await db.exec("select set_config('request.jwt.claim.sub', '', false)");
  await assert.rejects(movimentar('resgate', '1'), /SESSAO_INVALIDA/);
});

test('anon não tem EXECUTE e a função não eleva privilégios', async () => {
  const { rows } = await db.query(`select p.prosecdef,
    has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'movimentar_caixinha'`);
  assert.deepEqual(rows, [{ prosecdef: false, anon_execute: false, authenticated_execute: true }]);
  await db.exec('reset role; set role anon');
  await assert.rejects(movimentar('resgate', '1'), /permission denied for function/);
});
