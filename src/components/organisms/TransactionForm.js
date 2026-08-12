import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
export function TransactionForm({ userId, onTransactionAdded }) {
    const [descricao, setDescricao] = useState('');
    const [valor, setValor] = useState('');
    const [tipo, setTipo] = useState('despesa');
    const [dataTransacao, setDataTransacao] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.from('transacoes').insert([
                {
                    user_id: userId,
                    descricao,
                    valor: parseFloat(valor), // Converte string para número
                    tipo,
                    data_transacao: dataTransacao,
                }
            ]);
            if (error)
                throw error;
            // Limpa o formulário e avisa a tela principal para buscar os dados de novo
            setDescricao('');
            setValor('');
            onTransactionAdded();
        }
        catch (error) {
            console.error('Erro ao salvar transação:', error);
            alert('Erro ao salvar. Verifique o console.');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("form", { onSubmit: handleSubmit, className: "bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-4", children: [_jsx("h3", { className: "font-bold text-slate-800 text-lg border-b pb-2", children: "Nova Transa\u00E7\u00E3o" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Descri\u00E7\u00E3o" }), _jsx("input", { type: "text", required: true, value: descricao, onChange: (e) => setDescricao(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-md", placeholder: "Ex: Sal\u00E1rio, Mercado..." })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Valor (R$)" }), _jsx("input", { type: "number", step: "0.01", required: true, value: valor, onChange: (e) => setValor(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-md", placeholder: "0.00" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Data" }), _jsx("input", { type: "date", required: true, value: dataTransacao, onChange: (e) => setDataTransacao(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-md" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Tipo" }), _jsxs("select", { value: tipo, onChange: (e) => setTipo(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-md bg-white", children: [_jsx("option", { value: "receita", children: "Receita (Entrada)" }), _jsx("option", { value: "despesa", children: "Despesa (Sa\u00EDda)" })] })] })] }), _jsx("button", { type: "submit", disabled: loading, className: "w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-md mt-4 transition-colors disabled:opacity-50", children: loading ? 'Salvando...' : 'Adicionar Transação' })] }));
}
