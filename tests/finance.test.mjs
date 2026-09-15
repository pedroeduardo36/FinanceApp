import assert from 'node:assert/strict';
import { test } from 'node:test';
import { installments, sumMoney, summarize, accountBalance, localDate, moneyInput, monthBounds, shiftMonth, monthlyIncome, budgetAmount, percentageFromAmount, budgetIncomeRows, savingsMonthlyHistory } from '../src/lib/finance.ts';
import { collectPages, requireMutation, requestSequence } from '../src/lib/dataCore.ts';
const row = (date, value, type = 'receita', extra = {}) => ({ id: date, user_id: 'a', descricao: 'Teste', data_transacao: date, valor: value, tipo: type, ...extra });

test('parcelas preservam o dia original após meses curtos e distribuem centavos', () => {
  const parts = installments('100', 3, '2026-01-31');
  assert.deepEqual(parts.map(p => p.data_transacao), ['2026-01-31','2026-02-28','2026-03-31']);
  assert.deepEqual(parts.map(p => p.valor), [33.34,33.33,33.33]);
  assert.equal(sumMoney(parts.map(p => p.valor)), 100);
  assert.equal(installments('1', 2, '2028-01-31')[1].data_transacao, '2028-02-29');
});
test('valores e parcelas inválidos não geram lançamentos', () => {
  for (const count of [0,49,1.2,NaN]) assert.throws(() => installments('10', count, '2026-01-01'));
  assert.throws(() => installments('0.01', 2, '2026-01-01'));
  assert.throws(() => installments('1', 1, '2026-02-31'));
  for (const amount of ['Infinity','1foo','-1','0','0.001']) assert.throws(() => moneyInput(amount));
});
test('fluxo diário separa anos e ordena datas completas', () => {
  const result = summarize([row('2026-01-01', 0.2),row('2025-01-01', 0.1),row('2025-12-31', 0.3,'fatura_cartao')], '2025-01-01','2026-12-31');
  assert.deepEqual(result.dadosTimeline.map(d => d.data), ['2025-01-01','2025-12-31','2026-01-01']);
  assert.equal(result.totalReceitas, 0.3);
  assert.equal(result.totalDespesas, 0.3);
  assert.equal(result.saldoLiquido, 0);
  assert.equal(result.dadosPizza[0].value, 0.3);
});
test('intervalos vazios/invertidos não quebram os relatórios', () => {
  assert.equal(summarize([row('2026-01-01',1)], '', '').quantidade, 0);
  assert.equal(summarize([row('2026-01-01',1)], '2026-02-01', '2026-01-01').quantidade, 0);
});
test('saldo disponível não inclui lançamentos futuros', () => {
  assert.equal(accountBalance([row('2026-01-01',100),row('2026-01-02',20,'despesa'),row('2099-01-01',1000)], '2026-01-02'), 80);
  assert.equal(accountBalance([row('2026-01-01',100),row('2026-01-02',20,'despesa',{caixinha_id:'reserva'})], '2026-01-02'), 100);
  const date = new Date(2026, 0, 1, 23, 59);
  assert.equal(localDate(date), '2026-01-01');
});
test('orçamentos usam todas e somente as receitas do mês civil selecionado', () => {
  const rows = [
    row('2026-01-31', 50), row('2026-02-01', 100), row('2026-02-28', 20),
    row('2026-02-15', 90, 'despesa'), row('2026-03-01', 200),
  ];
  assert.deepEqual(monthBounds('2026-02'), { start: '2026-02-01', end: '2026-02-28' });
  assert.deepEqual(monthBounds('2028-02'), { start: '2028-02-01', end: '2028-02-29' });
  assert.deepEqual(monthlyIncome(rows, '2026-02').map(item => item.valor), [100, 20]);
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
});
test('aulas particulares são agrupadas por categoria e subcategoria com os detalhes preservados', () => {
  const rows = [
    row('2026-09-01', 40, 'receita', { id: 'a', descricao: 'Piano', categoria: 'Salário', subcategoria: 'Aulas Particulares', responsavel: 'Pedro' }),
    row('2026-09-02', 60, 'receita', { id: 'b', descricao: 'Violão', categoria: ' salário ', subcategoria: ' aulas particulares ', responsavel: 'Ana' }),
    row('2026-09-03', 20, 'receita', { id: 'c', descricao: 'Empresa', categoria: 'Salário', subcategoria: 'CLT', responsavel: 'Pedro' }),
  ];
  const grouped = budgetIncomeRows(rows, '2026-09');
  assert.deepEqual(grouped.map(item => ({ title: item.title, value: item.value, grouped: item.grouped })), [
    { title: 'Aulas Particulares', value: 100, grouped: true },
    { title: 'Empresa', value: 20, grouped: false },
  ]);
  assert.equal(grouped[0].responsible, 'Vários responsáveis');
  assert.deepEqual(grouped[0].details.map(item => item.descricao), ['Piano', 'Violão']);
});
test('distribuição percentual preserva centavos e valida os limites', () => {
  assert.equal(budgetAmount(1000, 12.34), 123.4);
  assert.equal(budgetAmount(0.05, 50), 0.03);
  assert.throws(() => budgetAmount(100, 100.01));
  assert.throws(() => budgetAmount(100, 1.0000001));
});
test('valor específico calcula uma porcentagem precisa e reconstrói o valor informado', () => {
  const percentage = percentageFromAmount(2427.5, 100);
  assert.equal(percentage, 4.119464);
  assert.equal(budgetAmount(2427.5, percentage), 100);
  assert.equal(percentageFromAmount(100, 0), 0);
  assert.throws(() => percentageFromAmount(0, 10), /Não há entradas/);
});
test('histórico da caixinha resume entradas, saídas e saldo acumulado por mês', () => {
  const history = savingsMonthlyHistory([
    { id:'d', caixinha_id:'c', user_id:'a', tipo:'saida', valor:-10, descricao:'Resgate', data_movimento:'2026-09-12', criado_em:'2026-09-12T10:00:00Z' },
    { id:'a', caixinha_id:'c', user_id:'a', tipo:'ajuste', valor:100, descricao:'Saldo inicial', data_movimento:'2026-08-01', criado_em:'2026-08-01T10:00:00Z' },
    { id:'c', caixinha_id:'c', user_id:'a', tipo:'entrada', valor:50, descricao:'Depósito', data_movimento:'2026-09-01', criado_em:'2026-09-01T10:00:00Z' },
    { id:'b', caixinha_id:'c', user_id:'a', tipo:'gasto', valor:-20, descricao:'Livro', data_movimento:'2026-08-20', criado_em:'2026-08-20T10:00:00Z' },
  ]);
  assert.deepEqual(history, [
    { month:'2026-09', income:50, expense:10, balance:120 },
    { month:'2026-08', income:100, expense:20, balance:80 },
  ]);
});
test('paginação continua mesmo quando o servidor limita uma página abaixo do pedido', async () => {
  const data = Array.from({length:1201}, (_,i)=>i);
  const rows = await collectPages(async (from) => ({data:data.slice(from,from+100),error:null,count:data.length}));
  assert.deepEqual(rows,data);
});
test('falha na segunda página não produz total parcial', async () => {
  await assert.rejects(collectPages(async from => from === 0 ? {data:[1],error:null,count:2} : {data:null,error:{message:'erro'}}));
});
test('mutation rejeita erros retornados, falhas de rede e zero linhas modificadas', async () => {
  await assert.rejects(requireMutation(Promise.resolve({data:null,error:{message:'interno'}})), /Não foi possível/);
  await assert.rejects(requireMutation(Promise.resolve({data:[],error:null})), /Não foi possível/);
  await assert.rejects(requireMutation(Promise.reject(new Error('segredo'))), /Não foi possível/);
  assert.deepEqual(await requireMutation(Promise.resolve({data:[{id:1}],error:null})),[{id:1}]);
});
test('resposta antiga ou posterior ao unmount não pode atualizar a conta', () => {
  const sequence = requestSequence();
  const older=sequence.next(); const latest=sequence.next();
  assert.equal(older(),false); assert.equal(latest(),true);
  sequence.invalidate(); assert.equal(latest(),false);
});
