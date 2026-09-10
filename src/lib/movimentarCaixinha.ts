interface Movimento {
  caixinhaId: string;
  tipo: 'deposito' | 'resgate';
  valor: string;
  dataTransacao: string;
}

interface ClienteMovimentacao {
  rpc: (
    nome: 'movimentar_caixinha',
    parametros: {
      p_caixinha_id: string;
      p_tipo: Movimento['tipo'];
      p_valor: string;
      p_data_transacao: string;
    },
  ) => PromiseLike<{ error: { message: string } | null }>;
}

const mensagens: Record<string, string> = {
  VALOR_INVALIDO: 'Insira um valor positivo com até duas casas decimais.',
  SALDO_CAIXINHA_INSUFICIENTE: 'Saldo insuficiente na caixinha.',
  SALDO_CONTA_INSUFICIENTE: 'Saldo insuficiente na conta principal.',
  CAIXINHA_INDISPONIVEL: 'Caixinha indisponível. Atualize a página.',
  SESSAO_INVALIDA: 'Sua sessão expirou. Entre novamente.',
};

export async function movimentarCaixinha(cliente: ClienteMovimentacao, movimento: Movimento) {
  const valor = movimento.valor.trim();
  const [inteiros, decimais = ''] = valor.split('.');
  const centavos = Number(`${inteiros}${decimais.padEnd(2, '0')}`);

  if (!/^\d+(\.\d{1,2})?$/.test(valor) || !Number.isSafeInteger(centavos) || centavos <= 0) {
    throw new Error(mensagens.VALOR_INVALIDO);
  }

  const mensagemFalha = 'Não foi possível confirmar a movimentação. Atualize os saldos antes de tentar novamente.';
  let resultado: Awaited<ReturnType<ClienteMovimentacao['rpc']>>;
  try {
    resultado = await cliente.rpc('movimentar_caixinha', {
      p_caixinha_id: movimento.caixinhaId,
      p_tipo: movimento.tipo,
      // Envia o decimal como texto para preservar os centavos até o Postgres.
      p_valor: valor,
      p_data_transacao: movimento.dataTransacao,
    });
  } catch {
    throw new Error(mensagemFalha);
  }

  if (resultado.error) {
    const mensagem = Object.hasOwn(mensagens, resultado.error.message)
      ? mensagens[resultado.error.message]
      : mensagemFalha;
    throw new Error(mensagem);
  }
}
