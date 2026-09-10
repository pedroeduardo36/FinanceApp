import assert from 'node:assert/strict';
import { test } from 'node:test';
import { movimentarCaixinha } from '../src/lib/movimentarCaixinha.ts';

const movimento = {
  caixinhaId: '00000000-0000-0000-0000-000000000010',
  tipo: 'resgate',
  valor: '10.25',
  dataTransacao: '2026-09-08',
};

test('envia uma única RPC com decimal exato, sem confiar em saldo ou user_id do cliente', async () => {
  const chamadas = [];
  await movimentarCaixinha({ rpc: async (...args) => {
    chamadas.push(args);
    return { error: null };
  } }, movimento);
  assert.deepEqual(chamadas, [['movimentar_caixinha', {
    p_caixinha_id: movimento.caixinhaId,
    p_tipo: 'resgate',
    p_valor: '10.25',
    p_data_transacao: '2026-09-08',
  }]]);
});

test('valores inválidos são recusados antes de qualquer chamada', async () => {
  const cliente = { rpc: () => assert.fail('não deveria acessar o banco') };
  for (const valor of ['', ' ', '0', '-1', 'NaN', 'Infinity', '10abc', '1e2', '1.001', '90071992547409.92']) {
    await assert.rejects(movimentarCaixinha(cliente, { ...movimento, valor }), /valor positivo/);
  }
});

test('erro retornado pelo Supabase rejeita a movimentação com mensagem compreensível', async () => {
  await assert.rejects(movimentarCaixinha({ rpc: async () => ({
    error: { message: 'SALDO_CAIXINHA_INSUFICIENTE' },
  }) }, movimento), { message: 'Saldo insuficiente na caixinha.' });
});

test('erros internos não são expostos e falhas de rede não provocam repetição automática', async () => {
  let chamadas = 0;
  const cliente = { rpc: async () => {
    chamadas++;
    throw new Error('segredo interno');
  } };
  await assert.rejects(movimentarCaixinha(cliente, movimento), /Atualize os saldos/);
  assert.equal(chamadas, 1);
  await assert.rejects(movimentarCaixinha({ rpc: async () => ({
    error: { message: 'detalhes internos de uma constraint' },
  }) }, movimento), /Atualize os saldos/);
});
