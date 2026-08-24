import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Transacao } from '@/types';
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
  onRefreshTransacoes: () => void;
}

const TAXA_CDI_ANUAL = 0.1050;
const TAXA_CDI_DIARIA = Math.pow(1 + TAXA_CDI_ANUAL, 1 / 252) - 1;

export function EconomiasPage({ userId, transacoes, onRefreshTransacoes }: EconomiasPageProps) {
  const [caixinhas, setCaixinhas] = useState<Caixinha[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados do Modal de Caixinha
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [saldo, setSaldo] = useState('');
  const [meta, setMeta] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Estados do Modal de Movimentação (Depósito/Resgate)
  const [movimento, setMovimento] = useState<{ isOpen: boolean; tipo: 'deposito' | 'resgate'; caixinha: Caixinha | null }>({
    isOpen: false, tipo: 'deposito', caixinha: null
  });
  const [valorMovimento, setValorMovimento] = useState('');
  const [processandoMovimento, setProcessandoMovimento] = useState(false);

  const fetchCaixinhas = async () => {
    setLoading(true);
    const { data } = await supabase.from('caixinhas').select('*').eq('user_id', userId).order('data_criacao', { ascending: false });
    if (data) setCaixinhas(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchCaixinhas();
  }, [userId]);

  const saldoDisponivelConta = useMemo(() => {
    return transacoes.reduce((acc, t) => acc + (t.tipo === 'receita' ? t.valor : -t.valor), 0);
  }, [transacoes]);

  const caixinhasComRendimento = useMemo(() => {
    const hoje = new Date();
    return caixinhas.map(c => {
      const dataCriacao = new Date(c.data_criacao);
      const diffTime = Math.abs(hoje.getTime() - dataCriacao.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const saldoAtualizado = c.saldo_inicial * Math.pow(1 + TAXA_CDI_DIARIA, diffDays);
      const rendimento = saldoAtualizado - c.saldo_inicial;

      return {
        ...c,
        saldo_atual: saldoAtualizado,
        rendimento: rendimento,
      };
    });
  }, [caixinhas]);

  // Salvar/Editar Caixinha
  const handleSalvarCaixinha = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const saldoNum = parseFloat(saldo) || 0;
      const metaNum = meta ? parseFloat(meta) : null;
      const payload = { user_id: userId, nome, saldo_inicial: saldoNum, meta_valor: metaNum };

      if (editandoId) {
        await supabase.from('caixinhas').update(payload).eq('id', editandoId);
      } else {
        await supabase.from('caixinhas').insert([payload]);
      }
      setIsModalOpen(false);
      fetchCaixinhas();
    } catch (error) {
      alert('Erro ao salvar caixinha.');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta caixinha?')) return;
    await supabase.from('caixinhas').delete().eq('id', id);
    fetchCaixinhas();
  };

  // Processar Depósito ou Resgate (Atualiza Caixinha + Cria Transação)
  const handleMovimentoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movimento.caixinha) return;

    const valor = parseFloat(valorMovimento);
    if (!valor || valor <= 0) return alert('Insira um valor válido.');

    if (movimento.tipo === 'deposito' && valor > saldoDisponivelConta) {
      return alert('Saldo insuficiente na conta principal!');
    }

    setProcessandoMovimento(true);
    try {
      // 1. Calcula novo saldo da caixinha
      let novoSaldo = movimento.caixinha.saldo_inicial;
      if (movimento.tipo === 'deposito') {
        novoSaldo += valor;
      } else {
        novoSaldo = Math.max(0, novoSaldo - valor);
      }

      // 2. Atualiza a Caixinha no banco
      await supabase.from('caixinhas').update({ saldo_inicial: novoSaldo }).eq('id', movimento.caixinha.id);

      // 3. Cria a transação na conta principal
      const [ano, mes, dia] = new Date().toISOString().split('T')[0].split('-').map(Number);
      const dataFormatada = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      
      const transacaoPayload = {
        user_id: userId,
        descricao: movimento.tipo === 'deposito' ? `Depósito: ${movimento.caixinha.nome}` : `Resgate: ${movimento.caixinha.nome}`,
        valor: valor,
        tipo: movimento.tipo === 'deposito' ? 'despesa' : 'receita',
        categoria: 'Economias',
        icone: 'bank',
        data_transacao: dataFormatada,
        responsavel: 'Ambos'
      };

      await supabase.from('transacoes').insert([transacaoPayload]);

      // Atualiza tudo
      setMovimento({ isOpen: false, tipo: 'deposito', caixinha: null });
      setValorMovimento('');
      fetchCaixinhas();
      onRefreshTransacoes();
      
    } catch (error) {
      alert('Erro ao processar movimentação.');
    } finally {
      setProcessandoMovimento(false);
    }
  };

  const abrirModalCaixinha = (c?: Caixinha) => {
    if (c) {
      setEditandoId(c.id);
      setNome(c.nome);
      setSaldo(c.saldo_inicial.toString());
      setMeta(c.meta_valor ? c.meta_valor.toString() : '');
    } else {
      setEditandoId(null);
      setNome('');
      setSaldo('');
      setMeta('');
    }
    setIsModalOpen(true);
  };

  const saldoTotal = caixinhasComRendimento.reduce((acc, c) => acc + c.saldo_atual, 0);
  const rendimentoTotal = caixinhasComRendimento.reduce((acc, c) => acc + c.rendimento, 0);

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Minhas Economias</h2>
          <p className="text-sm text-slate-500">Separe seu dinheiro e acompanhe o rendimento.</p>
        </div>
        <button onClick={() => abrirModalCaixinha()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors">
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
              <TrendingUp size={14} /> Rendimento acumulado: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rendimentoTotal)}
            </div>
          </div>
          <div className="bg-emerald-950/30 px-4 py-3 rounded-xl border border-emerald-800/50 text-right">
            <p className="text-emerald-200/70 text-xs font-medium uppercase tracking-wider mb-1">Disponível na Conta</p>
            <p className="text-lg font-bold text-emerald-100">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldoDisponivelConta)}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Carregando economias...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {caixinhasComRendimento.map(c => {
            const progresso = c.meta_valor ? (c.saldo_atual / c.meta_valor) * 100 : 0;
            return (
              <div key={c.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 relative group flex flex-col">
                <div className="absolute top-4 right-4 flex gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                  <button onClick={() => abrirModalCaixinha(c)} className="text-slate-400 hover:text-blue-600 p-1"><Edit2 size={16} /></button>
                  <button onClick={() => handleExcluir(c.id)} className="text-slate-400 hover:text-red-600 p-1"><Trash2 size={16} /></button>
                </div>
                
                <h4 className="font-bold text-slate-800 mb-1 pr-12">{c.nome}</h4>
                <p className="text-2xl font-bold text-emerald-600 mb-4">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.saldo_atual)}</p>

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
                  <span>Depósito base: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.saldo_inicial)}</span>
                  <span className="text-emerald-600 font-medium">+{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.rendimento)}</span>
                </div>

                {/* BOTÕES DE MOVIMENTAÇÃO */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button onClick={() => setMovimento({ isOpen: true, tipo: 'deposito', caixinha: c })} className="flex items-center justify-center gap-1.5 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-semibold transition-colors">
                    <ArrowUpCircle size={16} /> Guardar
                  </button>
                  <button onClick={() => setMovimento({ isOpen: true, tipo: 'resgate', caixinha: c })} className="flex items-center justify-center gap-1.5 py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-semibold transition-colors">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleMovimentoSubmit} className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">
                {movimento.tipo === 'deposito' ? 'Guardar Dinheiro' : 'Resgatar Dinheiro'}
              </h3>
              <button type="button" onClick={() => setMovimento({ isOpen: false, tipo: 'deposito', caixinha: null })} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <p className="text-sm text-slate-500 mb-4">
              {movimento.tipo === 'deposito' ? `Transferindo para: ${movimento.caixinha.nome}` : `Retirando de: ${movimento.caixinha.nome}`}
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Qual valor?</label>
                <input 
                  type="number" step="0.01" required autoFocus
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
            
            <button type="submit" disabled={processandoMovimento} className={`w-full text-white font-medium py-3 rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 ${movimento.tipo === 'deposito' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-800 hover:bg-slate-900'}`}>
              {processandoMovimento ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar'}
            </button>
          </form>
        </div>
      )}

      {/* MODAL DE CAIXINHA (CRIAR/EDITAR) - MANTIDO IGUAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSalvarCaixinha} className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">{editandoId ? 'Editar Caixinha' : 'Nova Caixinha'}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"><X size={20} /></button>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Nome do Objetivo</label>
                <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="Ex: Reserva de Emergência" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Depósito Inicial (R$)</label>
                  <input type="number" step="0.01" value={saldo} onChange={(e) => setSaldo(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="Opcional" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Meta Final (Opcional)</label>
                  <input type="number" step="0.01" value={meta} onChange={(e) => setMeta(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="0.00" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancelar</button>
              <button type="submit" disabled={salvando} className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium">{salvando ? 'Salvando...' : 'Salvar Caixinha'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}