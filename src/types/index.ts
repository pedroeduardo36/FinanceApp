export interface Cartao {
  id: string; user_id: string; nome: string; ultimos_digitos?: string | null;
  limite: number; banco?: string | null; cor: string; tipo: 'credito' | 'debito';
}
export interface Transacao {
  id: string; user_id: string; descricao: string; valor: number; data_transacao: string;
  tipo: 'receita' | 'despesa' | 'fatura_cartao'; categoria?: string | null;
  subcategoria?: string | null;
  parcela_atual?: number | null; total_parcelas?: number | null;
  responsavel?: string | null; icone?: string | null; cartao_id?: string | null;
}
export interface Compromisso {
  id: string; user_id: string; descricao: string; valor: number; dia_vencimento: number;
  categoria?: string | null; responsavel?: string | null;
}
export interface Categoria { id: string; user_id: string; nome: string; subcategoria?: string | null }
export interface Caixinha {
  id: string; user_id: string; nome: string; saldo_inicial: number;
  meta_valor: number | null; data_criacao: string;
}
export interface Orcamento {
  id: string; user_id: string; nome: string; criado_em: string;
}
export interface OrcamentoPercentual {
  id: string; user_id: string; orcamento_id: string; competencia: string;
  percentual: number;
}
export interface Entidades {
  transacoes: Transacao; cartoes_credito: Cartao; compromissos: Compromisso;
  categorias: Categoria; caixinhas: Caixinha; orcamentos: Orcamento;
  orcamento_percentuais: OrcamentoPercentual;
}
export type Tabela = keyof Entidades;
