interface ClientePagamento {
  rpc: (nome: 'marcar_compromisso_pago', parametros: {
    p_compromisso_id: string; p_valor: string; p_competencia: string;
  }) => PromiseLike<{ error: { message: string } | null }>;
}

const mensagens: Record<string, string> = {
  COMPROMISSO_INDISPONIVEL: 'Este compromisso não está mais disponível.',
  COMPROMISSO_CONCLUIDO: 'Todas as parcelas deste compromisso já foram pagas.',
  COMPROMISSO_JA_PAGO: 'Este compromisso já foi pago no mês selecionado.',
  COMPETENCIA_INVALIDA: 'Selecione um mês válido para o pagamento.',
  VALOR_INVALIDO: 'Informe o valor pago com até duas casas decimais.',
  SESSAO_INVALIDA: 'Sua sessão expirou. Entre novamente.',
};

export async function pagarCompromisso(cliente: ClientePagamento, compromissoId: string, valorInformado: string, competencia: string) {
  const valor = valorInformado.trim();
  const [inteiros, decimais = ''] = valor.split('.');
  const centavos = Number(inteiros + decimais.padEnd(2, '0'));
  if (!/^\d+(\.\d{1,2})?$/.test(valor) || !Number.isSafeInteger(centavos) || centavos <= 0) {
    throw new Error(mensagens.VALOR_INVALIDO);
  }
  if (!compromissoId || !/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia)) throw new Error(mensagens.COMPETENCIA_INVALIDA);
  let result: Awaited<ReturnType<ClientePagamento['rpc']>>;
  try {
    result = await cliente.rpc('marcar_compromisso_pago', {
      p_compromisso_id: compromissoId, p_valor: valor, p_competencia: `${competencia}-01`,
    });
  } catch {
    throw new Error('Não foi possível registrar o pagamento. Atualize os dados e tente novamente.');
  }
  if (result.error) throw new Error(mensagens[result.error.message]
    ?? 'Não foi possível registrar o pagamento. Atualize os dados e tente novamente.');
}
