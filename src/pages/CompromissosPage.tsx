import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Compromisso } from '@/types';
import { Plus, Edit2, Trash2, CalendarDays, RotateCcw, X, Tag, User } from 'lucide-react';

interface CompromissosPageProps {
  userId: string;
}

interface CategoriaOpt {
  id: string;
  nome: string;
  subcategoria?: string;
}

const RESPONSAVEIS = ['Pedro', 'Júlia', 'Ambos'];

export function CompromissosPage({ userId }: CompromissosPageProps) {
  const [compromissos, setCompromissos] = useState<Compromisso[]>([]);
  const [categoriasList, setCategoriasList] = useState<CategoriaOpt[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [diaVencimento, setDiaVencimento] = useState('5');
  const [categoria, setCategoria] = useState('');
  const [responsavel, setResponsavel] = useState(RESPONSAVEIS[2]);
  const [salvando, setSalvando] = useState(false);

  // Estado do Toast de Desfazer
  const [toast, setToast] = useState<{ visible: boolean; compromisso: Compromisso | null }>({
    visible: false,
    compromisso: null
  });

  const fetchData = async () => {
    setLoading(true);
    const [compRes, catRes] = await Promise.all([
      supabase.from('compromissos').select('*').eq('user_id', userId).order('dia_vencimento'),
      supabase.from('categorias').select('*').eq('user_id', userId)
    ]);
    
    if (compRes.data) setCompromissos(compRes.data);
    if (catRes.data) setCategoriasList(catRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  const abrirModal = (c?: Compromisso) => {
    if (c) {
      setEditandoId(c.id);
      setDescricao(c.descricao);
      setValor(c.valor.toString());
      setDiaVencimento(c.dia_vencimento.toString());
      setCategoria(c.categoria || '');
      setResponsavel(c.responsavel || RESPONSAVEIS[2]);
    } else {
      setEditandoId(null);
      setDescricao('');
      setValor('');
      setDiaVencimento('5');
      setCategoria('');
      setResponsavel(RESPONSAVEIS[2]);
    }
    setIsModalOpen(true);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const valorNum = parseFloat(valor);
      const diaNum = parseInt(diaVencimento);
      const payload = { 
        user_id: userId, 
        descricao, 
        valor: valorNum, 
        dia_vencimento: diaNum, 
        categoria: categoria || 'Geral', 
        responsavel 
      };

      if (editandoId) {
        await supabase.from('compromissos').update(payload).eq('id', editandoId);
      } else {
        await supabase.from('compromissos').insert([payload]);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      alert('Erro ao salvar compromisso.');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (c: Compromisso) => {
    try {
      await supabase.from('compromissos').delete().eq('id', c.id);
      fetchData();
      
      setToast({ visible: true, compromisso: c });
      setTimeout(() => {
        setToast((prev) => prev.compromisso?.id === c.id ? { visible: false, compromisso: null } : prev);
      }, 5000);
    } catch (error) {
      alert('Erro ao excluir compromisso.');
    }
  };

  const handleDesfazer = async () => {
    if (!toast.compromisso) return;
    try {
      const payload = { ...toast.compromisso };
      delete (payload as any).id; 
      
      await supabase.from('compromissos').insert([payload]);
      fetchData();
      setToast({ visible: false, compromisso: null });
    } catch (error) {
      alert('Erro ao restaurar o compromisso.');
    }
  };

  const totalCustosFixos = compromissos.reduce((acc, c) => acc + c.valor, 0);

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Compromissos Recorrentes</h3>
          <p className="text-sm text-slate-500">Controle seus custos fixos: assinaturas, aluguel, financiamentos.</p>
        </div>
        <button 
          onClick={() => abrirModal()} 
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors shadow-sm shrink-0"
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
                    <span className="text-[10px] font-semibold uppercase leading-none mb-1 text-slate-400">Dia</span>
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
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 md:gap-6">
                  <span className="text-base font-bold text-slate-800">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.valor)}
                  </span>
                  
                  <div className="flex gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => abrirModal(c)} className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-md transition-colors" title="Editar">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleExcluir(c)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-md transition-colors" title="Excluir">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSalvar} className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">{editandoId ? 'Editar Compromisso' : 'Novo Compromisso'}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Descrição</label>
                <input type="text" required value={descricao} onChange={(e) => setDescricao(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Valor Mensal (R$)</label>
                  <input type="number" step="0.01" required value={valor} onChange={(e) => setValor(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Dia do Vencimento</label>
                  <input type="number" min="1" max="31" required value={diaVencimento} onChange={(e) => setDiaVencimento(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <span className="text-sm font-medium">Compromisso excluído.</span>
          <button onClick={handleDesfazer} className="flex items-center gap-1 text-emerald-400 font-bold hover:text-emerald-300 transition-colors text-sm">
            <RotateCcw size={14} /> Desfazer
          </button>
          <button onClick={() => setToast({ visible: false, compromisso: null })} className="text-slate-400 hover:text-white transition-colors ml-2">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}