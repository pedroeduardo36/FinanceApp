import { Dialog } from '@/components/ui/Dialog';
import { accountBalance, localDate, sumMoney } from '@/lib/finance';
import { useToday } from '@/hooks/useToday';
import { useRows } from '@/hooks/useRows';
import { requireMutation } from '@/lib/dataCore';
import { Feedback } from '@/components/ui/Feedback';
import { moneyInput } from '@/lib/finance';
import React, { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { movimentarCaixinha } from '@/lib/movimentarCaixinha';
import type { Transacao } from '@/types';
import { PiggyBank, Plus, TrendingUp, X, Edit2, Trash2, ArrowUpCircle, ArrowDownCircle, Loader2 } from 'lucide-react';

interface Caixinha {
  id: string;
  user_id: string;
  nome: string;
  saldo_inicial: number;
  meta_valor: number | null;
  data_criacao: string;
}

interface EconomiasPageProps {
  userId: string;
  transacoes: Transacao[];
  onRefreshTransacoes: () => Promise<void>;
}

export function EconomiasPage({ userId, transacoes, onRefreshTransacoes }: EconomiasPageProps) {
  const [actionError, setActionError] = useState<string | null>(null);
  const { data: caixinhas, loading, error: loadError, reload: fetchCaixinhas } = useRows('caixinhas', userId);
  const today = useToday();

  // Estados do Modal de Caixinha
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [meta, setMeta] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Estados do Modal de Movimentação (Depósito/Resgate)
  const [movimento, setMovimento] = useState<{ isOpen: boolean; tipo: 'deposito' | 'resgate'; caixinha: Caixinha | null }>({
    isOpen: false, tipo: 'deposito', caixinha: null
  });
  const [valorMovimento, setValorMovimento] = useState('');
  const [processandoMovimento, setProcessandoMovimento] = useState(false);
  const movimentoEmAndamento = useRef(false);

  const saldoDisponivelConta = accountBalance(transacoes, today);

  // Salvar/Editar Caixinha
  const handleSalvarCaixinha = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setSalvando(true);
    try {
      const saldoNum = 0;
      const metaNum = meta ? moneyInput(meta) : null;
      const payload = { user_id: userId, nome: nome.trim(), saldo_inicial: saldoNum, meta_valor: metaNum };

      if (editandoId) {
        await requireMutation(supabase.from('caixinhas').update({ nome: nome.trim(), meta_valor: metaNum }).eq('id', editandoId).eq('user_id', userId).select());
      } else {
        await requireMutation(supabase.from('caixinhas').insert([payload]).select());
      }
      setIsModalOpen(false);
      await fetchCaixinhas();
    } catch {
      setActionError('Erro ao salvar caixinha.');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta caixinha?')) return;
    try {
      await requireMutation(supabase.from('caixinhas').delete().eq('id', id).eq('user_id', userId).eq('saldo_inicial', 0).select());
      await fetchCaixinhas();
    } catch { setActionError('Só é possível excluir uma caixinha vazia. Verifique o saldo e tente novamente.'); }
  };

  // O banco valida o saldo atual e grava a movimentação em uma única transação.
  const handleMovimentoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    if (!movimento.caixinha || movimentoEmAndamento.current) return;

    movimentoEmAndamento.current = true;
    setProcessandoMovimento(true);
    try {
      await movimentarCaixinha(supabase, {
        caixinhaId: movimento.caixinha.id,
        tipo: movimento.tipo,
        valor: valorMovimento,
        dataTransacao: localDate(),
      });

      // Atualiza tudo
      setMovimento({ isOpen: false, tipo: 'deposito', caixinha: null });
      setValorMovimento('');
      await Promise.all([fetchCaixinhas(), onRefreshTransacoes()]);

    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Erro ao processar movimentação.');
    } finally {
      movimentoEmAndamento.current = false;
      setProcessandoMovimento(false);
    }
  };

  const abrirModalCaixinha = (c?: Caixinha) => {
    setActionError(null);
    if (c) {
      setEditandoId(c.id);
      setNome(c.nome);
      setMeta(c.meta_valor ? c.meta_valor.toString() : '');
    } else {
      setEditandoId(null);
      setNome('');
      setMeta('');
    }
    setIsModalOpen(true);
  };

  const saldoTotal = sumMoney(caixinhas.map(c => c.saldo_inicial));

  return (
    <div className="space-y-6 relative">
      <Feedback error={actionError} />
      <Feedback error={loadError} retry={() => void fetchCaixinhas()} />
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Minhas Economias</h2>
          <p className="text-sm text-slate-500">Separe seu dinheiro e acompanhe o saldo registrado.</p>
        </div>
        <button onClick={() => abrirModalCaixinha()} className="bg-emerald-700 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors">
          <Plus size={16} /> Criar Caixinha
        </button>
      </div>

      <div className="bg-emerald-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <PiggyBank size={120} className="absolute -right-6 -bottom-6 opacity-10" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-emerald-200 text-sm font-medium mb-1">Total Guardado</p>
            <h3 className="text-3xl font-bold mb-4">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldoTotal)}</h3>
            <div className="inline-flex items-center gap-1.5 bg-emerald-800/50 px-3 py-1.5 rounded-full text-xs font-medium text-emerald-300">
              <TrendingUp size={14} /> Saldo registrado, sem estimativa de juros
            </div>
          </div>
          <div className="bg-emerald-950/30 px-4 py-3 rounded-xl border border-emerald-800/50 text-right">
            <p className="text-emerald-200/70 text-xs font-medium uppercase tracking-wider mb-1">Saldo até hoje</p>
            <p className="text-lg font-bold text-emerald-100">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldoDisponivelConta)}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Carregando economias...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {caixinhas.map(c => {
            const progresso = c.meta_valor ? (c.saldo_inicial / c.meta_valor) * 100 : 0;
            return (
              <div key={c.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 relative group flex flex-col">
                <div className="absolute top-4 right-4 flex gap-2 opacity-100  transition-opacity">
                  <button onClick={() => abrirModalCaixinha(c)} className="text-slate-600 hover:text-blue-600 p-1" aria-label="Editar"><Edit2 size={16} /></button>
                  <button onClick={() => handleExcluir(c.id)} className="text-slate-600 hover:text-red-600 p-1" aria-label="Excluir"><Trash2 size={16} /></button>
                </div>

                <h4 className="font-bold text-slate-800 mb-1 pr-12">{c.nome}</h4>
                <p className="text-2xl font-bold text-emerald-700 mb-4">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.saldo_inicial)}</p>

                {c.meta_valor && (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Meta: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.meta_valor)}</span>
                      <span className="font-medium text-slate-700">{Math.min(100, progresso).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${Math.min(100, progresso)}%` }} />
                    </div>
                  </div>
                )}

                <div className="mt-auto pt-4 border-t border-slate-100 text-xs text-slate-500 flex justify-between mb-4">
                  <span>Saldo registrado: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.saldo_inicial)}</span>

                </div>

                {/* BOTÕES DE MOVIMENTAÇÃO */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button onClick={() => { setActionError(null); setValorMovimento(''); setMovimento({ isOpen: true, tipo: 'deposito', caixinha: c }); }} className="flex items-center justify-center gap-1.5 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-semibold transition-colors">
                    <ArrowUpCircle size={16} /> Guardar
                  </button>
                  <button onClick={() => { setActionError(null); setValorMovimento(''); setMovimento({ isOpen: true, tipo: 'resgate', caixinha: c }); }} className="flex items-center justify-center gap-1.5 py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-semibold transition-colors">
                    <ArrowDownCircle size={16} /> Resgatar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE MOVIMENTAÇÃO (DEPÓSITO/RESGATE) */}
      {movimento.isOpen && movimento.caixinha && (
        <Dialog label="Movimentar caixinha" onClose={() => { if (!processandoMovimento) setMovimento({ isOpen: false, tipo: 'deposito', caixinha: null }); }}>
          <Feedback error={actionError} />
          <form onSubmit={handleMovimentoSubmit} className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">
                {movimento.tipo === 'deposito' ? 'Guardar Dinheiro' : 'Resgatar Dinheiro'}
              </h3>
              <button type="button" disabled={processandoMovimento} onClick={() => setMovimento({ isOpen: false, tipo: 'deposito', caixinha: null })} className="text-slate-600 hover:text-slate-600 p-1 rounded-lg" aria-label="Fechar">
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-slate-500 mb-4">
              {movimento.tipo === 'deposito' ? `Transferindo para: ${movimento.caixinha.nome}` : `Retirando de: ${movimento.caixinha.nome}`}
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label htmlFor="economiaspage-field-0" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Qual valor?</label>
                <input id="economiaspage-field-0"
                  type="number" min="0.01" step="0.01" required autoFocus
                  value={valorMovimento} onChange={(e) => setValorMovimento(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-lg font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="R$ 0,00"
                />
              </div>

              {movimento.tipo === 'deposito' && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">Saldo Conta Principal:</span>
                  <span className={`font-bold ${parseFloat(valorMovimento) > saldoDisponivelConta ? 'text-red-500' : 'text-slate-800'}`}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldoDisponivelConta)}
                  </span>
                </div>
              )}
            </div>

            <button type="submit" disabled={processandoMovimento} className={`w-full text-white font-medium py-3 rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 ${movimento.tipo === 'deposito' ? 'bg-emerald-700 hover:bg-emerald-700' : 'bg-slate-800 hover:bg-slate-900'}`}>
              {processandoMovimento ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar'}
            </button>
          </form>
        </Dialog>
      )}

      {/* MODAL DE CAIXINHA (CRIAR/EDITAR) - MANTIDO IGUAL */}
      {isModalOpen && (
        <Dialog label="Caixinha" onClose={() => setIsModalOpen(false)}>
          <Feedback error={actionError} />
          <form onSubmit={handleSalvarCaixinha} className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">{editandoId ? 'Editar Caixinha' : 'Nova Caixinha'}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-600 hover:text-slate-600 p-1 rounded-lg" aria-label="Fechar"><X size={20} /></button>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <label htmlFor="economiaspage-field-1" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Nome do Objetivo</label>
                <input id="economiaspage-field-1" type="text" required value={nome} onChange={(e) => setNome(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="Ex: Reserva de Emergência" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <p className="text-sm text-slate-600">Use Guardar e Resgatar para movimentar o saldo.</p>
                <div>
                  <label htmlFor="economiaspage-field-2" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Meta Final (Opcional)</label>
                  <input id="economiaspage-field-2" type="number" min="0.01" step="0.01" value={meta} onChange={(e) => setMeta(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="0.00" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancelar</button>
              <button type="submit" disabled={salvando} className="px-6 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium">{salvando ? 'Salvando...' : 'Salvar Caixinha'}</button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
