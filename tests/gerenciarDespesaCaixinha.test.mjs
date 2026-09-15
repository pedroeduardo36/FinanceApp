import assert from 'node:assert/strict';
import { test } from 'node:test';
import { editarDespesaCaixinha, excluirDespesaCaixinha } from '../src/lib/gerenciarDespesaCaixinha.ts';

const dados = {
  transacaoId: 'transacao', descricao: '  Livro  ', valor: '25.90', dataTransacao: '2026-09-15',
  categoria: ' Educação ', subcategoria: ' Livros ', responsavel: ' Pedro ', icone: 'book',
  orcamentoId: 'orcamento',
};

test('edição envia os dados normalizados para a RPC atômica', async () => {
  let chamada;
  await editarDespesaCaixinha({ rpc: async (nome, parametros) => {
    chamada = { nome, parametros }; return { error: null };
  } }, dados);
  assert.deepEqual(chamada, { nome:'editar_despesa_caixinha', parametros: {
    p_transacao_id:'transacao', p_descricao:'Livro', p_valor:'25.90', p_data_transacao:'2026-09-15',
    p_categoria:'Educação', p_subcategoria:'Livros', p_responsavel:'Pedro', p_icone:'book',
    p_orcamento_id:'orcamento',
  } });
});

test('exclusão usa a RPC que devolve o valor para a caixinha', async () => {
  let chamada;
  await excluirDespesaCaixinha({ rpc: async (nome, parametros) => {
    chamada = { nome, parametros }; return { error: null };
  } }, 'transacao');
  assert.deepEqual(chamada, { nome:'excluir_despesa_caixinha', parametros:{ p_transacao_id:'transacao' } });
});

test('validação local impede valores inválidos e dados incompletos', async () => {
  let chamadas = 0;
  const cliente = { rpc: async () => { chamadas += 1; return { error:null }; } };
  await assert.rejects(editarDespesaCaixinha(cliente, { ...dados, valor:'1.001' }), /duas casas/);
  await assert.rejects(editarDespesaCaixinha(cliente, { ...dados, descricao:' ' }), /obrigatórios/);
  await assert.rejects(excluirDespesaCaixinha(cliente, ''), /não está mais disponível/);
  assert.equal(chamadas, 0);
});

test('erros conhecidos do banco viram mensagens seguras', async () => {
  const cliente = { rpc: async () => ({ error:{ message:'SALDO_CAIXINHA_INSUFICIENTE' } }) };
  await assert.rejects(editarDespesaCaixinha(cliente, dados), /saldo para aumentar/);
});

test('falhas de rede não expõem detalhes internos', async () => {
  const cliente = { rpc: async () => { throw new Error('INTERNAL_SECRET'); } };
  await assert.rejects(editarDespesaCaixinha(cliente, dados), error =>
    !error.message.includes('INTERNAL_SECRET') && error.message.includes('Não foi possível alterar'));
  await assert.rejects(excluirDespesaCaixinha(cliente, 'transacao'), error =>
    !error.message.includes('INTERNAL_SECRET') && error.message.includes('Não foi possível excluir'));
});
