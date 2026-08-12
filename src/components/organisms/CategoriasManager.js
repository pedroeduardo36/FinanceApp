import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Edit2, User, Search, Filter, X } from 'lucide-react';
const RESPONSAVEIS_OPCOES = ['Pedro', 'Júlia', 'Ambos'];
export function CategoriasManager({ userId }) {
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);
    // Estados dos Filtros
    const [busca, setBusca] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('todos');
    const [filtroResp, setFiltroResp] = useState('todos');
    // Estados do Modal e Formulário
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editandoId, setEditandoId] = useState(null);
    const [nome, setNome] = useState('');
    const [subcategoria, setSubcategoria] = useState('');
    const [tipo, setTipo] = useState('despesa');
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
    const abrirModal = (cat) => {
        if (cat) {
            setEditandoId(cat.id);
            setNome(cat.nome);
            setSubcategoria(cat.subcategoria || '');
            setTipo(cat.tipo);
            setResponsavel(cat.responsavel || '');
        }
        else {
            setEditandoId(null);
            setNome('');
            setSubcategoria('');
            setResponsavel('');
        }
        setIsModalOpen(true);
    };
    const handleSalvar = async (e) => {
        e.preventDefault();
        if (!nome)
            return;
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
            }
            else {
                await supabase.from('categorias').insert([payload]);
            }
            setIsModalOpen(false);
            fetchCategorias();
        }
        catch (error) {
            alert('Erro ao salvar categoria.');
        }
        finally {
            setSalvando(false);
        }
    };
    const handleExcluir = async (id) => {
        if (!window.confirm('Deseja realmente excluir esta categoria?'))
            return;
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
    return (_jsxs("div", { className: "bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 max-w-5xl mx-auto", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-bold text-slate-800 text-lg", children: "Gerenciar Categorias" }), _jsx("p", { className: "text-sm text-slate-500", children: "Personalize a classifica\u00E7\u00E3o das suas entradas e sa\u00EDdas." })] }), _jsxs("button", { onClick: () => abrirModal(), className: "bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm", children: [_jsx(Plus, { size: 16 }), " Nova Categoria"] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100", children: [_jsxs("div", { className: "relative", children: [_jsx(Search, { size: 16, className: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" }), _jsx("input", { type: "text", placeholder: "Buscar categoria...", value: busca, onChange: (e) => setBusca(e.target.value), className: "w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" })] }), _jsxs("div", { className: "relative", children: [_jsx(Filter, { size: 16, className: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" }), _jsxs("select", { value: filtroTipo, onChange: (e) => setFiltroTipo(e.target.value), className: "w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none appearance-none", children: [_jsx("option", { value: "todos", children: "Todos os Tipos" }), _jsx("option", { value: "receita", children: "Apenas Receitas" }), _jsx("option", { value: "despesa", children: "Apenas Despesas" })] })] }), _jsxs("div", { className: "relative", children: [_jsx(User, { size: 16, className: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" }), _jsxs("select", { value: filtroResp, onChange: (e) => setFiltroResp(e.target.value), className: "w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none appearance-none", children: [_jsx("option", { value: "todos", children: "Todos os Respons\u00E1veis" }), _jsx("option", { value: "Nenhum", children: "Sem respons\u00E1vel" }), RESPONSAVEIS_OPCOES.map(resp => (_jsx("option", { value: resp, children: resp }, resp)))] })] })] }), _jsx("div", { className: "divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden", children: loading ? (_jsx("p", { className: "text-sm text-slate-500 p-4 text-center", children: "Carregando..." })) : categoriasFiltradas.length === 0 ? (_jsx("p", { className: "text-sm text-slate-500 p-4 text-center", children: "Nenhuma categoria encontrada com estes filtros." })) : (categoriasFiltradas.map((cat) => (_jsxs("div", { className: "p-4 flex justify-between items-center hover:bg-slate-50 transition-colors", children: [_jsx("div", { className: "flex items-center gap-3", children: _jsxs("div", { children: [_jsx("span", { className: "font-medium text-slate-800", children: cat.nome }), cat.subcategoria && (_jsxs("span", { className: "text-xs text-slate-500 ml-2 bg-slate-200/70 px-2 py-0.5 rounded-full", children: ["\u203A ", cat.subcategoria] })), _jsxs("div", { className: "flex items-center gap-2 mt-1", children: [_jsx("span", { className: `text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${cat.tipo === 'receita' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`, children: cat.tipo }), cat.responsavel && (_jsxs("span", { className: "flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700", children: [_jsx(User, { size: 10 }), " ", cat.responsavel] }))] })] }) }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => abrirModal(cat), className: "text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-md transition-colors", children: _jsx(Edit2, { size: 16 }) }), _jsx("button", { onClick: () => handleExcluir(cat.id), className: "text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-md transition-colors", children: _jsx(Trash2, { size: 16 }) })] })] }, cat.id)))) }), isModalOpen && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs("form", { onSubmit: handleSalvar, className: "bg-white p-6 rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200", children: [_jsxs("div", { className: "flex justify-between items-center mb-6", children: [_jsx("h3", { className: "text-lg font-bold text-slate-800", children: editandoId ? 'Editar Categoria' : 'Nova Categoria' }), _jsx("button", { type: "button", onClick: () => setIsModalOpen(false), className: "text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100", children: _jsx(X, { size: 20 }) })] }), _jsxs("div", { className: "space-y-4 mb-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Categoria Principal" }), _jsx("input", { type: "text", required: true, value: nome, onChange: (e) => setNome(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none", placeholder: "Ex: Alimenta\u00E7\u00E3o" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Subcategoria (Opcional)" }), _jsx("input", { type: "text", value: subcategoria, onChange: (e) => setSubcategoria(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none", placeholder: "Ex: Mercado" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Tipo" }), _jsxs("select", { value: tipo, onChange: (e) => setTipo(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none", children: [_jsx("option", { value: "despesa", children: "Despesa" }), _jsx("option", { value: "receita", children: "Receita" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Respons\u00E1vel Padr\u00E3o" }), _jsxs("select", { value: responsavel, onChange: (e) => setResponsavel(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none", children: [_jsx("option", { value: "", children: "Nenhum" }), RESPONSAVEIS_OPCOES.map(resp => _jsx("option", { value: resp, children: resp }, resp))] })] })] })] }), _jsxs("div", { className: "flex gap-3 justify-end border-t border-slate-100 pt-4", children: [_jsx("button", { type: "button", onClick: () => setIsModalOpen(false), className: "px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium", children: "Cancelar" }), _jsx("button", { type: "submit", disabled: salvando, className: "px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 font-medium", children: salvando ? 'Salvando...' : 'Salvar' })] })] }) }))] }));
}
