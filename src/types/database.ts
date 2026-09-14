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
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
