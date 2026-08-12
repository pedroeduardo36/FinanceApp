import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Edit2, Trash2, CreditCard, RotateCcw, X, SmartphoneNfc } from 'lucide-react';
import { isSameMonth, parseISO } from 'date-fns';
const OPCOES_CORES = [
    { nome: 'Nubank / Roxinho', hex: '#8b5cf6' },
    { nome: 'Inter / Laranja', hex: '#f97316' },
    { nome: 'C6 / Black', hex: '#0f172a' },
    { nome: 'Itaú / Azul', hex: '#3b82f6' },
    { nome: 'Bradesco / Vermelho', hex: '#ef4444' },
    { nome: 'Santander / Vermelho Escuro', hex: '#dc2626' },
    { nome: 'Next / Verde', hex: '#10b981' },
    { nome: 'Prata / Platinum', hex: '#94a3b8' },
];
export function CartoesPage({ userId, transacoes }) {
    const [cartoes, setCartoes] = useState([]);
    const [loading, setLoading] = useState(true);
    // Estados do Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editandoId, setEditandoId] = useState(null);
    const [nome, setNome] = useState('');
    const [ultimosDigitos, setUltimosDigitos] = useState('');
    const [limite, setLimite] = useState('');
    const [banco, setBanco] = useState('');
    const [cor, setCor] = useState(OPCOES_CORES[0].hex);
    const [tipo, setTipo] = useState('credito');
    const [salvando, setSalvando] = useState(false);
    // Estado do Toast de Desfazer
    const [toast, setToast] = useState({
        visible: false,
        cartao: null
    });
    const fetchCartoes = async () => {
        const { data } = await supabase.from('cartoes').select('*').eq('user_id', userId).order('nome');
        setCartoes(data || []);
        setLoading(false);
    };
    useEffect(() => {
        fetchCartoes();
    }, [userId]);
    const abrirModal = (cartao) => {
        if (cartao) {
            setEditandoId(cartao.id);
            setNome(cartao.nome);
            setUltimosDigitos(cartao.ultimos_digitos || '');
            setLimite(cartao.limite.toString());
            setBanco(cartao.banco || '');
            setCor(cartao.cor);
            setTipo(cartao.tipo);
        }
        else {
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
    const handleSalvar = async (e) => {
        e.preventDefault();
        setSalvando(true);
        try {
            const limiteNum = parseFloat(limite) || 0;
            const payload = { user_id: userId, nome, ultimos_digitos: ultimosDigitos, limite: limiteNum, banco, cor, tipo };
            if (editandoId) {
                await supabase.from('cartoes').update(payload).eq('id', editandoId);
            }
            else {
                await supabase.from('cartoes').insert([payload]);
            }
            setIsModalOpen(false);
            fetchCartoes();
        }
        catch (error) {
            alert('Erro ao salvar cartão.');
        }
        finally {
            setSalvando(false);
        }
    };
    const handleExcluir = async (cartao) => {
        try {
            await supabase.from('cartoes').delete().eq('id', cartao.id);
            fetchCartoes();
            setToast({ visible: true, cartao });
            setTimeout(() => {
                setToast((prev) => prev.cartao?.id === cartao.id ? { visible: false, cartao: null } : prev);
            }, 5000);
        }
        catch (error) {
            alert('Erro ao excluir cartão.');
        }
    };
    const handleDesfazer = async () => {
        if (!toast.cartao)
            return;
        try {
            const payload = { ...toast.cartao };
            delete payload.id;
            await supabase.from('cartoes').insert([payload]);
            fetchCartoes();
            setToast({ visible: false, cartao: null });
        }
        catch (error) {
            alert('Erro ao restaurar o cartão.');
        }
    };
    // Cálculo da fatura atual (mês vigente) para cada cartão
    const calcularFatura = (cartaoId) => {
        const hoje = new Date();
        return transacoes
            .filter(t => t.cartao_id === cartaoId && t.tipo === 'despesa' && isSameMonth(parseISO(t.data_transacao), hoje))
            .reduce((acc, t) => acc + t.valor, 0);
    };
    return (_jsxs("div", { className: "space-y-6 relative", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-bold text-slate-800", children: "Meus Cart\u00F5es" }), _jsx("p", { className: "text-sm text-slate-500", children: "Gerencie limites e acompanhe suas faturas." })] }), _jsxs("button", { onClick: () => abrirModal(), className: "bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm", children: [_jsx(Plus, { size: 18 }), " Novo Cart\u00E3o"] })] }), loading ? (_jsx("p", { className: "text-slate-500 text-sm", children: "Carregando cart\u00F5es..." })) : cartoes.length === 0 ? (_jsxs("div", { className: "bg-white p-8 rounded-xl border border-slate-200 text-center shadow-sm", children: [_jsx(CreditCard, { size: 48, className: "mx-auto text-slate-300 mb-4" }), _jsx("h4", { className: "text-slate-800 font-bold mb-2", children: "Nenhum cart\u00E3o cadastrado" }), _jsx("p", { className: "text-slate-500 text-sm", children: "Adicione seus cart\u00F5es de cr\u00E9dito e d\u00E9bito para vincular \u00E0s suas compras." })] })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: cartoes.map((cartao) => {
                    const faturaAtual = calcularFatura(cartao.id);
                    const limiteDisponivel = cartao.limite - faturaAtual;
                    const progressoLimite = cartao.limite > 0 ? (faturaAtual / cartao.limite) * 100 : 0;
                    return (_jsxs("div", { className: "flex flex-col gap-4", children: [_jsxs("div", { className: "rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group transition-transform hover:-translate-y-1", style: { backgroundColor: cartao.cor }, children: [_jsxs("div", { className: "absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2", children: [_jsx("button", { onClick: () => abrirModal(cartao), className: "p-1.5 bg-black/20 hover:bg-black/40 rounded-md backdrop-blur-sm transition-colors", children: _jsx(Edit2, { size: 16 }) }), _jsx("button", { onClick: () => handleExcluir(cartao), className: "p-1.5 bg-black/20 hover:bg-red-500/80 rounded-md backdrop-blur-sm transition-colors", children: _jsx(Trash2, { size: 16 }) })] }), _jsxs("div", { className: "flex justify-between items-start mb-8", children: [_jsx("span", { className: "font-bold tracking-widest uppercase opacity-90", children: cartao.banco || 'Banco' }), _jsx(SmartphoneNfc, { size: 24, className: "opacity-80" })] }), _jsxs("div", { className: "mb-6", children: [_jsx("div", { className: "text-sm opacity-80 uppercase tracking-widest text-emerald-100 mb-1", children: cartao.tipo }), _jsxs("div", { className: "text-xl tracking-[0.2em] font-mono opacity-90", children: ["\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 ", cartao.ultimos_digitos || '0000'] })] }), _jsxs("div", { className: "flex justify-between items-end", children: [_jsxs("div", { children: [_jsx("div", { className: "text-[10px] uppercase tracking-wider opacity-70 mb-1", children: "Titular do Cart\u00E3o" }), _jsx("div", { className: "font-medium tracking-wide truncate max-w-[150px]", children: cartao.nome })] }), _jsx(CreditCard, { size: 32, className: "opacity-50" })] })] }), _jsxs("div", { className: "bg-white p-4 rounded-xl border border-slate-200 shadow-sm", children: [_jsxs("div", { className: "flex justify-between text-sm mb-2", children: [_jsx("span", { className: "text-slate-500", children: "Fatura Atual" }), _jsx("span", { className: "font-bold text-slate-800", children: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(faturaAtual) })] }), cartao.tipo === 'credito' && (_jsxs(_Fragment, { children: [_jsx("div", { className: "w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2", children: _jsx("div", { className: `h-full transition-all ${progressoLimite > 90 ? 'bg-red-500' : progressoLimite > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`, style: { width: `${Math.min(progressoLimite, 100)}%` } }) }), _jsxs("div", { className: "flex justify-between text-xs text-slate-500", children: [_jsxs("span", { children: ["Dispon\u00EDvel: ", new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(limiteDisponivel)] }), _jsxs("span", { children: ["Limite: ", new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cartao.limite)] })] })] }))] })] }, cartao.id));
                }) })), isModalOpen && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4", children: _jsxs("form", { onSubmit: handleSalvar, className: "bg-white p-6 rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200", children: [_jsxs("div", { className: "flex justify-between items-center mb-6", children: [_jsx("h3", { className: "text-lg font-bold text-slate-800", children: editandoId ? 'Editar Cartão' : 'Novo Cartão' }), _jsx("button", { type: "button", onClick: () => setIsModalOpen(false), className: "text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors", children: _jsx(X, { size: 20 }) })] }), _jsxs("div", { className: "space-y-4 mb-6", children: [_jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1", children: "Apelido do Cart\u00E3o" }), _jsx("input", { type: "text", required: true, value: nome, onChange: (e) => setNome(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none", placeholder: "Ex: Roxinho Pedro" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1", children: "Banco / Emissor" }), _jsx("input", { type: "text", required: true, value: banco, onChange: (e) => setBanco(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none", placeholder: "Ex: Nubank" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1", children: "\u00DAltimos 4 D\u00EDgitos" }), _jsx("input", { type: "text", maxLength: 4, value: ultimosDigitos, onChange: (e) => setUltimosDigitos(e.target.value.replace(/\D/g, '')), className: "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none", placeholder: "1234" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1", children: "Limite (R$)" }), _jsx("input", { type: "number", step: "0.01", required: true, value: limite, onChange: (e) => setLimite(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none", placeholder: "0.00" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1", children: "Tipo do Cart\u00E3o" }), _jsxs("select", { value: tipo, onChange: (e) => setTipo(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none", children: [_jsx("option", { value: "credito", children: "Cr\u00E9dito" }), _jsx("option", { value: "debito", children: "D\u00E9bito" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2", children: "Cor do Cart\u00E3o" }), _jsx("div", { className: "flex flex-wrap gap-3", children: OPCOES_CORES.map((opcao) => (_jsx("button", { type: "button", title: opcao.nome, onClick: () => setCor(opcao.hex), className: `w-8 h-8 rounded-full shadow-sm border-2 transition-all ${cor === opcao.hex ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-105'}`, style: { backgroundColor: opcao.hex } }, opcao.hex))) })] })] }), _jsxs("div", { className: "flex gap-3 justify-end border-t border-slate-100 pt-4", children: [_jsx("button", { type: "button", onClick: () => setIsModalOpen(false), className: "px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm font-medium", children: "Cancelar" }), _jsx("button", { type: "submit", disabled: salvando, className: "px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 text-sm font-medium", children: salvando ? 'Salvando...' : 'Salvar Cartão' })] })] }) })), toast.visible && (_jsxs("div", { className: "fixed bottom-8 right-8 bg-slate-800 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 fade-in duration-300 z-50", children: [_jsx("span", { className: "text-sm font-medium", children: "Cart\u00E3o exclu\u00EDdo." }), _jsxs("button", { onClick: handleDesfazer, className: "flex items-center gap-1 text-emerald-400 font-bold hover:text-emerald-300 transition-colors text-sm", children: [_jsx(RotateCcw, { size: 14 }), " Desfazer"] }), _jsx("button", { onClick: () => setToast({ visible: false, cartao: null }), className: "text-slate-400 hover:text-white transition-colors ml-2", children: _jsx(X, { size: 16 }) })] }))] }));
}
