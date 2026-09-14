import assert from 'node:assert/strict';
import { before, beforeEach, after, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const A='00000000-0000-0000-0000-000000000001';
const B='00000000-0000-0000-0000-000000000002';
const tables=['transacoes','cartoes_credito','compromissos','caixinhas','categorias','orcamentos','orcamento_percentuais'];
let db;
before(async()=>{
 db=new PGlite();
 await db.exec(`create role anon; create role authenticated; create schema auth;
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth,public to authenticated,anon;
 create table public.transacoes (id uuid primary key default gen_random_uuid(),user_id uuid,descricao text default 'Teste',valor numeric default 10,data_transacao date default current_date,tipo text default 'despesa',total_parcelas int,parcela_atual int,cartao_id uuid);
 create table public.cartoes_credito (id uuid primary key default gen_random_uuid(),user_id uuid,nome text default 'Teste',limite numeric default 100);
 create table public.compromissos (id uuid primary key default gen_random_uuid(),user_id uuid,descricao text default 'Teste',valor numeric default 10,dia_vencimento int default 1);
 create table public.caixinhas (id uuid primary key default gen_random_uuid(),user_id uuid,nome text default 'Teste',saldo_inicial numeric default 0,meta_valor numeric);
 create table public.categorias (id uuid primary key default gen_random_uuid(),user_id uuid,nome text default 'Teste');
 create table public.orcamentos (id uuid primary key default gen_random_uuid(),user_id uuid,nome text default 'Teste');
 create table public.orcamento_percentuais (id uuid primary key default gen_random_uuid(),user_id uuid,orcamento_id uuid default gen_random_uuid(),competencia date default date '2026-01-01',percentual numeric default 0);`);
 // Simula uma política antiga insegura que o guard restritivo deve limitar.
 for(const table of tables) await db.exec(`create policy antiga_permissiva on public.${table} for all to authenticated using (true) with check (true)`);
 const sql=await readFile(new URL('../database/seguranca.sql',import.meta.url),'utf8');
 await db.exec(sql); await db.exec(sql); // Instalação repetível.
});
beforeEach(async()=>{
 await db.exec(`reset role; truncate ${tables.map(t=>'public.'+t).join(',')};`);
 for(const table of tables) await db.query(`insert into public.${table} (id,user_id) values ($1,$1),($2,$2)`,[A,B]);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[A]);
 await db.exec('set role authenticated');
});
after(async()=>{await db?.close();});
for(const table of tables) {
 test(`${table}: usuário só lê e modifica seus registros, mesmo com política permissiva antiga`,async()=>{
   assert.deepEqual((await db.query(`select user_id from public.${table}`)).rows,[{user_id:A}]);
   assert.equal((await db.query(`update public.${table} set user_id=$1 where id=$2 returning id`,[A,B])).rows.length,0);
   assert.equal((await db.query(`delete from public.${table} where id=$1 returning id`,[B])).rows.length,0);
   await assert.rejects(db.query(`insert into public.${table} (user_id) values ($1)`,[B]),/row-level security/);
   await assert.rejects(db.query(`update public.${table} set user_id=$1 where id=$2`,[B,A]),/row-level security/);
   assert.equal((await db.query(`update public.${table} set user_id=$1 where id=$1 returning id`,[A])).rows.length,1);
   await db.exec('reset role; set role anon');
   await assert.rejects(db.query(`select * from public.${table}`),/permission denied/);
 });
}
test('transação não aceita cartão de outra conta nem cartão inexistente',async()=>{
 await assert.rejects(db.query('update public.transacoes set cartao_id=$1 where id=$2',[B,A]),/foreign key/);
 await db.query('update public.transacoes set cartao_id=$1 where id=$1',[A]);
 await assert.rejects(db.query('delete from public.cartoes_credito where id=$1',[A]),/foreign key/);
});
test('banco recusa valores inválidos e vencimento fora do intervalo',async()=>{
 for(const value of ['0','-1','NaN','Infinity','0.001']) await assert.rejects(db.query('update public.transacoes set valor=$1 where id=$2',[value,A]),/check constraint/);
 await assert.rejects(db.query('update public.caixinhas set saldo_inicial=-1 where id=$1',[A]),/check constraint/);
 await assert.rejects(db.query('update public.compromissos set dia_vencimento=32 where id=$1',[A]),/check constraint/);
});
