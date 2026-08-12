import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PiggyBank, Plus, ArrowDownCircle, ArrowUpCircle, Edit2, Car, Home, Plane, GraduationCap, Heart, Trash2, RotateCcw, X } from 'lucide-react';
const ICONES_DISPONIVEIS = {
    'piggy-bank': PiggyBank,
    'car': Car,
    'home': Home,
    'plane': Plane,
    'graduation-cap': GraduationCap,
    'heart': Heart,
};
const TAXA_DIARIA_CDI = 0.000274;
export function EconomiasPage({ userId, onRefreshGlobais, saldoGlobal }) {
    const [caixinhas, setCaixinhas] = useState([]);
    const [loading, setLoading] = useState(true);
    // Estados de Transferência
    const [caixinhaTransferencia, setCaixinhaTransferencia] = useState(null);
    const [tipoOperacao, setTipoOperacao] = useState('depositar');
    const [valorTransferencia, setValorTransferencia] = useState('');
    const [transferindo, setTransferindo] = useState(false);
    // Estados de Criação/Edição
    const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
    const [caixinhaEmEdicao, setCaixinhaEmEdicao] = useState(null);
    const [formCaixinha, setFormCaixinha] = useState({ nome: '', meta: '', icone: 'piggy-bank' });
    const [salvando, setSalvando] = useState(false);
    // Estado do Toast de Desfazer
    const [toast, setToast] = useState({
        visible: false,
        caixinha: null,
        refundTxId: null
    });
    const fetchCaixinhas = async () => {
        const { data, error } = await supabase.from('caixinhas').select('*').eq('user_id', userId).order('nome');
        if (error) {
            console.error(error);
            setLoading(false);
            return;
        }
        if (data && data.length > 0) {
            const hoje = new Date().toISOString().split('T')[0];
            let atualizouRendimento = false;
            for (const c of data) {
                const ultimaData = c.data_ultimo_rendimento || hoje;
                if (ultimaData < hoje && c.saldo_atual > 0) {
                    const diasPassados = Math.floor((new Date(hoje).getTime() - new Date(ultimaData).getTime()) / (1000 * 3600 * 24));
                    if (diasPassados > 0) {
                        const novoSaldo = c.saldo_atual * Math.pow((1 + TAXA_DIARIA_CDI), diasPassados);
                        await supabase.from('caixinhas').update({
                            saldo_atual: novoSaldo,
                            data_ultimo_rendimento: hoje
                        }).eq('id', c.id);
                        atualizouRendimento = true;
                    }
                }
            }
            if (atualizouRendimento) {
                const { data: dataAtualizada } = await supabase.from('caixinhas').select('*').eq('user_id', userId).order('nome');
                setCaixinhas(dataAtualizada || []);
            }
            else {
                setCaixinhas(data);
            }
        }
        else {
            setCaixinhas([]);
        }
        setLoading(false);
    };
    useEffect(() => {
        fetchCaixinhas();
    }, [userId]);
    const abrirModalEdicao = (caixinha) => {
        if (caixinha) {
            setCaixinhaEmEdicao(caixinha);
            setFormCaixinha({ nome: caixinha.nome, meta: caixinha.meta.toString(), icone: caixinha.icone || 'piggy-bank' });
        }
        else {
            setCaixinhaEmEdicao(null);
            setFormCaixinha({ nome: '', meta: '', icone: 'piggy-bank' });
        }
        setModalEdicaoAberto(true);
    };
    const handleSalvarCaixinha = async (e) => {
        e.preventDefault();
        setSalvando(true);
        try {
            const metaNum = parseFloat(formCaixinha.meta);
            const hoje = new Date().toISOString().split('T')[0];
            if (caixinhaEmEdicao) {
                await supabase.from('caixinhas')
                    .update({ nome: formCaixinha.nome, meta: metaNum, icone: formCaixinha.icone })
                    .eq('id', caixinhaEmEdicao.id);
            }
            else {
                await supabase.from('caixinhas')
                    .insert([{
                        user_id: userId,
                        nome: formCaixinha.nome,
                        meta: metaNum,
                        icone: formCaixinha.icone,
                        saldo_atual: 0,
                        data_ultimo_rendimento: hoje
                    }]);
            }
            setModalEdicaoAberto(false);
            fetchCaixinhas();
        }
        catch (error) {
            alert('Erro ao salvar os dados.');
        }
        finally {
            setSalvando(false);
        }
    };
    // --- NOVA LÓGICA DE EXCLUSÃO (Sem Pop-up) E DESFAZER ---
    const handleExcluirCaixinha = async (caixinha) => {
        setSalvando(true);
        try {
            let refundTxId = null;
            // 1. Se tem dinheiro, devolve pra conta principal e guarda o ID da transação
            if (caixinha.saldo_atual > 0) {
                const { data, error } = await supabase.from('transacoes').insert([{
                        user_id: userId,
                        descricao: `Resgate de Exclusão: Caixinha ${caixinha.nome}`,
                        valor: caixinha.saldo_atual,
                        tipo: 'receita',
                        categoria: 'Investimentos',
                        data_transacao: new Date().toISOString().split('T')[0]
                    }]).select(); // O .select() nos devolve o ID gerado da transação
                if (data && data.length > 0) {
                    refundTxId = data[0].id;
                }
            }
            // 2. Exclui a caixinha do banco
            await supabase.from('caixinhas').delete().eq('id', caixinha.id);
            setModalEdicaoAberto(false);
            fetchCaixinhas();
            onRefreshGlobais();
            // 3. Mostra o Toast
            setToast({ visible: true, caixinha, refundTxId });
            // 4. Oculta o Toast após 5 segundos
            setTimeout(() => {
                setToast((prev) => prev.caixinha?.id === caixinha.id ? { visible: false, caixinha: null, refundTxId: null } : prev);
            }, 5000);
        }
        catch (error) {
            alert('Erro ao excluir a caixinha.');
        }
        finally {
            setSalvando(false);
        }
    };
    const handleDesfazer = async () => {
        if (!toast.caixinha)
            return;
        try {
            // 1. Recria a Caixinha removendo o ID antigo para o Supabase gerar um novo
            const payload = { ...toast.caixinha };
            delete payload.id;
            await supabase.from('caixinhas').insert([payload]);
            // 2. Apaga a transação de reembolso que foi gerada na exclusão (pegando o dinheiro de volta)
            if (toast.refundTxId) {
                await supabase.from('transacoes').delete().eq('id', toast.refundTxId);
            }
            fetchCaixinhas();
            onRefreshGlobais();
            setToast({ visible: false, caixinha: null, refundTxId: null });
        }
        catch (error) {
            alert('Erro ao restaurar a caixinha.');
        }
    };
    const abrirModalTransferencia = (caixinha, tipo) => {
        setCaixinhaTransferencia(caixinha);
        setTipoOperacao(tipo);
        setValorTransferencia('');
    };
    const handleTransferir = async (e) => {
        e.preventDefault();
        if (!caixinhaTransferencia || !valorTransferencia)
            return;
        const valorNum = parseFloat(valorTransferencia);
        if (valorNum <= 0)
            return alert('O valor deve ser maior que zero.');
        if (tipoOperacao === 'resgatar' && valorNum > caixinhaTransferencia.saldo_atual) {
            return alert('Saldo insuficiente na caixinha para realizar este resgate.');
        }
        if (tipoOperacao === 'depositar') {
            if (saldoGlobal <= 0)
                return alert('Você não possui saldo positivo.');
            if (valorNum > saldoGlobal)
                return alert('Valor superior ao saldo disponível.');
        }
        setTransferindo(true);
        const hoje = new Date().toISOString().split('T')[0];
        try {
            if (tipoOperacao === 'depositar') {
                await supabase.from('transacoes').insert([{
                        user_id: userId, descricao: `Depósito na Caixinha: ${caixinhaTransferencia.nome}`,
                        valor: valorNum, tipo: 'despesa', categoria: 'Investimentos', data_transacao: hoje
                    }]);
                await supabase.from('caixinhas').update({
                    saldo_atual: caixinhaTransferencia.saldo_atual + valorNum,
                    data_ultimo_rendimento: hoje
                }).eq('id', caixinhaTransferencia.id);
            }
            else {
                await supabase.from('transacoes').insert([{
                        user_id: userId, descricao: `Resgate da Caixinha: ${caixinhaTransferencia.nome}`,
                        valor: valorNum, tipo: 'receita', categoria: 'Investimentos', data_transacao: hoje
                    }]);
                await supabase.from('caixinhas').update({
                    saldo_atual: caixinhaTransferencia.saldo_atual - valorNum,
                    data_ultimo_rendimento: hoje
                }).eq('id', caixinhaTransferencia.id);
            }
            setCaixinhaTransferencia(null);
            fetchCaixinhas();
            onRefreshGlobais();
        }
        catch (error) {
            alert('Erro ao processar a operação.');
        }
        finally {
            setTransferindo(false);
        }
    };
    if (loading)
        return _jsx("p", { className: "text-slate-500", children: "Calculando rendimentos e carregando economias..." });
    const valorDigitado = parseFloat(valorTransferencia) || 0;
    const isDepositoInvalido = tipoOperacao === 'depositar' && valorDigitado > saldoGlobal;
    const valorMaximoInput = tipoOperacao === 'resgatar' ? caixinhaTransferencia?.saldo_atual : undefined;
    return (_jsxs("div", { className: "space-y-6 relative", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { children: [_jsx("p", { className: "text-slate-600", children: "Separe seu dinheiro para objetivos espec\u00EDficos." }), _jsx("p", { className: "text-xs text-emerald-600 font-medium mt-1", children: "\u2728 Rendendo 100% do CDI diariamente" })] }), _jsxs("button", { onClick: () => abrirModalEdicao(), className: "bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-emerald-700", children: [_jsx(Plus, { size: 16 }), " Nova Caixinha"] })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: caixinhas.map((caixinha) => {
                    const progresso = (caixinha.saldo_atual / caixinha.meta) * 100;
                    const IconeCard = ICONES_DISPONIVEIS[caixinha.icone || 'piggy-bank'] || PiggyBank;
                    return (_jsxs("div", { className: "bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative hover:shadow-md transition-shadow group flex flex-col justify-between", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex justify-between items-start mb-4", children: [_jsx("div", { className: "p-3 bg-emerald-100 text-emerald-700 rounded-lg", children: _jsx(IconeCard, { size: 24 }) }), _jsxs("div", { className: "flex gap-1", children: [_jsx("button", { onClick: () => abrirModalEdicao(caixinha), className: "text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-md transition-colors", title: "Editar Caixinha", children: _jsx(Edit2, { size: 18 }) }), _jsx("button", { onClick: () => abrirModalTransferencia(caixinha, 'resgatar'), className: "text-amber-500 hover:text-amber-600 hover:bg-amber-50 p-2 rounded-md transition-colors", title: "Resgatar Dinheiro", children: _jsx(ArrowUpCircle, { size: 20 }) }), _jsx("button", { onClick: () => abrirModalTransferencia(caixinha, 'depositar'), className: "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 p-2 rounded-md transition-colors", title: "Guardar Dinheiro", children: _jsx(ArrowDownCircle, { size: 20 }) })] })] }), _jsx("h3", { className: "font-bold text-slate-800 text-lg", children: caixinha.nome }), _jsx("p", { className: "text-2xl font-bold text-emerald-600 mt-2", children: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(caixinha.saldo_atual) })] }), _jsxs("div", { className: "mt-6 pt-4 border-t border-slate-100", children: [_jsxs("div", { className: "flex justify-between text-xs text-slate-500 mb-1", children: [_jsxs("span", { children: ["Meta: ", new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(caixinha.meta)] }), _jsxs("span", { children: [progresso.toFixed(1), "%"] })] }), _jsx("div", { className: "w-full bg-slate-100 h-2 rounded-full overflow-hidden", children: _jsx("div", { className: "bg-emerald-500 h-full transition-all duration-500", style: { width: `${Math.min(progresso, 100)}%` } }) })] })] }, caixinha.id));
                }) }), modalEdicaoAberto && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50", children: _jsxs("form", { onSubmit: handleSalvarCaixinha, className: "bg-white p-6 rounded-xl shadow-lg w-full max-w-md", children: [_jsx("h3", { className: "text-lg font-bold text-slate-800 mb-4", children: caixinhaEmEdicao ? 'Editar Caixinha' : 'Criar Nova Caixinha' }), _jsxs("div", { className: "space-y-4 mb-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Nome do Objetivo" }), _jsx("input", { type: "text", required: true, value: formCaixinha.nome, onChange: (e) => setFormCaixinha({ ...formCaixinha, nome: e.target.value }), className: "w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:outline-none", placeholder: "Ex: Viagem de F\u00E9rias, Carro Novo..." })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Meta Financeira (R$)" }), _jsx("input", { type: "number", step: "0.01", required: true, min: "1", value: formCaixinha.meta, onChange: (e) => setFormCaixinha({ ...formCaixinha, meta: e.target.value }), className: "w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:outline-none", placeholder: "10000.00" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-2", children: "Selecione um \u00CDcone" }), _jsx("div", { className: "flex flex-wrap gap-3", children: Object.entries(ICONES_DISPONIVEIS).map(([chave, Icone]) => (_jsx("button", { type: "button", onClick: () => setFormCaixinha({ ...formCaixinha, icone: chave }), className: `p-3 rounded-lg border transition-all ${formCaixinha.icone === chave ? 'bg-emerald-100 border-emerald-500 text-emerald-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`, children: _jsx(Icone, { size: 24 }) }, chave))) })] })] }), _jsxs("div", { className: "flex justify-between items-center border-t border-slate-100 pt-4", children: [_jsx("div", { children: caixinhaEmEdicao && (_jsxs("button", { type: "button", onClick: () => handleExcluirCaixinha(caixinhaEmEdicao), disabled: salvando, className: "flex items-center gap-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors text-sm font-medium disabled:opacity-50", children: [_jsx(Trash2, { size: 16 }), " Excluir"] })) }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { type: "button", onClick: () => setModalEdicaoAberto(false), className: "px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md transition-colors", children: "Cancelar" }), _jsx("button", { type: "submit", disabled: salvando, className: "px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50", children: salvando ? 'Salvando...' : 'Salvar Caixinha' })] })] })] }) })), caixinhaTransferencia && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50", children: _jsxs("form", { onSubmit: handleTransferir, className: "bg-white p-6 rounded-xl shadow-lg w-full max-w-md", children: [_jsxs("h3", { className: "text-lg font-bold text-slate-800 mb-4", children: [tipoOperacao === 'depositar' ? 'Guardar na' : 'Resgatar da', " Caixinha: ", _jsx("span", { className: "text-emerald-600", children: caixinhaTransferencia.nome })] }), tipoOperacao === 'depositar' && (_jsxs("p", { className: "text-sm text-slate-500 mb-4", children: ["Saldo dispon\u00EDvel na conta: ", _jsx("strong", { className: "text-emerald-600", children: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldoGlobal) })] })), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Valor (R$)" }), _jsx("input", { type: "number", step: "0.01", required: true, min: "0.01", max: valorMaximoInput, value: valorTransferencia, onChange: (e) => setValorTransferencia(e.target.value), className: `w-full px-3 py-2 border rounded-md focus:ring-2 focus:outline-none transition-colors ${isDepositoInvalido ? 'border-red-500 focus:ring-red-500 bg-red-50 mb-1' : 'border-slate-300 focus:ring-emerald-500 mb-6'}`, placeholder: "0.00" }), isDepositoInvalido && (_jsxs("p", { className: "text-xs text-red-600 font-medium mb-6", children: ["Aten\u00E7\u00E3o: O dep\u00F3sito \u00E9 superior ao saldo da conta principal (", new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldoGlobal), ")."] }))] }), _jsxs("div", { className: "flex gap-3 justify-end border-t border-slate-100 pt-4", children: [_jsx("button", { type: "button", onClick: () => setCaixinhaTransferencia(null), className: "px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md transition-colors", children: "Cancelar" }), _jsx("button", { type: "submit", disabled: transferindo || isDepositoInvalido || (tipoOperacao === 'depositar' && saldoGlobal <= 0), className: `px-4 py-2 text-white rounded-md transition-colors disabled:opacity-50 ${tipoOperacao === 'depositar' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600'}`, children: transferindo ? 'Processando...' : (tipoOperacao === 'depositar' ? 'Confirmar Depósito' : 'Confirmar Resgate') })] })] }) })), toast.visible && (_jsxs("div", { className: "fixed bottom-8 right-8 bg-slate-800 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 fade-in duration-300 z-50", children: [_jsx("span", { className: "text-sm font-medium", children: "Caixinha exclu\u00EDda." }), _jsxs("button", { onClick: handleDesfazer, className: "flex items-center gap-1 text-emerald-400 font-bold hover:text-emerald-300 transition-colors text-sm", children: [_jsx(RotateCcw, { size: 14 }), " Desfazer"] }), _jsx("button", { onClick: () => setToast({ visible: false, caixinha: null, refundTxId: null }), className: "text-slate-400 hover:text-white transition-colors ml-2", children: _jsx(X, { size: 16 }) })] }))] }));
}
