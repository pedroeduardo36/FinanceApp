import { Dialog } from '@/components/ui/Dialog';
import { installments, localDate, validDate } from '@/lib/finance';
import { RESPONSAVEIS } from '@/lib/options';
import { useRows } from '@/hooks/useRows';
import { requireMutation } from '@/lib/dataCore';
import { Feedback } from '@/components/ui/Feedback';
import { moneyInput } from '@/lib/finance';
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Transacao } from '@/types';
import {
  Plus, Tag, X, Edit2, Trash2,
  ShoppingCart, Utensils, Car, Coffee, Home,
  Zap, Smartphone, Heart, Briefcase, DollarSign, PiggyBank, ArrowRightLeft,
  RotateCcw, CreditCard
} from 'lucide-react';

const ICONES_TRANSACOES: Record<string, React.ElementType> = {
  'tag': Tag, 'cart': ShoppingCart, 'food': Utensils, 'car': Car,
  'coffee': Coffee, 'home': Home, 'energy': Zap, 'phone': Smartphone,
  'health': Heart, 'work': Briefcase, 'money': DollarSign,
  'bank': PiggyBank, 'transfer': ArrowRightLeft
};

interface TransacoesPageProps {
  userId: string;
  transacoes: Transacao[];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
}

export function TransacoesPage({ userId, transacoes, isLoading, onRefresh }: TransacoesPageProps) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: categoriasList, error: categoriasError } = useRows('categorias', userId);
  const { data: cartoesList, error: loadError, reload: reloadCartoes } = useRows('cartoes_credito', userId);

  // Estados do Formulário
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [descricao, setDescricao] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [tipo, setTipo] = useState<Transacao['tipo']>('despesa');
  const [dataTransacao, setDataTransacao] = useState(localDate());
  const [categoria, setCategoria] = useState('');
  const [responsavel, setResponsavel] = useState(RESPONSAVEIS[1]);
  const [icone, setIcone] = useState('tag');
  const [parcelas, setParcelas] = useState(1);
  const [cartaoId, setCartaoId] = useState('');
  const [loading, setLoading] = useState(false);

  const [pagina, setPagina] = useState(0);
  const totalPaginas = Math.max(1, Math.ceil(transacoes.length / 50));
  const paginaAtual = Math.min(pagina, totalPaginas - 1);
  const ordenadas = [...transacoes].sort((a, b) => b.data_transacao.localeCompare(a.data_transacao) || a.id.localeCompare(b.id));

  // Estado do Toast
  const [toast, setToast] = useState<{ visible: boolean; transacao: Transacao | null }>({ visible: false, transacao: null });

  const abrirModal = (t?: Transacao) => {
    setActionError(null);
    if (t) {
      setEditandoId(t.id);
      setDescricao(t.descricao);
      setValorTotal(t.valor.toString());
      setTipo(t.tipo);
      setDataTransacao(t.data_transacao.split('T')[0]);
      setCategoria(t.categoria || '');
      setResponsavel(t.responsavel || RESPONSAVEIS[1]);
      setIcone(t.icone || 'tag');
      setCartaoId(t.cartao_id || '');
      setParcelas(1);
    } else {
      setEditandoId(null);
      setDescricao('');
      setValorTotal('');
      setTipo('despesa');
      setDataTransacao(localDate());
      setCategoria('');
      setResponsavel(RESPONSAVEIS[1]);
      setIcone('tag');
      setCartaoId('');
      setParcelas(1);
    }
    setIsModalOpen(true);
  };

  const handleExcluir = async (t: Transacao) => {
    try {
      await requireMutation(supabase.from('transacoes').delete().eq('id', t.id).eq('user_id', userId).select());
      await onRefresh();
      setToast({ visible: true, transacao: t });
    } catch {
      setActionError('Erro ao excluir transação.');
    }
  };

  const handleDesfazer = async () => {
    if (!toast.transacao) return;
    try {
      const payload = { ...toast.transacao };
      await requireMutation(supabase.from('transacoes').insert([payload]).select());
      await onRefresh();
      setToast({ visible: false, transacao: null });
    } catch {
      setActionError('Erro ao restaurar transação.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    if (loading) return;
    setLoading(true);
    try {
      if (!descricao.trim() || !validDate(dataTransacao)) throw new Error('Preencha a descrição e uma data válida.');
      const payloadBase = {
        user_id: userId, descricao: descricao.trim(), valor: moneyInput(valorTotal), tipo,
        categoria: categoria || 'Geral', responsavel: responsavel.trim(), icone,
        cartao_id: tipo === 'receita' ? null : cartaoId || null,
      };
      if (editandoId) {
        await requireMutation(supabase.from('transacoes').update({ ...payloadBase, data_transacao: dataTransacao })
          .eq('id', editandoId).eq('user_id', userId).select());
      } else {
        const parts = installments(valorTotal, tipo === 'despesa' ? parcelas : 1, dataTransacao);
        const payload = parts.map(part => ({ ...payloadBase, ...part,
          descricao: parts.length > 1 ? `${descricao.trim()} (${part.parcela_atual}/${parts.length})` : descricao.trim(),
        }));
        await requireMutation(supabase.from('transacoes').insert(payload).select(), payload.length);
      }
      setIsModalOpen(false);
      await onRefresh();
    } catch (error) { setActionError(error instanceof Error ? error.message : 'Não foi possível salvar a transação.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 relative">
      <Feedback error={actionError} />
      <Feedback error={loadError} retry={() => void reloadCartoes()} />
      <Feedback error={categoriasError} />
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Histórico de Transações</h2>
          <p className="text-sm text-slate-500">Acompanhe e edite todas as entradas e saídas.</p>
        </div>
        <button onClick={() => abrirModal()} className="bg-emerald-700 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm">
          <Plus size={18} /> Nova Transação
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {isLoading ? (
          <p className="text-slate-500 text-sm text-center py-8">Carregando transações...</p>
        ) : transacoes.length === 0 ? (
          <p className="text-slate-500 text-sm italic text-center py-8">Nenhuma transação registrada ainda.</p>
        ) : (
          <div className="space-y-3">
            {ordenadas.slice(paginaAtual * 50, (paginaAtual + 1) * 50).map((t) => {
              const isReceita = t.tipo === 'receita';
              const IconeCard = ICONES_TRANSACOES[t.icone || 'tag'] || Tag;
              const cartaoVinculado = cartoesList.find(c => c.id === t.cartao_id);

              return (
                <div key={t.id} className="group flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl flex items-center justify-center ${isReceita ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      <IconeCard size={20} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800">{t.descricao}</h4>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span>{new Date(t.data_transacao).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                        {t.categoria && <span className="flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md"><Tag size={12} /> {t.categoria}</span>}
                        {cartaoVinculado && <span className="flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md font-medium"><CreditCard size={12} /> {cartaoVinculado.nome}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <span className={`text-base font-bold ${isReceita ? 'text-emerald-700' : 'text-slate-800'}`}>
                      {isReceita ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.valor)}
                    </span>
                    <div className="flex gap-2 opacity-100  transition-opacity">
                      <button onClick={() => abrirModal(t)} className="text-slate-600 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-md transition-colors" aria-label="Editar"><Edit2 size={16} /></button>
                      <button onClick={() => handleExcluir(t)} className="text-slate-600 hover:text-red-600 hover:bg-red-50 p-2 rounded-md transition-colors" aria-label="Excluir"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <nav aria-label="Paginação das transações" className="flex gap-4 items-center">
        <button disabled={paginaAtual === 0} onClick={() => setPagina(paginaAtual - 1)}>Anterior</button>
        <span role="status">Página {paginaAtual + 1} de {totalPaginas}</span>
        <button disabled={paginaAtual + 1 >= totalPaginas} onClick={() => setPagina(paginaAtual + 1)}>Próxima</button>
      </nav>
      {/* MODAL DE CRIAÇÃO / EDIÇÃO */}
      {isModalOpen && (
        <Dialog label="Transação" onClose={() => setIsModalOpen(false)}>
          <Feedback error={actionError} />
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-lg">{editandoId ? 'Editar Transação' : 'Nova Transação'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-600 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100" aria-label="Fechar"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="transacoespage-field-0" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Descrição</label>
                  <input id="transacoespage-field-0" type="text" required value={descricao} onChange={(e) => setDescricao(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label htmlFor="transacoespage-field-1" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Valor {editandoId ? '' : 'Total'} (R$)</label>
                  <input id="transacoespage-field-1" type="number" min="0.01" step="0.01" required value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label htmlFor="transacoespage-field-2" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Data Base</label>
                  <input id="transacoespage-field-2" type="date" required value={dataTransacao} onChange={(e) => setDataTransacao(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label htmlFor="transacoespage-field-3" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Tipo</label>
                  <select id="transacoespage-field-3" value={tipo} onChange={(e) => setTipo(e.target.value === 'receita' ? 'receita' : e.target.value === 'fatura_cartao' ? 'fatura_cartao' : 'despesa')} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                    <option value="despesa">Despesa (Saída)</option>
                    <option value="receita">Receita (Entrada)</option>
                    <option value="fatura_cartao">Pagamento de fatura</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="transacoespage-field-4" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Cartão (Opcional)</label>
                  <select id="transacoespage-field-4" value={cartaoId} onChange={(e) => setCartaoId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                    <option value="">Nenhum</option>
                    {cartoesList.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="transacoespage-field-5" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Categoria</label>
                  <select id="transacoespage-field-5" value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                    <option value="">Geral</option>
                    {categoriasList.map((c) => <option key={c.id} value={c.nome}>{c.nome} {c.subcategoria ? `(${c.subcategoria})` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="transacoespage-field-6" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Responsável</label>
                  <input id="transacoespage-field-6" value={responsavel} onChange={e => setResponsavel(e.target.value)} list="responsaveis-sugeridos" className="w-full border rounded-lg p-2" />
                  <datalist id="responsaveis-sugeridos">{RESPONSAVEIS.map(resp => <option key={resp} value={resp} />)}</datalist>
                </div>

                {tipo === 'despesa' && !editandoId && (
                  <div className="md:col-span-2">
                    <label htmlFor="transacoespage-field-7" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Número de Parcelas</label>
                    <input id="transacoespage-field-7" type="number" min="1" max="48" value={parcelas} onChange={(e) => setParcelas(parseInt(e.target.value) || 1)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                  </div>
                )}

                <div className="md:col-span-2 mt-2">
                  <p className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">Ícone da Transação</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(ICONES_TRANSACOES).map(([chave, IconeComp]) => (
                      <button key={chave} aria-label={`Ícone ${chave}`} aria-pressed={icone === chave} type="button" onClick={() => setIcone(chave)} className={`p-2.5 rounded-lg border transition-all ${icone === chave ? 'bg-emerald-100 border-emerald-500 text-emerald-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        <IconeComp size={20} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium">Cancelar</button>
                <button type="submit" disabled={loading} className="bg-emerald-700 hover:bg-emerald-700 text-white font-medium py-2 px-6 rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50">
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </Dialog>
      )}

      {/* TOAST DE DESFAZER EXCLUSÃO */}
      {toast.visible && (
        <div role="status" aria-live="polite" className="fixed bottom-8 right-8 bg-slate-800 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 fade-in duration-300 z-50">
          <span className="text-sm font-medium">Transação excluída.</span>
          <button onClick={handleDesfazer} className="flex items-center gap-1 text-emerald-400 font-bold hover:text-emerald-300 transition-colors text-sm"><RotateCcw size={14} /> Desfazer</button>
          <button onClick={() => setToast({ visible: false, transacao: null })} className="text-slate-600 hover:text-white transition-colors ml-2" aria-label="Fechar"><X size={16} /></button>
        </div>
      )}
    </div>
  );
}
