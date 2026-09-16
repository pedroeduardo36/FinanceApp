interface DadosDespesaCaixinha {
  transacaoId: string; descricao: string; detalhes: string | null; valor: string; dataTransacao: string;
  categoria: string; subcategoria: string | null; responsavel: string; icone: string;
  orcamentoId: string | null;
}

interface ClienteEdicao {
  rpc: (nome: 'editar_despesa_caixinha', parametros: {
    p_transacao_id: string; p_descricao: string; p_valor: string; p_data_transacao: string;
    p_categoria: string; p_subcategoria: string | null; p_responsavel: string; p_icone: string;
    p_orcamento_id: string | null; p_detalhes: string | null;
  }) => PromiseLike<{ error: { message: string } | null }>;
}
interface ClienteExclusao {
  rpc: (nome: 'excluir_despesa_caixinha', parametros: { p_transacao_id: string }) =>
    PromiseLike<{ error: { message: string } | null }>;
}

const mensagens: Record<string, string> = {
  VALOR_INVALIDO: 'Insira um valor positivo com até duas casas decimais.',
  DADOS_INVALIDOS: 'Preencha os dados obrigatórios da despesa.',
  SALDO_CAIXINHA_INSUFICIENTE: 'A caixinha não possui saldo para aumentar esta despesa.',
  DESPESA_CAIXINHA_INDISPONIVEL: 'Esta despesa não está mais disponível. Atualize a página.',
  ORCAMENTO_INDISPONIVEL: 'Orçamento indisponível. Escolha outro orçamento.',
  SESSAO_INVALIDA: 'Sua sessão expirou. Entre novamente.',
};

function validarValor(value: string) {
  const valueText = value.trim();
  const [whole, decimal = ''] = valueText.split('.');
  const cents = Number(`${whole}${decimal.padEnd(2, '0')}`);
  if (!/^\d+(\.\d{1,2})?$/.test(valueText) || !Number.isSafeInteger(cents) || cents <= 0) {
    throw new Error(mensagens.VALOR_INVALIDO);
  }
  return valueText;
}

function traduzir(error: { message: string } | null) {
  if (!error) return;
  throw new Error(Object.hasOwn(mensagens, error.message)
    ? mensagens[error.message]
    : 'Não foi possível alterar a despesa. Atualize os saldos antes de tentar novamente.');
}

export async function editarDespesaCaixinha(cliente: ClienteEdicao, dados: DadosDespesaCaixinha) {
  if (!dados.transacaoId || !dados.descricao.trim() || !dados.responsavel.trim() || !dados.dataTransacao) {
    throw new Error(mensagens.DADOS_INVALIDOS);
  }
  const valor = validarValor(dados.valor);
  let result: Awaited<ReturnType<ClienteEdicao['rpc']>>;
  try {
    result = await cliente.rpc('editar_despesa_caixinha', {
      p_transacao_id: dados.transacaoId,
      p_descricao: dados.descricao.trim(),
      p_valor: valor,
      p_data_transacao: dados.dataTransacao,
      p_categoria: dados.categoria.trim() || 'Geral',
      p_subcategoria: dados.subcategoria?.trim() || null,
      p_responsavel: dados.responsavel.trim(),
      p_icone: dados.icone,
      p_orcamento_id: dados.orcamentoId || null,
      p_detalhes: dados.detalhes?.trim() || null,
    });
  } catch {
    throw new Error('Não foi possível alterar a despesa. Atualize os saldos antes de tentar novamente.');
  }
  traduzir(result.error);
}

export async function excluirDespesaCaixinha(cliente: ClienteExclusao, transacaoId: string) {
  if (!transacaoId) throw new Error(mensagens.DESPESA_CAIXINHA_INDISPONIVEL);
  let result: Awaited<ReturnType<ClienteExclusao['rpc']>>;
  try {
    result = await cliente.rpc('excluir_despesa_caixinha', { p_transacao_id: transacaoId });
  } catch {
    throw new Error('Não foi possível excluir a despesa. Atualize os saldos antes de tentar novamente.');
  }
  traduzir(result.error);
}
