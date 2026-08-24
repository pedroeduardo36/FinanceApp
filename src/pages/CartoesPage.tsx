import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Cartao, Transacao } from '@/types';
import { Plus, Edit2, Trash2, CreditCard, RotateCcw, X, SmartphoneNfc } from 'lucide-react';

interface CartoesPageProps {
  userId: string;
  transacoes: Transacao[];
}

const OPCOES_CORES = [
  { nome: 'Nubank / Roxinho', hex: '#8b5cf6' },
  { nome: 'Inter / Laranja', hex: '#f97316' },
  { nome: 'C6 / Black', hex: '#0f172a' },
  { nome: 'Itaú / Azul', hex: '#3b82f6' },
  { nome: 'Bradesco / Vermelho', hex: '#ef4444' },
  { nome: 'Santander / Vermelho', hex: '#dc2626' },
  { nome: 'Next / Verde', hex: '#10b981' },
  { nome: 'Prata / Platinum', hex: '#94a3b8' },
];

export function CartoesPage({ userId, transacoes }: CartoesPageProps) {
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [ultimosDigitos, setUltimosDigitos] = useState('');
  const [limite, setLimite] = useState('');
  const [banco, setBanco] = useState('');
  const [cor, setCor] = useState(OPCOES_CORES[0].hex);
  const [tipo, setTipo] = useState<'credito' | 'debito'>('credito');
  const [salvando, setSalvando] = useState(false);

  // Estado do Toast de Desfazer
  const [toast, setToast] = useState<{ visible: boolean; cartao: Cartao | null }>({
    visible: false,
    cartao: null
  });

  const fetchCartoes = async () => {
    // ATUALIZADO PARA cartoes_credito
    const { data } = await supabase.from('cartoes_credito').select('*').eq('user_id', userId).order('nome');
    setCartoes(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCartoes();
  }, [userId]);

  const abrirModal = (cartao?: Cartao) => {
    if (cartao) {
      setEditandoId(cartao.id);
      setNome(cartao.nome);
      setUltimosDigitos(cartao.ultimos_digitos || '');
      setLimite(cartao.limite.toString());
      setBanco(cartao.banco || '');
      setCor(cartao.cor);
      setTipo(cartao.tipo);
    } else {
      setEditandoId(null);
      setNome('');
      setUltimosDigitos('');
      setLimite('');
      setBanco('');
      setCor(OPCOES_CORES[0].hex);
      setTipo('credito');
    }
    setIsModalOpen(true);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const limiteNum = parseFloat(limite) || 0;
      const payload = { user_id: userId, nome, ultimos_digitos: ultimosDigitos, limite: limiteNum, banco, cor, tipo };

      let result;
      if (editandoId) {
        result = await supabase.from('cartoes_credito').update(payload).eq('id', editandoId).select();
      } else {
        result = await supabase.from('cartoes_credito').insert([payload]).select();
      }

      // Se o banco recusar, o alerta vai pular na tela detalhando o porquê!
      if (result.error) {
        alert(`ERRO DO BANCO: ${result.error.message} (Detalhes: ${result.error.details || 'Nenhum'})`);
        setSalvando(false);
        return;
      }

      setIsModalOpen(false);
      fetchCartoes();
    } catch (error: any) {
      alert('Erro no aplicativo: ' + (error.message || 'Desconhecido'));
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (cartao: Cartao) => {
    try {
      // ATUALIZADO PARA cartoes_credito
      await supabase.from('cartoes_credito').delete().eq('id', cartao.id);
      fetchCartoes();
      
      setToast({ visible: true, cartao });
      setTimeout(() => {
        setToast((prev) => prev.cartao?.id === cartao.id ? { visible: false, cartao: null } : prev);
      }, 5000);
    } catch (error) {
      alert('Erro ao excluir cartão.');
    }
  };

  const handleDesfazer = async () => {
    if (!toast.cartao) return;
    try {
      const payload = { ...toast.cartao };
      delete (payload as any).id; 
      
      // ATUALIZADO PARA cartoes_credito
      await supabase.from('cartoes_credito').insert([payload]);
      fetchCartoes();
      setToast({ visible: false, cartao: null });
    } catch (error) {
      alert('Erro ao restaurar o cartão.');
    }
  };

  // Cálculo da fatura atual (mês vigente simplificado)
  const calcularFatura = (cartaoId: string) => {
    const mesAtual = new Date().getMonth();
    const anoAtual = new Date().getFullYear();
    
    return transacoes
      .filter(t => {
        if (t.cartao_id !== cartaoId || t.tipo !== 'despesa') return false;
        const [anoTx, mesTx] = t.data_transacao.split('-').map(Number);
        return mesTx - 1 === mesAtual && anoTx === anoAtual;
      })
      .reduce((acc, t) => acc + t.valor, 0);
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Meus Cartões</h3>
          <p className="text-sm text-slate-500">Gerencie limites e acompanhe suas faturas.</p>
        </div>
        <button 
          onClick={() => abrirModal()} 
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={18} /> Novo Cartão
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Carregando cartões...</p>
      ) : cartoes.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center shadow-sm">
          <CreditCard size={48} className="mx-auto text-slate-300 mb-4" />
          <h4 className="text-slate-800 font-bold mb-2">Nenhum cartão cadastrado</h4>
          <p className="text-slate-500 text-sm">Adicione seus cartões de crédito e débito para vincular às suas compras.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {cartoes.map((cartao) => {
            const faturaAtual = calcularFatura(cartao.id);
            const limiteDisponivel = cartao.limite - faturaAtual;
            const progressoLimite = cartao.limite > 0 ? (faturaAtual / cartao.limite) * 100 : 0;

            return (
              <div key={cartao.id} className="flex flex-col gap-4">
                <div 
                  className="rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group transition-transform hover:-translate-y-1"
                  style={{ backgroundColor: cartao.cor }}
                >
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button onClick={() => abrirModal(cartao)} className="p-1.5 bg-black/20 hover:bg-black/40 rounded-md backdrop-blur-sm transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleExcluir(cartao)} className="p-1.5 bg-black/20 hover:bg-red-500/80 rounded-md backdrop-blur-sm transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="flex justify-between items-start mb-8">
                    <span className="font-bold tracking-widest uppercase opacity-90 truncate max-w-[70%]">{cartao.banco || 'Banco'}</span>
                    <SmartphoneNfc size={24} className="opacity-80 shrink-0" />
                  </div>
                  
                  <div className="mb-6">
                    <div className="text-sm opacity-80 uppercase tracking-widest text-emerald-100 mb-1">{cartao.tipo}</div>
                    <div className="text-xl tracking-[0.2em] font-mono opacity-90">
                      •••• •••• •••• {cartao.ultimos_digitos || '0000'}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider opacity-70 mb-1">Titular do Cartão</div>
                      <div className="font-medium tracking-wide truncate max-w-[150px]">{cartao.nome}</div>
                    </div>
                    <CreditCard size={32} className="opacity-50" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-500">Fatura Atual</span>
                    <span className="font-bold text-slate-800">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(faturaAtual)}</span>
                  </div>
                  
                  {cartao.tipo === 'credito' && (
                    <>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2">
                        <div 
                          className={`h-full transition-all ${progressoLimite > 90 ? 'bg-red-500' : progressoLimite > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                          style={{ width: `${Math.min(progressoLimite, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Disp: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(limiteDisponivel)}</span>
                        <span>Lim: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cartao.limite)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSalvar} className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">{editandoId ? 'Editar Cartão' : 'Novo Cartão'}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Apelido</label>
                  <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Banco / Emissor</label>
                  <input type="text" required value={banco} onChange={(e) => setBanco(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Últimos 4 Dígitos</label>
                  <input type="text" maxLength={4} value={ultimosDigitos} onChange={(e) => setUltimosDigitos(e.target.value.replace(/\D/g, ''))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Limite (R$)</label>
                  <input type="number" step="0.01" required value={limite} onChange={(e) => setLimite(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Tipo</label>
                <select value={tipo} onChange={(e) => setTipo(e.target.value as any)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                  <option value="credito">Crédito</option>
                  <option value="debito">Débito</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">Cor do Cartão</label>
                <div className="flex flex-wrap gap-3">
                  {OPCOES_CORES.map((opcao) => (
                    <button
                      key={opcao.hex}
                      type="button"
                      title={opcao.nome}
                      onClick={() => setCor(opcao.hex)}
                      className={`w-8 h-8 rounded-full shadow-sm border-2 transition-all ${cor === opcao.hex ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-105'}`}
                      style={{ backgroundColor: opcao.hex }}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm font-medium">Cancelar</button>
              <button type="submit" disabled={salvando} className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 text-sm font-medium">
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TOAST */}
      {toast.visible && (
        <div className="fixed bottom-8 right-8 bg-slate-800 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 fade-in duration-300 z-50">
          <span className="text-sm font-medium">Cartão excluído.</span>
          <button onClick={handleDesfazer} className="flex items-center gap-1 text-emerald-400 font-bold hover:text-emerald-300 transition-colors text-sm">
            <RotateCcw size={14} /> Desfazer
          </button>
          <button onClick={() => setToast({ visible: false, cartao: null })} className="text-slate-400 hover:text-white transition-colors ml-2">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}