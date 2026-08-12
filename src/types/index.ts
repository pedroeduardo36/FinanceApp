export interface Cartao {
  id: string;
  nome: string;
  ultimos_digitos?: string;
  limite: number;
  banco?: string;
  cor: string;
  tipo: 'credito' | 'debito';
}

export interface Transacao {
  id: string;
  user_id: string;
  descricao: string;
  valor: number;
  data_transacao: string;
  tipo: 'receita' | 'despesa' | 'fatura_cartao';
  categoria?: string;
  parcela_atual?: number;
  total_parcelas?: number;
  responsavel?: string;
  icone?: string;
  cartao_id?: string; // Novo campo adicionado
}

export interface Compromisso {
  id: string;
  user_id: string;
  descricao: string;
  valor: number;
  dia_vencimento: number;
  categoria?: string;
  responsavel?: string;
}