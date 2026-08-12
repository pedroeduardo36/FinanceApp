import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Tag, X, Edit2, Trash2, ShoppingCart, Utensils, Car, Coffee, Home, Zap, Smartphone, Heart, Briefcase, DollarSign, PiggyBank, ArrowRightLeft, RotateCcw, CreditCard } from 'lucide-react';
import { addMonths, format } from 'date-fns';
const ICONES_TRANSACOES = {
    'tag': Tag, 'cart': ShoppingCart, 'food': Utensils, 'car': Car,
    'coffee': Coffee, 'home': Home, 'energy': Zap, 'phone': Smartphone,
    'health': Heart, 'work': Briefcase, 'money': DollarSign,
    'bank': PiggyBank, 'transfer': ArrowRightLeft
};
const RESPONSAVEIS = ['Pedro', 'Júlia', 'Ambos'];
export function TransacoesPage({ userId, transacoes, isLoading, onRefresh }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [categoriasList, setCategoriasList] = useState([]);
    const [cartoesList, setCartoesList] = useState([]);
    // Estados do Formulário
    const [editandoId, setEditandoId] = useState(null);
    const [descricao, setDescricao] = useState('');
    const [valorTotal, setValorTotal] = useState('');
    const [tipo, setTipo] = useState('despesa');
    const [dataTransacao, setDataTransacao] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [categoria, setCategoria] = useState('');
    const [responsavel, setResponsavel] = useState(RESPONSAVEIS[2]);
    const [icone, setIcone] = useState('tag');
    const [parcelas, setParcelas] = useState(1);
    const [cartaoId, setCartaoId] = useState('');
    const [loading, setLoading] = useState(false);
    // Estado do Toast
    const [toast, setToast] = useState({ visible: false, transacao: null });
    useEffect(() => {
        supabase.from('categorias').select('*').eq('user_id', userId).then(({ data }) => { if (data)
            setCategoriasList(data); });
        supabase.from('cartoes').select('*').eq('user_id', userId).then(({ data }) => { if (data)
            setCartoesList(data); });
    }, [userId]);
    const abrirModal = (t) => {
        if (t) {
            setEditandoId(t.id);
            setDescricao(t.descricao);
            setValorTotal(t.valor.toString());
            setTipo(t.tipo);
            setDataTransacao(t.data_transacao.split('T')[0]);
            setCategoria(t.categoria || '');
            setResponsavel(t.responsavel || RESPONSAVEIS[2]);
            setIcone(t.icone || 'tag');
            setCartaoId(t.cartao_id || '');
            setParcelas(1);
        }
        else {
            setEditandoId(null);
            setDescricao('');
            setValorTotal('');
            setTipo('despesa');
            setDataTransacao(format(new Date(), 'yyyy-MM-dd'));
            setCategoria('');
            setResponsavel(RESPONSAVEIS[2]);
            setIcone('tag');
            setCartaoId('');
            setParcelas(1);
        }
        setIsModalOpen(true);
    };
    const handleExcluir = async (t) => {
        try {
            await supabase.from('transacoes').delete().eq('id', t.id);
            onRefresh();
            setToast({ visible: true, transacao: t });
            setTimeout(() => setToast((prev) => prev.transacao?.id === t.id ? { visible: false, transacao: null } : prev), 5000);
        }
        catch (error) {
            alert('Erro ao excluir transação.');
        }
    };
    const handleDesfazer = async () => {
        if (!toast.transacao)
            return;
        try {
            const payload = { ...toast.transacao };
            delete payload.id;
            await supabase.from('transacoes').insert([payload]);
            onRefresh();
            setToast({ visible: false, transacao: null });
        }
        catch (error) {
            alert('Erro ao restaurar transação.');
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const valorNumerico = parseFloat(valorTotal);
            const payloadBase = {
                descricao, valor: valorNumerico, tipo, data_transacao: dataTransacao,
                categoria: categoria || 'Geral', responsavel, icone, cartao_id: cartaoId || null
            };
            if (editandoId) {
                await supabase.from('transacoes').update(payloadBase).eq('id', editandoId);
            }
            else {
                const numParcelas = tipo === 'despesa' ? Number(parcelas) : 1;
                const valorParcela = valorNumerico / numParcelas;
                const transacoesParaInserir = Array.from({ length: numParcelas }).map((_, index) => {
                    const dataCalculada = addMonths(new Date(dataTransacao), index);
                    return {
                        user_id: userId,
                        ...payloadBase,
                        descricao: numParcelas > 1 ? `${descricao} (${index + 1}/${numParcelas})` : descricao,
                        valor: valorParcela,
                        data_transacao: format(dataCalculada, 'yyyy-MM-dd'),
                        parcela_atual: index + 1, total_parcelas: numParcelas,
                    };
                });
                await supabase.from('transacoes').insert(transacoesParaInserir);
            }
            setIsModalOpen(false);
            onRefresh();
        }
        catch (error) {
            alert('Erro ao salvar transação.');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "space-y-6 relative", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-bold text-slate-800", children: "Hist\u00F3rico de Transa\u00E7\u00F5es" }), _jsx("p", { className: "text-sm text-slate-500", children: "Acompanhe e edite todas as entradas e sa\u00EDdas." })] }), _jsxs("button", { onClick: () => abrirModal(), className: "bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm", children: [_jsx(Plus, { size: 18 }), " Nova Transa\u00E7\u00E3o"] })] }), _jsx("div", { className: "bg-white rounded-xl shadow-sm border border-slate-200 p-6", children: isLoading ? (_jsx("p", { className: "text-slate-500 text-sm text-center py-8", children: "Carregando transa\u00E7\u00F5es..." })) : transacoes.length === 0 ? (_jsx("p", { className: "text-slate-500 text-sm italic text-center py-8", children: "Nenhuma transa\u00E7\u00E3o registrada ainda." })) : (_jsx("div", { className: "space-y-3", children: transacoes.map((t) => {
                        const isReceita = t.tipo === 'receita';
                        const IconeCard = ICONES_TRANSACOES[t.icone || 'tag'] || Tag;
                        const cartaoVinculado = cartoesList.find(c => c.id === t.cartao_id);
                        return (_jsxs("div", { className: "group flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all shadow-sm", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("div", { className: `p-3 rounded-xl flex items-center justify-center ${isReceita ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`, children: _jsx(IconeCard, { size: 20 }) }), _jsxs("div", { children: [_jsx("h4", { className: "font-semibold text-slate-800", children: t.descricao }), _jsxs("div", { className: "flex items-center gap-3 text-xs text-slate-500 mt-1", children: [_jsx("span", { children: new Date(t.data_transacao).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) }), t.categoria && _jsxs("span", { className: "flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md", children: [_jsx(Tag, { size: 12 }), " ", t.categoria] }), cartaoVinculado && _jsxs("span", { className: "flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md font-medium", children: [_jsx(CreditCard, { size: 12 }), " ", cartaoVinculado.nome] })] })] })] }), _jsxs("div", { className: "flex items-center gap-6", children: [_jsxs("span", { className: `text-base font-bold ${isReceita ? 'text-emerald-600' : 'text-slate-800'}`, children: [isReceita ? '+' : '-', " ", new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.valor)] }), _jsxs("div", { className: "flex gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity", children: [_jsx("button", { onClick: () => abrirModal(t), className: "text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-md transition-colors", children: _jsx(Edit2, { size: 16 }) }), _jsx("button", { onClick: () => handleExcluir(t), className: "text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-md transition-colors", children: _jsx(Trash2, { size: 16 }) })] })] })] }, t.id));
                    }) })) }), isModalOpen && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs("div", { className: "bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200", children: [_jsxs("div", { className: "flex justify-between items-center px-6 py-4 border-b border-slate-100", children: [_jsx("h3", { className: "font-bold text-slate-800 text-lg", children: editandoId ? 'Editar Transação' : 'Nova Transação' }), _jsx("button", { onClick: () => setIsModalOpen(false), className: "text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100", children: _jsx(X, { size: 20 }) })] }), _jsxs("form", { onSubmit: handleSubmit, className: "p-6 space-y-4 max-h-[75vh] overflow-y-auto", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { className: "md:col-span-2", children: [_jsx("label", { className: "block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1", children: "Descri\u00E7\u00E3o" }), _jsx("input", { type: "text", required: true, value: descricao, onChange: (e) => setDescricao(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1", children: ["Valor ", editandoId ? '' : 'Total', " (R$)"] }), _jsx("input", { type: "number", step: "0.01", required: true, value: valorTotal, onChange: (e) => setValorTotal(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1", children: "Data Base" }), _jsx("input", { type: "date", required: true, value: dataTransacao, onChange: (e) => setDataTransacao(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1", children: "Tipo" }), _jsxs("select", { value: tipo, onChange: (e) => setTipo(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none", children: [_jsx("option", { value: "despesa", children: "Despesa (Sa\u00EDda)" }), _jsx("option", { value: "receita", children: "Receita (Entrada)" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1", children: "Cart\u00E3o (Opcional)" }), _jsxs("select", { value: cartaoId, onChange: (e) => setCartaoId(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none", children: [_jsx("option", { value: "", children: "Nenhum" }), cartoesList.map((c) => _jsx("option", { value: c.id, children: c.nome }, c.id))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1", children: "Categoria" }), _jsxs("select", { value: categoria, onChange: (e) => setCategoria(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none", children: [_jsx("option", { value: "", children: "Geral" }), categoriasList.map((c) => _jsxs("option", { value: c.nome, children: [c.nome, " ", c.subcategoria ? `(${c.subcategoria})` : ''] }, c.id))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1", children: "Respons\u00E1vel" }), _jsx("select", { value: responsavel, onChange: (e) => setResponsavel(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none", children: RESPONSAVEIS.map((resp) => _jsx("option", { value: resp, children: resp }, resp)) })] }), tipo === 'despesa' && !editandoId && (_jsxs("div", { className: "md:col-span-2", children: [_jsx("label", { className: "block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1", children: "N\u00FAmero de Parcelas" }), _jsx("input", { type: "number", min: "1", max: "48", value: parcelas, onChange: (e) => setParcelas(parseInt(e.target.value) || 1), className: "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" })] })), _jsxs("div", { className: "md:col-span-2 mt-2", children: [_jsx("label", { className: "block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2", children: "\u00CDcone da Transa\u00E7\u00E3o" }), _jsx("div", { className: "flex flex-wrap gap-2", children: Object.entries(ICONES_TRANSACOES).map(([chave, IconeComp]) => (_jsx("button", { type: "button", onClick: () => setIcone(chave), className: `p-2.5 rounded-lg border transition-all ${icone === chave ? 'bg-emerald-100 border-emerald-500 text-emerald-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`, children: _jsx(IconeComp, { size: 20 }) }, chave))) })] })] }), _jsxs("div", { className: "flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6", children: [_jsx("button", { type: "button", onClick: () => setIsModalOpen(false), className: "px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium", children: "Cancelar" }), _jsx("button", { type: "submit", disabled: loading, className: "bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-6 rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50", children: loading ? 'Salvando...' : 'Salvar' })] })] })] }) })), toast.visible && (_jsxs("div", { className: "fixed bottom-8 right-8 bg-slate-800 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 fade-in duration-300 z-50", children: [_jsx("span", { className: "text-sm font-medium", children: "Transa\u00E7\u00E3o exclu\u00EDda." }), _jsxs("button", { onClick: handleDesfazer, className: "flex items-center gap-1 text-emerald-400 font-bold hover:text-emerald-300 transition-colors text-sm", children: [_jsx(RotateCcw, { size: 14 }), " Desfazer"] }), _jsx("button", { onClick: () => setToast({ visible: false, transacao: null }), className: "text-slate-400 hover:text-white transition-colors ml-2", children: _jsx(X, { size: 16 }) })] }))] }));
}
