import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pagarCompromisso } from '../src/lib/pagarCompromisso.ts';

test('pagamento envia valor e competência mensal para uma única RPC', async () => {
  let chamada;
  await pagarCompromisso({ rpc: async (nome, parametros) => {
    chamada = { nome, parametros }; return { error:null };
  } }, 'compromisso', '125.90', '2026-09');
  assert.deepEqual(chamada, { nome:'marcar_compromisso_pago', parametros:{
    p_compromisso_id:'compromisso', p_valor:'125.90', p_competencia:'2026-09-01',
  } });
});

test('pagamento recusa valores inválidos e traduz erros do banco', async () => {
  const noCall = { rpc: async () => assert.fail('não deveria chamar a RPC') };
  await assert.rejects(pagarCompromisso(noCall, 'c', '', '2026-09'), /valor pago/);
  await assert.rejects(pagarCompromisso(noCall, 'c', '10', 'setembro'), /mês válido/);
  await assert.rejects(pagarCompromisso({ rpc: async () => ({ error:{message:'COMPROMISSO_JA_PAGO'} }) }, 'c', '10', '2026-09'), /já foi pago/);
});
