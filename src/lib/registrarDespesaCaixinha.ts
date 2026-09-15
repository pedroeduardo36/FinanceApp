interface DespesaCaixinha {
  caixinhaId: string;
  descricao: string;
  valor: string;
  dataTransacao: string;
  categoria: string;
  subcategoria: string | null;
  responsavel: string;
  icone: string;
}

interface ClienteDespesaCaixinha {
  rpc: (
    nome: 'registrar_despesa_caixinha',
    parametros: {
      p_caixinha_id: string;
      p_descricao: string;
      p_valor: string;
      p_data_transacao: string;
      p_categoria: string;
      p_subcategoria: string | null;
      p_responsavel: string;
      p_icone: string;
    },
  ) => PromiseLike<{ error: { message: string } | null }>;
}

const mensagens: Record<string, string> = {
  VALOR_INVALIDO: 'Insira um valor positivo com até duas casas decimais.',
  DADOS_INVALIDOS: 'Preencha os dados obrigatórios da despesa.',
  SALDO_CAIXINHA_INSUFICIENTE: 'Saldo insuficiente na caixinha selecionada.',
  CAIXINHA_INDISPONIVEL: 'Caixinha indisponível. Atualize a página.',
  SESSAO_INVALIDA: 'Sua sessão expirou. Entre novamente.',
};

export async function registrarDespesaCaixinha(cliente: ClienteDespesaCaixinha, despesa: DespesaCaixinha) {
  const valor = despesa.valor.trim();
  const [inteiros, decimais = ''] = valor.split('.');
  const centavos = Number(`${inteiros}${decimais.padEnd(2, '0')}`);
  if (!/^\d+(\.\d{1,2})?$/.test(valor) || !Number.isSafeInteger(centavos) || centavos <= 0) {
    throw new Error(mensagens.VALOR_INVALIDO);
  }
  if (!despesa.caixinhaId || !despesa.descricao.trim() || !despesa.responsavel.trim() || !despesa.dataTransacao) {
    throw new Error(mensagens.DADOS_INVALIDOS);
  }

  const mensagemFalha = 'Não foi possível registrar a despesa. Atualize os saldos antes de tentar novamente.';
  let resultado: Awaited<ReturnType<ClienteDespesaCaixinha['rpc']>>;
  try {
    resultado = await cliente.rpc('registrar_despesa_caixinha', {
      p_caixinha_id: despesa.caixinhaId,
      p_descricao: despesa.descricao.trim(),
      p_valor: valor,
      p_data_transacao: despesa.dataTransacao,
      p_categoria: despesa.categoria.trim() || 'Geral',
      p_subcategoria: despesa.subcategoria?.trim() || null,
      p_responsavel: despesa.responsavel.trim(),
      p_icone: despesa.icone,
    });
  } catch {
    throw new Error(mensagemFalha);
  }
  if (resultado.error) {
    throw new Error(Object.hasOwn(mensagens, resultado.error.message) ? mensagens[resultado.error.message] : mensagemFalha);
  }
}
