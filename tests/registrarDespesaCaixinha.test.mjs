import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registrarDespesaCaixinha } from '../src/lib/registrarDespesaCaixinha.ts';

const despesa = {
  caixinhaId: '00000000-0000-0000-0000-000000000010',
  descricao: 'Material escolar', valor: '25.90', dataTransacao: '2026-09-14',
  categoria: 'Educação', subcategoria: 'Material', responsavel: 'Pedro', icone: 'tag',
};

test('envia uma única RPC com os dados da despesa e sem user_id', async () => {
  const chamadas = [];
  await registrarDespesaCaixinha({ rpc: async (...args) => {
    chamadas.push(args); return { error: null };
  } }, despesa);
  assert.deepEqual(chamadas, [['registrar_despesa_caixinha', {
    p_caixinha_id: despesa.caixinhaId,
    p_descricao: 'Material escolar', p_valor: '25.90', p_data_transacao: '2026-09-14',
    p_categoria: 'Educação', p_subcategoria: 'Material', p_responsavel: 'Pedro', p_icone: 'tag',
  }]]);
});

test('recusa dados inválidos antes de acessar o banco', async () => {
  const cliente = { rpc: () => assert.fail('não deveria acessar o banco') };
  for (const valor of ['', '0', '-1', '1.001', 'Infinity']) {
    await assert.rejects(registrarDespesaCaixinha(cliente, { ...despesa, valor }), /valor positivo/);
  }
  await assert.rejects(registrarDespesaCaixinha(cliente, { ...despesa, descricao: ' ' }), /obrigatórios/);
});

test('traduz erros esperados e não expõe detalhes internos', async () => {
  await assert.rejects(registrarDespesaCaixinha({ rpc: async () => ({ error: { message: 'SALDO_CAIXINHA_INSUFICIENTE' } }) }, despesa), /Saldo insuficiente/);
  await assert.rejects(registrarDespesaCaixinha({ rpc: async () => ({ error: { message: 'segredo interno' } }) }, despesa), /Atualize os saldos/);
});
