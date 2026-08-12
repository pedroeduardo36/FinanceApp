import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { addMonths, format } from 'date-fns';
const CATEGORIAS = ['Alimentação', 'Moradia', 'Transporte', 'Lazer', 'Saúde', 'Educação', 'Outros'];
const RESPONSAVEIS = ['Família', 'Particular', 'Conjunto'];
export function AdvancedTransactionForm({ userId, onSuccess }) {
    const [descricao, setDescricao] = useState('');
    const [valorTotal, setValorTotal] = useState('');
    const [tipo, setTipo] = useState('despesa');
    const [dataTransacao, setDataTransacao] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [categoria, setCategoria] = useState(CATEGORIAS[0]);
    const [responsavel, setResponsavel] = useState(RESPONSAVEIS[0]);
    const [parcelas, setParcelas] = useState(1);
    const [cartaoId, setCartaoId] = useState('');
    const [cartoes, setCartoes] = useState([]);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        supabase.from('cartoes_credito').select('*').eq('user_id', userId).then(({ data }) => {
            if (data)
                setCartoes(data);
        });
    }, [userId]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const valorNumerico = parseFloat(valorTotal);
            const numParcelas = tipo === 'despesa' || tipo === 'fatura_cartao' ? Number(parcelas) : 1;
            const valorParcela = valorNumerico / numParcelas;
            const transacoesParaInserir = Array.from({ length: numParcelas }).map((_, index) => {
                const dataBase = new Date(dataTransacao);
                const dataCalculada = addMonths(dataBase, index);
                return {
                    user_id: userId,
                    descricao: numParcelas > 1 ? `${descricao} (${index + 1}/${numParcelas})` : descricao,
                    valor: valorParcela,
                    tipo,
                    data_transacao: format(dataCalculada, 'yyyy-MM-dd'),
                    categoria,
                    responsavel,
                    parcela_atual: index + 1,
                    total_parcelas: numParcelas,
                    cartao_id: cartaoId || null,
                };
            });
            const { error } = await supabase.from('transacoes').insert(transacoesParaInserir);
            if (error)
                throw error;
            setDescricao('');
            setValorTotal('');
            setParcelas(1);
            onSuccess();
        }
        catch (error) {
            console.error('Erro ao salvar transação:', error);
            alert('Erro ao salvar transações parceladas.');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("form", { onSubmit: handleSubmit, className: "bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-4", children: [_jsx("h3", { className: "font-bold text-slate-800 text-lg border-b pb-2", children: "Nova Transa\u00E7\u00E3o / Despesa" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Descri\u00E7\u00E3o" }), _jsx("input", { type: "text", required: true, value: descricao, onChange: (e) => setDescricao(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-md", placeholder: "Ex: Compra Online, Supermercado..." })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Valor Total (R$)" }), _jsx("input", { type: "number", step: "0.01", required: true, value: valorTotal, onChange: (e) => setValorTotal(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-md", placeholder: "0.00" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Data Base / Vencimento" }), _jsx("input", { type: "date", required: true, value: dataTransacao, onChange: (e) => setDataTransacao(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-md" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Tipo de Movimenta\u00E7\u00E3o" }), _jsxs("select", { value: tipo, onChange: (e) => setTipo(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-md bg-white", children: [_jsx("option", { value: "despesa", children: "Despesa (\u00C0 vista / Conta)" }), _jsx("option", { value: "receita", children: "Receita (Entrada)" }), _jsx("option", { value: "fatura_cartao", children: "Fatura de Cart\u00E3o" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Categoria" }), _jsx("select", { value: categoria, onChange: (e) => setCategoria(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-md bg-white", children: CATEGORIAS.map((cat) => (_jsx("option", { value: cat, children: cat }, cat))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Respons\u00E1vel" }), _jsx("select", { value: responsavel, onChange: (e) => setResponsavel(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-md bg-white", children: RESPONSAVEIS.map((resp) => (_jsx("option", { value: resp, children: resp }, resp))) })] }), tipo === 'despesa' && (_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "N\u00FAmero de Parcelas" }), _jsx("input", { type: "number", min: "1", max: "48", value: parcelas, onChange: (e) => setParcelas(parseInt(e.target.value) || 1), className: "w-full px-3 py-2 border border-slate-300 rounded-md" })] }))] }), _jsx("button", { type: "submit", disabled: loading, className: "w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-md mt-4 transition-colors disabled:opacity-50", children: loading ? 'Processando Projeção...' : 'Salvar Transação' })] }));
}
