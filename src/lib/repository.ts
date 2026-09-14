import { supabase } from './supabase';
import { collectPages } from './dataCore';
import type { Entidades, Tabela } from '@/types';

export async function listRows<K extends Tabela>(table: K, userId: string, signal: AbortSignal): Promise<Entidades[K][]> {
  const rows = await collectPages((from, to) => supabase.from(table as Tabela).select('*', { count: 'exact' })
    .eq('user_id', userId).order('id').range(from, to).abortSignal(signal));
  // Supabase infere união de tabelas em funções genéricas; a tabela é escolhida pelo chamador tipado.
  const result = rows as unknown as Entidades[K][];
  for (const row of result) {
    if (row.user_id !== userId) throw new Error('Resposta não pertence à conta atual.');
    for (const key of ['valor', 'limite', 'saldo_inicial', 'meta_valor'] as const) {
      if (key in row) {
        const value = row[key as keyof typeof row];
        if (value != null && (typeof value !== 'number' || !Number.isFinite(value))) throw new Error('Valor inválido recebido do banco.');
      }
    }
  }
  return result;
}
