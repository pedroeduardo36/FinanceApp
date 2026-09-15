import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

let db;
before(async () => {
  db = new PGlite();
  await db.exec('create table public.transacoes (id uuid primary key default gen_random_uuid(), descricao text not null);');
  await db.exec("insert into public.transacoes (descricao) values ('Legada');");
  const sql = await readFile(new URL('../database/transacoes_subcategoria.sql', import.meta.url), 'utf8');
  await db.exec(sql);
  await db.exec(sql);
});
after(async () => { await db?.close(); });

test('a instalação repetível preserva registros antigos e adiciona a subcategoria opcional', async () => {
  assert.deepEqual((await db.query('select descricao, subcategoria from public.transacoes')).rows,
    [{ descricao: 'Legada', subcategoria: null }]);
  await db.query("update public.transacoes set subcategoria = 'Aulas Particulares'");
  assert.equal((await db.query('select subcategoria from public.transacoes')).rows[0].subcategoria, 'Aulas Particulares');
  await assert.rejects(db.query("update public.transacoes set subcategoria = '   '"), /check constraint/);
});
