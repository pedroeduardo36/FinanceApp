import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const A='00000000-0000-0000-0000-000000000001';
const B='00000000-0000-0000-0000-000000000002';
const C='00000000-0000-0000-0000-000000000010';
let db;

before(async()=>{
  db=new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create schema auth;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,public to anon,authenticated;
    create table public.compromissos(id uuid primary key,user_id uuid not null,descricao text not null,valor numeric(14,2) not null,dia_vencimento integer not null,categoria text,responsavel text);
    create table public.transacoes(id uuid primary key default gen_random_uuid(),user_id uuid not null,descricao text not null,detalhes text,valor numeric(14,2) not null,tipo text not null,categoria text,responsavel text,icone text,data_transacao date not null);
    alter table public.compromissos enable row level security; alter table public.transacoes enable row level security;
    create policy c_select on public.compromissos for select to authenticated using(user_id=auth.uid());
    create policy c_update on public.compromissos for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
    create policy c_delete on public.compromissos for delete to authenticated using(user_id=auth.uid());
    create policy t_select on public.transacoes for select to authenticated using(user_id=auth.uid());
    create policy t_insert on public.transacoes for insert to authenticated with check(user_id=auth.uid());
    grant select,update,delete on public.compromissos to authenticated; grant select,insert on public.transacoes to authenticated;
  `);
  const sql=await readFile(new URL('../database/compromissos_parcelas_pagamentos.sql',import.meta.url),'utf8');
  await db.exec(sql); await db.exec(sql);
});

beforeEach(async()=>{
  await db.exec('reset role; truncate public.transacoes,public.compromissos;');
  await db.query("insert into public.compromissos(id,user_id,descricao,valor,dia_vencimento,categoria,responsavel,parcelas_restantes,competencia_inicio) values($1,$2,'Energia',null,31,'Casa','Ambos',2,'2026-09-01'),($3,$3,'Alheio',10,5,'Casa','Outro',null,'2026-09-01')",[C,A,B]);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[A]); await db.exec('set role authenticated');
});
after(async()=>db?.close());

test('pagamento cria despesa na data válida e reduz uma parcela atomicamente',async()=>{
  const id=(await db.query("select public.marcar_compromisso_pago($1,25.50,'2026-09-01') as id",[C])).rows[0].id;
  assert.deepEqual((await db.query('select descricao,valor::text,data_transacao::text,competencia_compromisso::text,compromisso_id from public.transacoes where id=$1',[id])).rows,[{
    descricao:'Energia',valor:'25.50',data_transacao:'2026-09-30',competencia_compromisso:'2026-09-01',compromisso_id:C,
  }]);
  assert.equal((await db.query('select parcelas_restantes from public.compromissos where id=$1',[C])).rows[0].parcelas_restantes,1);
});

test('mês duplicado e terceira parcela são recusados sem escrita parcial',async()=>{
  await db.query("select public.marcar_compromisso_pago($1,20,'2026-09-01')",[C]);
  await assert.rejects(db.query("select public.marcar_compromisso_pago($1,30,'2026-09-01')",[C]),/COMPROMISSO_JA_PAGO/);
  await db.query("select public.marcar_compromisso_pago($1,30,'2026-10-01')",[C]);
  await assert.rejects(db.query("select public.marcar_compromisso_pago($1,30,'2026-11-01')",[C]),/COMPROMISSO_CONCLUIDO/);
  assert.equal((await db.query('select count(*)::int as total from public.transacoes')).rows[0].total,2);
});

test('usuário não paga compromisso alheio e anon não executa a função',async()=>{
  await assert.rejects(db.query("select public.marcar_compromisso_pago($1,10,'2026-09-01')",[B]),/COMPROMISSO_INDISPONIVEL/);
  await db.exec('reset role; set role anon');
  await assert.rejects(db.query("select public.marcar_compromisso_pago($1,10,'2026-09-01')",[C]),/permission denied/);
});
