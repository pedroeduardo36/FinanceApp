import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Edit2, User, Search, Filter, X } from 'lucide-react';

interface Categoria {
  id: string;
  nome: string;
  subcategoria?: string;
  tipo: string;
  responsavel?: string;
}

const RESPONSAVEIS_OPCOES = ['Pedro', 'Júlia', 'Ambos'];

export function CategoriasManager({ userId }: { userId: string }) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados dos Filtros
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'receita' | 'despesa'>('todos');
  const [filtroResp, setFiltroResp] = useState('todos');

  // Estados do Modal e Formulário
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [subcategoria, setSubcategoria] = useState('');
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('despesa');
  const [responsavel, setResponsavel] = useState('');
  const [salvando, setSalvando] = useState(false);

  const fetchCategorias = async () => {
    const { data } = await supabase.from('categorias').select('*').eq('user_id', userId).order('nome');
    setCategorias(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCategorias();
  }, [userId]);

  const abrirModal = (cat?: Categoria) => {
    if (cat) {
      setEditandoId(cat.id);
      setNome(cat.nome);
      setSubcategoria(cat.subcategoria || '');
      setTipo(cat.tipo as any);
      setResponsavel(cat.responsavel || '');
    } else {
      setEditandoId(null);
      setNome('');
      setSubcategoria('');
      setResponsavel('');
    }
    setIsModalOpen(true);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome) return;
    setSalvando(true);

    const payload = {
      user_id: userId,
      nome,
      subcategoria,
      tipo,
      responsavel: responsavel || null
    };

    try {
      if (editandoId) {
        await supabase.from('categorias').update(payload).eq('id', editandoId);
      } else {
        await supabase.from('categorias').insert([payload]);
      }
      setIsModalOpen(false);
      fetchCategorias();
    } catch (error) {
      alert('Erro ao salvar categoria.');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir esta categoria?')) return;
    await supabase.from('categorias').delete().eq('id', id);
    fetchCategorias();
  };

  // Lógica de Filtragem em Tempo Real
  const categoriasFiltradas = categorias.filter(cat => {
    const matchBusca = cat.nome.toLowerCase().includes(busca.toLowerCase()) || 
                       (cat.subcategoria || '').toLowerCase().includes(busca.toLowerCase());
    const matchTipo = filtroTipo === 'todos' || cat.tipo === filtroTipo;
    const matchResp = filtroResp === 'todos' || cat.responsavel === filtroResp || (!cat.responsavel && filtroResp === 'Nenhum');
    
    return matchBusca && matchTipo && matchResp;
  });

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 max-w-5xl mx-auto">
      {/* Header e Botão */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-slate-800 text-lg">Gerenciar Categorias</h3>
          <p className="text-sm text-slate-500">Personalize a classificação das suas entradas e saídas.</p>
        </div>
        <button
          onClick={() => abrirModal()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={16} /> Nova Categoria
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar categoria..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
        <div className="relative">
          <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as any)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none appearance-none"
          >
            <option value="todos">Todos os Tipos</option>
            <option value="receita">Apenas Receitas</option>
            <option value="despesa">Apenas Despesas</option>
          </select>
        </div>
        <div className="relative">
          <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={filtroResp}
            onChange={(e) => setFiltroResp(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none appearance-none"
          >
            <option value="todos">Todos os Responsáveis</option>
            <option value="Nenhum">Sem responsável</option>
            {RESPONSAVEIS_OPCOES.map(resp => (
              <option key={resp} value={resp}>{resp}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Listagem */}
      <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
        {loading ? (
          <p className="text-sm text-slate-500 p-4 text-center">Carregando...</p>
        ) : categoriasFiltradas.length === 0 ? (
          <p className="text-sm text-slate-500 p-4 text-center">Nenhuma categoria encontrada com estes filtros.</p>
        ) : (
          categoriasFiltradas.map((cat) => (
            <div key={cat.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div>
                  <span className="font-medium text-slate-800">{cat.nome}</span>
                  {cat.subcategoria && (
                    <span className="text-xs text-slate-500 ml-2 bg-slate-200/70 px-2 py-0.5 rounded-full">
                      › {cat.subcategoria}
                    </span>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${
                      cat.tipo === 'receita' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {cat.tipo}
                    </span>
                    {cat.responsavel && (
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700">
                        <User size={10} /> {cat.responsavel}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => abrirModal(cat)} className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-md transition-colors">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleExcluir(cat.id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-md transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSalvar} className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">
                {editandoId ? 'Editar Categoria' : 'Nova Categoria'}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Categoria Principal</label>
                <input type="text" required value={nome} onChange={(e) => setNome(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="Ex: Alimentação" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subcategoria (Opcional)</label>
                <input type="text" value={subcategoria} onChange={(e) => setSubcategoria(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="Ex: Mercado" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                  <select value={tipo} onChange={(e) => setTipo(e.target.value as any)} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                    <option value="despesa">Despesa</option>
                    <option value="receita">Receita</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Responsável Padrão</label>
                  <select value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                    <option value="">Nenhum</option>
                    {RESPONSAVEIS_OPCOES.map(resp => <option key={resp} value={resp}>{resp}</option>)}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium">Cancelar</button>
              <button type="submit" disabled={salvando} className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 font-medium">
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}