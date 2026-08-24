import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Transacao, Cartao } from '@/types';
import { 
  Plus, Tag, User, X, Edit2, Trash2, 
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
  onRefresh: () => void;
}

interface CategoriaOpt { 
  id: string; 
  nome: string; 
  subcategoria?: string; 
}

const RESPONSAVEIS = ['Pedro', 'Júlia', 'Ambos'];

export function TransacoesPage({ userId, transacoes, isLoading, onRefresh }: TransacoesPageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoriasList, setCategoriasList] = useState<CategoriaOpt[]>([]);
  const [cartoesList, setCartoesList] = useState<Cartao[]>([]);

  // Estados do Formulário
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [descricao, setDescricao] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('despesa');
  const [dataTransacao, setDataTransacao] = useState(new Date().toISOString().split('T')[0]);
  const [categoria, setCategoria] = useState('');
  const [responsavel, setResponsavel] = useState(RESPONSAVEIS[2]);
  const [icone, setIcone] = useState('tag');
  const [parcelas, setParcelas] = useState(1);
  const [cartaoId, setCartaoId] = useState('');
  const [loading, setLoading] = useState(false);

  // Estado do Toast
  const [toast, setToast] = useState<{ visible: boolean; transacao: Transacao | null }>({ visible: false, transacao: null });

  // Carrega as Categorias e os Cartões do usuário logado
  useEffect(() => {
    supabase.from('categorias').select('*').eq('user_id', userId).then(({ data }) => { if (data) setCategoriasList(data); });
    supabase.from('cartoes_credito').select('*').eq('user_id', userId).then(({ data }) => { if (data) setCartoesList(data); });
  }, [userId]);

  const abrirModal = (t?: Transacao) => {
    if (t) {
      setEditandoId(t.id);
      setDescricao(t.descricao);
      setValorTotal(t.valor.toString());
      setTipo(t.tipo as any);
      setDataTransacao(t.data_transacao.split('T')[0]);
      setCategoria(t.categoria || '');
      setResponsavel(t.responsavel || RESPONSAVEIS[2]);
      setIcone((t as any).icone || 'tag');
      setCartaoId(t.cartao_id || '');
      setParcelas(1);
    } else {
      setEditandoId(null);
      setDescricao('');
      setValorTotal('');
      setTipo('despesa');
      setDataTransacao(new Date().toISOString().split('T')[0]);
      setCategoria('');
      setResponsavel(RESPONSAVEIS[2]);
      setIcone('tag');
      setCartaoId('');
      setParcelas(1);
    }
    setIsModalOpen(true);
  };

  const handleExcluir = async (t: Transacao) => {
    try {
      await supabase.from('transacoes').delete().eq('id', t.id);
      onRefresh();
      setToast({ visible: true, transacao: t });
      setTimeout(() => setToast((prev) => prev.transacao?.id === t.id ? { visible: false, transacao: null } : prev), 5000);
    } catch (error) { 
      alert('Erro ao excluir transação.'); 
    }
  };

  const handleDesfazer = async () => {
    if (!toast.transacao) return;
    try {
      const payload = { ...toast.transacao };
      delete (payload as any).id; 
      await supabase.from('transacoes').insert([payload]);
      onRefresh();
      setToast({ visible: false, transacao: null });
    } catch (error) { 
      alert('Erro ao restaurar transação.'); 
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const valorNumerico = parseFloat(valorTotal);
      
      // Quebramos a data manualmente para o JavaScript não confundir o Fuso Horário (UTC)
      const [ano, mes, dia] = dataTransacao.split('-').map(Number);
      
      const payloadBase = {
        user_id: userId,
        descricao, 
        valor: valorNumerico, 
        tipo, 
        categoria: categoria || 'Geral', 
        responsavel, 
        icone, 
        cartao_id: cartaoId || null
      };

      if (editandoId) {
        // MODO EDIÇÃO
        const { error } = await supabase
          .from('transacoes')
          .update({ ...payloadBase, data_transacao: dataTransacao })
          .eq('id', editandoId)
          .select();
          
        if (error) throw error;
        
      } else {
        // MODO CRIAÇÃO (COM OU SEM PARCELAS)
        const numParcelas = tipo === 'despesa' ? Number(parcelas) : 1;
        const valorParcela = valorNumerico / numParcelas;
        
        const transacoesParaInserir = Array.from({ length: numParcelas }).map((_, index) => {
          // Calcula o avanço dos meses de forma segura
          const dataCalc = new Date(ano, mes - 1 + index, dia);
          const dataFormatada = `${dataCalc.getFullYear()}-${String(dataCalc.getMonth() + 1).padStart(2, '0')}-${String(dataCalc.getDate()).padStart(2, '0')}`;
          
          return {
            ...payloadBase,
            descricao: numParcelas > 1 ? `${descricao} (${index + 1}/${numParcelas})` : descricao,
            valor: valorParcela, 
            data_transacao: dataFormatada,
            parcela_atual: index + 1, 
            total_parcelas: numParcelas,
          };
        });

        // O .select() no final força o Supabase a nos devolver o que ele salvou ou o erro exato
        const { error } = await supabase
          .from('transacoes')
          .insert(transacoesParaInserir)
          .select();
        
        // Se o banco recusar, o alerta vai pular na tela!
        if (error) {
           alert(`ERRO DO BANCO: ${error.message} (Detalhes: ${error.details || 'Nenhum'})`);
           setLoading(false);
           return;
        }
      }

      setIsModalOpen(false);
      onRefresh();
    } catch (error: any) {
      alert('Erro no aplicativo: ' + (error.message || 'Desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Histórico de Transações</h3>
          <p className="text-sm text-slate-500">Acompanhe e edite todas as entradas e saídas.</p>
        </div>
        <button onClick={() => abrirModal()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm">
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
            {transacoes.map((t) => {
              const isReceita = t.tipo === 'receita';
              const IconeCard = ICONES_TRANSACOES[(t as any).icone || 'tag'] || Tag;
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
                    <span className={`text-base font-bold ${isReceita ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {isReceita ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.valor)}
                    </span>
                    <div className="flex gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => abrirModal(t)} className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-md transition-colors"><Edit2 size={16} /></button>
                      <button onClick={() => handleExcluir(t)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-md transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-lg">{editandoId ? 'Editar Transação' : 'Nova Transação'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Descrição</label>
                  <input type="text" required value={descricao} onChange={(e) => setDescricao(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Valor {editandoId ? '' : 'Total'} (R$)</label>
                  <input type="number" step="0.01" required value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Data Base</label>
                  <input type="date" required value={dataTransacao} onChange={(e) => setDataTransacao(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Tipo</label>
                  <select value={tipo} onChange={(e) => setTipo(e.target.value as any)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                    <option value="despesa">Despesa (Saída)</option>
                    <option value="receita">Receita (Entrada)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Cartão (Opcional)</label>
                  <select value={cartaoId} onChange={(e) => setCartaoId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                    <option value="">Nenhum</option>
                    {cartoesList.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Categoria</label>
                  <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                    <option value="">Geral</option>
                    {categoriasList.map((c) => <option key={c.id} value={c.nome}>{c.nome} {c.subcategoria ? `(${c.subcategoria})` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Responsável</label>
                  <select value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                    {RESPONSAVEIS.map((resp) => <option key={resp} value={resp}>{resp}</option>)}
                  </select>
                </div>
                
                {tipo === 'despesa' && !editandoId && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Número de Parcelas</label>
                    <input type="number" min="1" max="48" value={parcelas} onChange={(e) => setParcelas(parseInt(e.target.value) || 1)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                  </div>
                )}
                
                <div className="md:col-span-2 mt-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">Ícone da Transação</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(ICONES_TRANSACOES).map(([chave, IconeComp]) => (
                      <button key={chave} type="button" onClick={() => setIcone(chave)} className={`p-2.5 rounded-lg border transition-all ${icone === chave ? 'bg-emerald-100 border-emerald-500 text-emerald-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        <IconeComp size={20} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium">Cancelar</button>
                <button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-6 rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50">
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST DE DESFAZER EXCLUSÃO */}
      {toast.visible && (
        <div className="fixed bottom-8 right-8 bg-slate-800 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 fade-in duration-300 z-50">
          <span className="text-sm font-medium">Transação excluída.</span>
          <button onClick={handleDesfazer} className="flex items-center gap-1 text-emerald-400 font-bold hover:text-emerald-300 transition-colors text-sm"><RotateCcw size={14} /> Desfazer</button>
          <button onClick={() => setToast({ visible: false, transacao: null })} className="text-slate-400 hover:text-white transition-colors ml-2"><X size={16} /></button>
        </div>
      )}
    </div>
  );
}