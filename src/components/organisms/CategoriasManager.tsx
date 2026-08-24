import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Tags, Loader2 } from 'lucide-react';

interface Categoria {
  id: string;
  nome: string;
  subcategoria?: string;
}

interface CategoriasManagerProps {
  userId: string;
}

export function CategoriasManager({ userId }: CategoriasManagerProps) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  
  const [nome, setNome] = useState('');
  const [subcategoria, setSubcategoria] = useState('');

  const fetchCategorias = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('user_id', userId)
      .order('nome');
      
    if (!error && data) {
      setCategorias(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCategorias();
  }, [userId]);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    
    try {
      const { error } = await supabase
        .from('categorias')
        .insert([{ user_id: userId, nome, subcategoria }]);
        
      if (error) throw error;
      
      setNome('');
      setSubcategoria('');
      fetchCategorias();
    } catch (error: any) {
      alert('Erro ao salvar categoria: ' + error.message);
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;
    
    try {
      const { error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      fetchCategorias();
    } catch (error: any) {
      alert('Erro ao excluir categoria.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Gerenciar Categorias</h2>
        <p className="text-sm text-slate-500">Personalize como você organiza suas transações.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Formulário */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Plus size={18} className="text-emerald-500" />
            Nova Categoria
          </h3>
          
          <form onSubmit={handleSalvar} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Nome Principal</label>
              <input 
                type="text" 
                required 
                value={nome} 
                onChange={(e) => setNome(e.target.value)} 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
                placeholder="Ex: Alimentação"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Subcategoria (Opcional)</label>
              <input 
                type="text" 
                value={subcategoria} 
                onChange={(e) => setSubcategoria(e.target.value)} 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
                placeholder="Ex: Restaurante"
              />
            </div>
            
            <button 
              type="submit" 
              disabled={salvando || !nome} 
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 mt-2"
            >
              {salvando ? <Loader2 size={16} className="animate-spin" /> : 'Adicionar Categoria'}
            </button>
          </form>
        </div>

        {/* Lista */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Tags size={18} className="text-indigo-500" />
            Categorias Cadastradas
          </h3>
          
          {loading ? (
            <p className="text-sm text-slate-500">Carregando...</p>
          ) : categorias.length === 0 ? (
            <p className="text-sm text-slate-500 italic">Nenhuma categoria cadastrada ainda.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categorias.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg group">
                  <div className="truncate pr-2">
                    <p className="text-sm font-medium text-slate-800 truncate">{cat.nome}</p>
                    {cat.subcategoria && (
                      <p className="text-xs text-slate-500 truncate">{cat.subcategoria}</p>
                    )}
                  </div>
                  <button 
                    onClick={() => handleExcluir(cat.id)}
                    className="text-slate-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    title="Excluir Categoria"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}