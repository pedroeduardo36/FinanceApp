export async function collectPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown; count?: number | null }>,
  pageSize = 500,
): Promise<T[]> {
  const rows: T[] = [];
  for (;;) {
    const result = await fetchPage(rows.length, rows.length + pageSize - 1);
    if (result.error) throw new Error('Não foi possível carregar os dados. Tente novamente.');
    if (!result.data) throw new Error('Resposta de dados inválida.');
    if (!result.data.length) {
      if (result.count != null && rows.length < result.count) throw new Error('Os dados mudaram durante a consulta. Atualize a página.');
      return rows;
    }
    rows.push(...result.data);
    // Usa count, não o tamanho pedido: o servidor pode impor um limite menor.
    if (result.count != null && rows.length >= result.count) return rows;
  }
}
export async function requireMutation<T>(request: PromiseLike<{ data: T[] | null; error: unknown }>, expected = 1) {
  try {
    const { data, error } = await request;
    if (error || !data || data.length !== expected) throw new Error('mutation failed');
    return data;
  } catch {
    throw new Error('Não foi possível salvar a alteração. Verifique os dados e tente novamente.');
  }
}
// Cada consulta nova invalida a resposta anterior; também invalida no unmount.
export function requestSequence() {
  let generation = 0;
  return {
    next() { const current = ++generation; return () => current === generation; },
    invalidate() { generation++; },
  };
}
