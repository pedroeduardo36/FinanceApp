import { useCallback, useEffect, useRef, useState } from 'react';
import type { Entidades, Tabela } from '@/types';
import { listRows } from '@/lib/repository';
import { requestSequence } from '@/lib/dataCore';

export function useRows<K extends Tabela>(table: K, userId: string) {
  const [state, setState] = useState<{ data: Entidades[K][]; loading: boolean; error: string | null }>({ data: [], loading: true, error: null });
  const sequence = useRef(requestSequence());
  const controller = useRef<AbortController | null>(null);
  const reload = useCallback(() => {
    const current = sequence.current.next();
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    return listRows(table, userId, abort.signal).then(data => {
      if (current()) setState({ data, loading: false, error: null });
    }).catch(() => {
      if (current() && !abort.signal.aborted) setState({ data: [], loading: false, error: 'Não foi possível carregar os dados. Tente novamente.' });
    });
  }, [table, userId]);
  useEffect(() => {
    const requests = sequence.current;
    void reload();
    return () => { requests.invalidate(); controller.current?.abort(); };
  }, [reload]);
  return { ...state, reload };
}
