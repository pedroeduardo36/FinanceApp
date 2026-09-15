import { Feedback } from '@/components/ui/Feedback';
import { useRows } from '@/hooks/useRows';
import { requireMutation } from '@/lib/dataCore';
import { supabase } from '@/lib/supabase';
import type { Categoria } from '@/types';
import { Edit2, Loader2, Plus, Tags, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';

interface CategoriasManagerProps { userId: string }

export function CategoriasManager({ userId }: CategoriasManagerProps) {
  const [actionError, setActionError] = useState<string | null>(null);
  const { data: categorias, loading, error: loadError, reload: fetchCategorias } = useRows('categorias', userId);
  const { data: orcamentos, error: budgetsError, reload: fetchBudgets } = useRows('orcamentos', userId);
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [subcategoria, setSubcategoria] = useState('');
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('despesa');
  const [orcamentoId, setOrcamentoId] = useState('');

  const limparFormulario = () => {
    setEditandoId(null); setNome(''); setSubcategoria(''); setTipo('despesa'); setOrcamentoId('');
  };

  const editarCategoria = (categoria: Categoria) => {
    setActionError(null);
    setEditandoId(categoria.id);
    setNome(categoria.nome);
    setSubcategoria(categoria.subcategoria ?? '');
    setTipo(categoria.tipo);
    setOrcamentoId(categoria.tipo === 'despesa' ? categoria.orcamento_id ?? '' : '');
  };

  const handleSalvar = async (event: FormEvent) => {
    event.preventDefault(); setActionError(null); setSalvando(true);
    const values = {
      nome: nome.trim(), subcategoria: subcategoria.trim() || null, tipo,
      orcamento_id: tipo === 'despesa' ? orcamentoId || null : null,
    };
    try {
      if (editandoId) {
        await requireMutation(supabase.from('categorias').update(values)
          .eq('id', editandoId).eq('user_id', userId).select());
      } else {
        await requireMutation(supabase.from('categorias').insert([{ user_id: userId, ...values }]).select());
      }
      limparFormulario(); await fetchCategorias();
    } catch {
      setActionError('Não foi possível salvar a categoria. Verifique os dados e tente novamente.');
    } finally { setSalvando(false); }
  };

  const handleExcluir = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;
    try {
      await requireMutation(supabase.from('categorias').delete().eq('id', id).eq('user_id', userId).select());
      if (editandoId === id) limparFormulario();
      await fetchCategorias();
    } catch { setActionError('Erro ao excluir categoria.'); }
  };

  const budgetName = (id?: string | null) => orcamentos.find(item => item.id === id)?.nome;

  return <div className="space-y-6">
    <Feedback error={actionError} />
    <Feedback error={loadError || budgetsError} retry={() => void Promise.all([fetchCategorias(), fetchBudgets()])} />
    <div>
      <h2 className="text-xl font-bold text-slate-800">Gerenciar Categorias</h2>
      <p className="text-sm text-slate-500">Organize as transações e defina o orçamento sugerido para cada despesa.</p>
    </div>

    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="h-fit rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-bold text-slate-800">
            {editandoId ? <Edit2 size={18} className="text-emerald-600" /> : <Plus size={18} className="text-emerald-600" />}
            {editandoId ? 'Editar Categoria' : 'Nova Categoria'}
          </h3>
          {editandoId && <button type="button" onClick={limparFormulario} aria-label="Cancelar edição" className="rounded p-1 text-slate-500 hover:bg-slate-100"><X size={18} /></button>}
        </div>

        <form onSubmit={handleSalvar} className="space-y-4">
          <div>
            <label htmlFor="categoriasmanager-tipo" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Tipo</label>
            <select id="categoriasmanager-tipo" value={tipo} onChange={event => {
              const next = event.target.value === 'receita' ? 'receita' : 'despesa';
              setTipo(next); if (next === 'receita') setOrcamentoId('');
            }} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="despesa">Despesa</option><option value="receita">Receita</option>
            </select>
          </div>
          <div>
            <label htmlFor="categoriasmanager-field-0" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Nome Principal</label>
            <input id="categoriasmanager-field-0" required value={nome} onChange={event => setNome(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Ex: Alimentação" />
          </div>
          <div>
            <label htmlFor="categoriasmanager-field-1" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Subcategoria (Opcional)</label>
            <input id="categoriasmanager-field-1" value={subcategoria} onChange={event => setSubcategoria(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Ex: Restaurante" />
          </div>
          {tipo === 'despesa' && <div>
            <label htmlFor="categoriasmanager-budget" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Orçamento padrão (Opcional)</label>
            <select id="categoriasmanager-budget" value={orcamentoId} onChange={event => setOrcamentoId(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">Sem orçamento padrão</option>
              {orcamentos.map(orcamento => <option key={orcamento.id} value={orcamento.id}>{orcamento.nome}</option>)}
            </select>
            <p className="mt-1 text-xs text-slate-500">Será sugerido ao selecionar esta categoria em uma despesa.</p>
          </div>}
          <div className="flex gap-2">
            {editandoId && <button type="button" onClick={limparFormulario} className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button>}
            <button type="submit" disabled={salvando || !nome.trim()} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-800 py-2 font-medium text-white hover:bg-slate-900 disabled:opacity-70">
              {salvando && <Loader2 size={16} className="animate-spin" />}{editandoId ? 'Salvar alterações' : 'Adicionar Categoria'}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
        <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-800"><Tags size={18} className="text-indigo-500" /> Categorias Cadastradas</h3>
        {loading ? <p className="text-sm text-slate-500">Carregando...</p> : categorias.length === 0 ? <p className="text-sm italic text-slate-500">Nenhuma categoria cadastrada ainda.</p> :
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{categorias.map(cat => {
            const linkedBudget = budgetName(cat.orcamento_id);
            return <article key={cat.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="min-w-0 pr-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-slate-800">{cat.nome}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cat.tipo === 'receita' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{cat.tipo === 'receita' ? 'Receita' : 'Despesa'}</span>
                </div>
                {cat.subcategoria && <p className="truncate text-xs text-slate-500">{cat.subcategoria}</p>}
                {linkedBudget && <p className="mt-1 truncate text-xs font-medium text-indigo-600">Orçamento: {linkedBudget}</p>}
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" onClick={() => editarCategoria(cat)} className="rounded-md p-1.5 text-slate-600 hover:bg-blue-50 hover:text-blue-600" aria-label={`Editar ${cat.nome}`}><Edit2 size={16} /></button>
                <button type="button" onClick={() => void handleExcluir(cat.id)} className="rounded-md p-1.5 text-slate-600 hover:bg-red-50 hover:text-red-500" aria-label={`Excluir ${cat.nome}`}><Trash2 size={16} /></button>
              </div>
            </article>;
          })}</div>}
      </div>
    </div>
  </div>;
}
