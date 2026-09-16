import type { Entidades } from './index';
// Contrato local, baseado nos campos utilizados. Conferir com o schema remoto antes de publicar.
// Não é apresentado como arquivo gerado por um banco que não foi inspecionado.
type Table<R extends { id: string; user_id: string }> = {
  Row: { [K in keyof R]: R[K] };
  Insert: Omit<R, 'id' | 'data_criacao' | 'criado_em' | 'atualizado_em'> & {
    id?: string; data_criacao?: string; criado_em?: string; atualizado_em?: string;
  };
  Update: Partial<R>;
  Relationships: [];
};
export type Database = {
  public: {
    Tables: { [K in keyof Entidades]: Table<Entidades[K]> };
    Views: Record<never, never>;
    Functions: {
      movimentar_caixinha: {
        Args: { p_caixinha_id: string; p_tipo: string; p_valor: string; p_data_transacao: string };
        Returns: undefined;
      };
      registrar_despesa_caixinha: {
        Args: {
          p_caixinha_id: string; p_descricao: string; p_valor: string; p_data_transacao: string;
          p_categoria: string; p_subcategoria: string | null; p_responsavel: string; p_icone: string;
          p_orcamento_id: string | null; p_detalhes: string | null;
        };
        Returns: string;
      };
      editar_despesa_caixinha: {
        Args: {
          p_transacao_id: string; p_descricao: string; p_valor: string; p_data_transacao: string;
          p_categoria: string; p_subcategoria: string | null; p_responsavel: string; p_icone: string;
          p_orcamento_id: string | null; p_detalhes: string | null;
        };
        Returns: undefined;
      };
      excluir_despesa_caixinha: { Args: { p_transacao_id: string }; Returns: undefined };
      marcar_compromisso_pago: {
        Args: { p_compromisso_id: string; p_valor: string; p_competencia: string };
        Returns: string;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
