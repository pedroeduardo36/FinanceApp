import { Dialog } from '@/components/ui/Dialog';
import { RESPONSAVEIS, RESPONSAVEL_PADRAO } from '@/lib/options';
import { useRows } from '@/hooks/useRows';
import { requireMutation } from '@/lib/dataCore';
import { Feedback } from '@/components/ui/Feedback';
import { localDate, moneyInput, sumMoney } from '@/lib/finance';
import { pagarCompromisso } from '@/lib/pagarCompromisso';
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Compromisso } from '@/types';
import { Plus, Edit2, Trash2, CalendarDays, RotateCcw, X, Tag, User, CircleCheck, Loader2 } from 'lucide-react';

interface CompromissosPageProps {
  userId: string;
  onRefreshTransacoes: () => Promise<void>;
}

export function CompromissosPage({ userId, onRefreshTransacoes }: CompromissosPageProps) {
  const [actionError, setActionError] = useState<string | null>(null);
  const { data: compromissos, loading, error: loadError, reload: fetchData } = useRows('compromissos', userId);
  const { data: categoriasList, error: categoriasError } = useRows('categorias', userId);

  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [diaVencimento, setDiaVencimento] = useState('5');
  const [categoria, setCategoria] = useState('');
  const [responsavel, setResponsavel] = useState(RESPONSAVEL_PADRAO);
  const [parcelas, setParcelas] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [pagamento, setPagamento] = useState<Compromisso | null>(null);
  const [valorPagamento, setValorPagamento] = useState('');
  const [mesPagamento, setMesPagamento] = useState(localDate().slice(0, 7));
  const [pagando, setPagando] = useState(false);

  // Estado do Toast de Desfazer
  const [toast, setToast] = useState<{ visible: boolean; compromisso: Compromisso | null }>({
    visible: false,
    compromisso: null
  });

  const abrirModal = (c?: Compromisso) => {
    setActionError(null);
    if (c) {
      setEditandoId(c.id);
      setDescricao(c.descricao);
      setValor(c.valor?.toString() ?? '');
      setDiaVencimento(c.dia_vencimento.toString());
      setCategoria(c.categoria || '');
      setResponsavel(c.responsavel?.toLocaleLowerCase('pt-BR') === 'eu' ? RESPONSAVEL_PADRAO : c.responsavel || RESPONSAVEL_PADRAO);
      setParcelas(c.parcelas_restantes?.toString() ?? '');
    } else {
      setEditandoId(null);
      setDescricao('');
      setValor('');
      setDiaVencimento('5');
      setCategoria('');
      setResponsavel(RESPONSAVEL_PADRAO);
      setParcelas('');
    }
    setIsModalOpen(true);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setSalvando(true);
    try {
      const valorNum = valor.trim() ? moneyInput(valor) : null;
      const diaNum = Number(diaVencimento);
      const parcelasNum = parcelas.trim() ? Number(parcelas) : null;
      if (!Number.isInteger(diaNum) || diaNum < 1 || diaNum > 31) throw new Error('Informe um dia entre 1 e 31.');
      if (parcelasNum !== null && (!Number.isInteger(parcelasNum) || parcelasNum < 0 || parcelasNum > 600)) throw new Error('Informe até 600 parcelas.');
      const payload = {
        user_id: userId,
        descricao,
        valor: valorNum,
        dia_vencimento: diaNum,
        categoria: categoria || 'Geral',
        responsavel,
        parcelas_restantes: parcelasNum,
      };

      if (editandoId) {
        await requireMutation(supabase.from('compromissos').update(payload).eq('id', editandoId).eq('user_id', userId).select());
      } else {
        await requireMutation(supabase.from('compromissos').insert([{ ...payload, competencia_inicio: `${localDate().slice(0, 7)}-01` }]).select());
      }
      setIsModalOpen(false);
      await fetchData();
    } catch {
      setActionError('Erro ao salvar compromisso.');
    } finally {
      setSalvando(false);
    }
  };

  const abrirPagamento = (compromisso: Compromisso) => {
    setActionError(null);
    setPagamento(compromisso);
    setValorPagamento(compromisso.valor?.toString() ?? '');
    setMesPagamento(localDate().slice(0, 7));
  };

  const handlePagamento = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!pagamento || pagando) return;
    setPagando(true); setActionError(null);
    try {
      await pagarCompromisso(supabase, pagamento.id, valorPagamento, mesPagamento);
      setPagamento(null);
      await Promise.all([fetchData(), onRefreshTransacoes()]);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Não foi possível registrar o pagamento.');
    } finally { setPagando(false); }
  };

  const handleExcluir = async (c: Compromisso) => {
    try {
      await requireMutation(supabase.from('compromissos').delete().eq('id', c.id).eq('user_id', userId).select());
      await fetchData();

      setToast({ visible: true, compromisso: c });
    } catch {
      setActionError('Erro ao excluir compromisso.');
    }
  };

  const handleDesfazer = async () => {
    if (!toast.compromisso) return;
    try {
      const payload = { ...toast.compromisso };

      await requireMutation(supabase.from('compromissos').insert([payload]).select());
      await fetchData();
      setToast({ visible: false, compromisso: null });
    } catch {
      setActionError('Erro ao restaurar o compromisso.');
    }
  };

  const totalCustosFixos = sumMoney(compromissos.flatMap(c => c.valor == null ? [] : [c.valor]));

  return (
    <div className="space-y-6 relative">
      <Feedback error={actionError} />
      <Feedback error={loadError} retry={() => void fetchData()} />
      <Feedback error={categoriasError} />
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Compromissos Recorrentes</h2>
          <p className="text-sm text-slate-500">Controle seus custos fixos: assinaturas, aluguel, financiamentos.</p>
        </div>
        <button
          onClick={() => abrirModal()}
          className="bg-emerald-700 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors shadow-sm shrink-0"
        >
          <Plus size={18} /> Novo Compromisso
        </button>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-indigo-500 mb-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
            <CalendarDays size={24} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500">Custo Fixo Mensal Estimado</h3>
            <p className="text-2xl font-bold text-slate-800">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCustosFixos)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {loading ? (
          <p className="text-slate-500 text-sm text-center py-8">Carregando compromissos...</p>
        ) : compromissos.length === 0 ? (
          <p className="text-slate-500 text-sm italic text-center py-8">Nenhuma conta recorrente cadastrada.</p>
        ) : (
          <div className="space-y-3">
            {compromissos.map((c) => (
              <div key={c.id} className="group flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex flex-col items-center justify-center shrink-0 border border-slate-200">
                    <span className="text-[10px] font-semibold uppercase leading-none mb-1 text-slate-600">Dia</span>
                    <span className="font-bold leading-none">{c.dia_vencimento}</span>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-800">{c.descricao}</h4>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                      {c.categoria && (
                        <span className="flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                          <Tag size={12} /> {c.categoria}
                        </span>
                      )}
                      {c.responsavel && (
                        <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-medium">
                          <User size={12} /> {c.responsavel}
                        </span>
                      )}
                      {c.parcelas_restantes != null && <span className="rounded-md bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700">{c.parcelas_restantes === 0 ? 'Concluído' : `${c.parcelas_restantes} parcela${c.parcelas_restantes === 1 ? '' : 's'} restante${c.parcelas_restantes === 1 ? '' : 's'}`}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 md:gap-6">
                  <span className="text-base font-bold text-slate-800">
                    {c.valor == null ? <span className="text-sm text-slate-500">Valor variável</span> : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.valor)}
                  </span>

                  <div className="flex gap-2 opacity-100  transition-opacity">
                    <button disabled={c.parcelas_restantes === 0} onClick={() => abrirPagamento(c)} className="p-2 text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40" title="Marcar como pago" aria-label={`Marcar ${c.descricao} como pago`}><CircleCheck size={17} /></button>
                    <button onClick={() => abrirModal(c)} className="text-slate-600 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-md transition-colors" title="Editar" aria-label="Editar">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleExcluir(c)} className="text-slate-600 hover:text-red-600 hover:bg-red-50 p-2 rounded-md transition-colors" title="Excluir" aria-label="Excluir">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <Dialog label="Compromisso" onClose={() => setIsModalOpen(false)}>
          <Feedback error={actionError} />
          <form onSubmit={handleSalvar} className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">{editandoId ? 'Editar Compromisso' : 'Novo Compromisso'}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-600 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors" aria-label="Fechar">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label htmlFor="compromissospage-field-0" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Descrição</label>
                <input id="compromissospage-field-0" type="text" required value={descricao} onChange={(e) => setDescricao(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="compromissospage-field-1" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Valor previsto (Opcional)</label>
                  <input id="compromissospage-field-1" type="number" min="0.01" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label htmlFor="compromissospage-field-2" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Dia do Vencimento</label>
                  <input id="compromissospage-field-2" type="number" min="1" max="31" required value={diaVencimento} onChange={(e) => setDiaVencimento(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
              </div>

              <div>
                <label htmlFor="compromissospage-installments" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Parcelas restantes (Opcional)</label>
                <input id="compromissospage-installments" type="number" min="0" max="600" value={parcelas} onChange={(e) => setParcelas(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                <p className="mt-1 text-xs text-slate-500">Deixe vazio para um compromisso recorrente sem prazo.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="compromissospage-field-3" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Categoria</label>
                  <select id="compromissospage-field-3" value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                    <option value="">Geral</option>
                    {categoriasList.map((c) => <option key={c.id} value={c.nome}>{c.nome} {c.subcategoria ? `(${c.subcategoria})` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="compromissospage-field-4" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Responsável</label>
                  <input id="compromissospage-field-4" value={responsavel} onChange={e => setResponsavel(e.target.value)} list="responsaveis-sugeridos" className="w-full border rounded-lg p-2" />
                  <datalist id="responsaveis-sugeridos">{RESPONSAVEIS.map(resp => <option key={resp} value={resp} />)}</datalist>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm font-medium">Cancelar</button>
              <button type="submit" disabled={salvando} className="px-6 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 text-sm font-medium">
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {pagamento && (
        <Dialog label={`Pagamento de ${pagamento.descricao}`} onClose={() => { if (!pagando) setPagamento(null); }}>
          <form onSubmit={handlePagamento} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Marcar como pago</p><h3 className="text-lg font-bold text-slate-800">{pagamento.descricao}</h3></div><button type="button" disabled={pagando} onClick={() => setPagamento(null)} aria-label="Fechar" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X size={20} /></button></div>
            <Feedback error={actionError} />
            <div className="space-y-4">
              <div><label htmlFor="commitment-payment-month" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Mês do pagamento</label><input id="commitment-payment-month" type="month" required value={mesPagamento} onChange={e => setMesPagamento(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></div>
              <div><label htmlFor="commitment-payment-value" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Valor pago (R$)</label><input id="commitment-payment-value" type="number" min="0.01" step="0.01" required autoFocus value={valorPagamento} onChange={e => setValorPagamento(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></div>
            </div>
            <button type="submit" disabled={pagando} className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 py-2.5 font-medium text-white disabled:opacity-60">{pagando && <Loader2 size={16} className="animate-spin" />}{pagando ? 'Registrando...' : 'Confirmar pagamento'}</button>
          </form>
        </Dialog>
      )}

      {/* TOAST */}
      {toast.visible && (
        <div role="status" aria-live="polite" className="fixed bottom-8 right-8 bg-slate-800 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 fade-in duration-300 z-50">
          <span className="text-sm font-medium">Compromisso excluído.</span>
          <button onClick={handleDesfazer} className="flex items-center gap-1 text-emerald-400 font-bold hover:text-emerald-300 transition-colors text-sm">
            <RotateCcw size={14} /> Desfazer
          </button>
          <button onClick={() => setToast({ visible: false, compromisso: null })} className="text-slate-600 hover:text-white transition-colors ml-2" aria-label="Fechar">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
