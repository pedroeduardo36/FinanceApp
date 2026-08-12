import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Edit2, Trash2, CalendarDays, RotateCcw, X, Tag, User } from 'lucide-react';
const RESPONSAVEIS = ['Pedro', 'Júlia', 'Ambos'];
export function CompromissosPage({ userId }) {
    const [compromissos, setCompromissos] = useState([]);
    const [categoriasList, setCategoriasList] = useState([]);
    const [loading, setLoading] = useState(true);
    // Estados do Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editandoId, setEditandoId] = useState(null);
    const [descricao, setDescricao] = useState('');
    const [valor, setValor] = useState('');
    const [diaVencimento, setDiaVencimento] = useState('5');
    const [categoria, setCategoria] = useState('');
    const [responsavel, setResponsavel] = useState(RESPONSAVEIS[2]);
    const [salvando, setSalvando] = useState(false);
    // Estado do Toast de Desfazer
    const [toast, setToast] = useState({
        visible: false,
        compromisso: null
    });
    const fetchData = async () => {
        setLoading(true);
        const [compRes, catRes] = await Promise.all([
            supabase.from('compromissos').select('*').eq('user_id', userId).order('dia_vencimento'),
            supabase.from('categorias').select('*').eq('user_id', userId)
        ]);
        if (compRes.data)
            setCompromissos(compRes.data);
        if (catRes.data)
            setCategoriasList(catRes.data);
        setLoading(false);
    };
    useEffect(() => {
        fetchData();
    }, [userId]);
    const abrirModal = (c) => {
        if (c) {
            setEditandoId(c.id);
            setDescricao(c.descricao);
            setValor(c.valor.toString());
            setDiaVencimento(c.dia_vencimento.toString());
            setCategoria(c.categoria || '');
            setResponsavel(c.responsavel || RESPONSAVEIS[2]);
        }
        else {
            setEditandoId(null);
            setDescricao('');
            setValor('');
            setDiaVencimento('5');
            setCategoria('');
            setResponsavel(RESPONSAVEIS[2]);
        }
        setIsModalOpen(true);
    };
    const handleSalvar = async (e) => {
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
            }
            else {
                await supabase.from('compromissos').insert([payload]);
            }
            setIsModalOpen(false);
            fetchData();
        }
        catch (error) {
            alert('Erro ao salvar compromisso.');
        }
        finally {
            setSalvando(false);
        }
    };
    const handleExcluir = async (c) => {
        try {
            await supabase.from('compromissos').delete().eq('id', c.id);
            fetchData();
            setToast({ visible: true, compromisso: c });
            setTimeout(() => {
                setToast((prev) => prev.compromisso?.id === c.id ? { visible: false, compromisso: null } : prev);
            }, 5000);
        }
        catch (error) {
            alert('Erro ao excluir compromisso.');
        }
    };
    const handleDesfazer = async () => {
        if (!toast.compromisso)
            return;
        try {
            const payload = { ...toast.compromisso };
            delete payload.id;
            await supabase.from('compromissos').insert([payload]);
            fetchData();
            setToast({ visible: false, compromisso: null });
        }
        catch (error) {
            alert('Erro ao restaurar o compromisso.');
        }
    };
    // Cálculo rápido do total de custos fixos
    const totalCustosFixos = compromissos.reduce((acc, c) => acc + c.valor, 0);
    return (_jsxs("div", { className: "space-y-6 relative", children: [_jsxs("div", { className: "flex flex-col md:flex-row md:justify-between md:items-center gap-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-bold text-slate-800", children: "Compromissos Recorrentes" }), _jsx("p", { className: "text-sm text-slate-500", children: "Controle seus custos fixos: assinaturas, aluguel, financiamentos." })] }), _jsxs("button", { onClick: () => abrirModal(), className: "bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors shadow-sm shrink-0", children: [_jsx(Plus, { size: 18 }), " Novo Compromisso"] })] }), _jsx("div", { className: "bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-indigo-500 mb-6 flex justify-between items-center", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "p-3 bg-indigo-100 text-indigo-600 rounded-lg", children: _jsx(CalendarDays, { size: 24 }) }), _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-slate-500", children: "Custo Fixo Mensal Estimado" }), _jsx("p", { className: "text-2xl font-bold text-slate-800", children: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCustosFixos) })] })] }) }), _jsx("div", { className: "bg-white rounded-xl shadow-sm border border-slate-200 p-6", children: loading ? (_jsx("p", { className: "text-slate-500 text-sm text-center py-8", children: "Carregando compromissos..." })) : compromissos.length === 0 ? (_jsx("p", { className: "text-slate-500 text-sm italic text-center py-8", children: "Nenhuma conta recorrente cadastrada." })) : (_jsx("div", { className: "space-y-3", children: compromissos.map((c) => (_jsxs("div", { className: "group flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all shadow-sm", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("div", { className: "w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex flex-col items-center justify-center shrink-0 border border-slate-200", children: [_jsx("span", { className: "text-[10px] font-semibold uppercase leading-none mb-1 text-slate-400", children: "Dia" }), _jsx("span", { className: "font-bold leading-none", children: c.dia_vencimento })] }), _jsxs("div", { children: [_jsx("h4", { className: "font-semibold text-slate-800", children: c.descricao }), _jsxs("div", { className: "flex items-center gap-3 text-xs text-slate-500 mt-1", children: [c.categoria && (_jsxs("span", { className: "flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md", children: [_jsx(Tag, { size: 12 }), " ", c.categoria] })), c.responsavel && (_jsxs("span", { className: "flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-medium", children: [_jsx(User, { size: 12 }), " ", c.responsavel] }))] })] })] }), _jsxs("div", { className: "flex items-center gap-6", children: [_jsx("span", { className: "text-base font-bold text-slate-800", children: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.valor) }), _jsxs("div", { className: "flex gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity", children: [_jsx("button", { onClick: () => abrirModal(c), className: "text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-md transition-colors", title: "Editar", children: _jsx(Edit2, { size: 16 }) }), _jsx("button", { onClick: () => handleExcluir(c), className: "text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-md transition-colors", title: "Excluir", children: _jsx(Trash2, { size: 16 }) })] })] })] }, c.id))) })) }), isModalOpen && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs("form", { onSubmit: handleSalvar, className: "bg-white p-6 rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200", children: [_jsxs("div", { className: "flex justify-between items-center mb-6", children: [_jsx("h3", { className: "text-lg font-bold text-slate-800", children: editandoId ? 'Editar Compromisso' : 'Novo Compromisso' }), _jsx("button", { type: "button", onClick: () => setIsModalOpen(false), className: "text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors", children: _jsx(X, { size: 20 }) })] }), _jsxs("div", { className: "space-y-4 mb-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1", children: "Descri\u00E7\u00E3o (Ex: Aluguel, Netflix)" }), _jsx("input", { type: "text", required: true, value: descricao, onChange: (e) => setDescricao(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1", children: "Valor Mensal (R$)" }), _jsx("input", { type: "number", step: "0.01", required: true, value: valor, onChange: (e) => setValor(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1", children: "Dia do Vencimento" }), _jsx("input", { type: "number", min: "1", max: "31", required: true, value: diaVencimento, onChange: (e) => setDiaVencimento(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1", children: "Categoria" }), _jsxs("select", { value: categoria, onChange: (e) => setCategoria(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none", children: [_jsx("option", { value: "", children: "Geral" }), categoriasList.map((c) => _jsxs("option", { value: c.nome, children: [c.nome, " ", c.subcategoria ? `(${c.subcategoria})` : ''] }, c.id))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1", children: "Respons\u00E1vel" }), _jsx("select", { value: responsavel, onChange: (e) => setResponsavel(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none", children: RESPONSAVEIS.map((resp) => _jsx("option", { value: resp, children: resp }, resp)) })] })] }), _jsxs("div", { className: "flex gap-3 justify-end border-t border-slate-100 pt-4", children: [_jsx("button", { type: "button", onClick: () => setIsModalOpen(false), className: "px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm font-medium", children: "Cancelar" }), _jsx("button", { type: "submit", disabled: salvando, className: "px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 text-sm font-medium", children: salvando ? 'Salvando...' : 'Salvar Compromisso' })] })] }) })), toast.visible && (_jsxs("div", { className: "fixed bottom-8 right-8 bg-slate-800 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 fade-in duration-300 z-50", children: [_jsx("span", { className: "text-sm font-medium", children: "Compromisso exclu\u00EDdo." }), _jsxs("button", { onClick: handleDesfazer, className: "flex items-center gap-1 text-emerald-400 font-bold hover:text-emerald-300 transition-colors text-sm", children: [_jsx(RotateCcw, { size: 14 }), " Desfazer"] }), _jsx("button", { onClick: () => setToast({ visible: false, compromisso: null }), className: "text-slate-400 hover:text-white transition-colors ml-2", children: _jsx(X, { size: 16 }) })] }))] }));
}
