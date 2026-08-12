import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import { Filter, Download, Calendar, TrendingUp, TrendingDown, Wallet, PieChart as PieChartIcon, ArrowRightLeft, User } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar } from 'recharts';
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
const CORES_CATEGORIAS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#0ea5e9'];
const RESPONSAVEIS = ['Todos', 'Pedro', 'Júlia', 'Ambos'];
export function RelatoriosPage({ transacoes }) {
    // Estados dos Filtros (Padrão: Mês Atual)
    const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [filtroTipo, setFiltroTipo] = useState('todos');
    const [filtroResponsavel, setFiltroResponsavel] = useState('Todos');
    // Função para simular a exportação (Imprimir tela)
    const handleExportar = () => {
        window.print();
    };
    // --- PROCESSAMENTO ANALÍTICO DOS DADOS ---
    const relatorio = useMemo(() => {
        const inicio = parseISO(dataInicio);
        const fim = parseISO(dataFim);
        fim.setHours(23, 59, 59, 999); // Garante que pegue o último dia inteiro
        // 1. Filtrar Transações
        const filtradas = transacoes.filter(t => {
            const dataTx = parseISO(t.data_transacao);
            const noIntervalo = isWithinInterval(dataTx, { start: inicio, end: fim });
            const matchTipo = filtroTipo === 'todos' || t.tipo === filtroTipo;
            const matchResp = filtroResponsavel === 'Todos' || t.responsavel === filtroResponsavel;
            return noIntervalo && matchTipo && matchResp;
        });
        // 2. Calcular Totais
        let totalReceitas = 0;
        let totalDespesas = 0;
        const categoriasMap = {};
        const responsaveisMap = {};
        const timelineMap = {};
        filtradas.forEach(t => {
            // Totais
            if (t.tipo === 'receita')
                totalReceitas += t.valor;
            else
                totalDespesas += t.valor;
            // Agrupamento por Categoria (Apenas Despesas)
            if (t.tipo === 'despesa') {
                const cat = t.categoria || 'Geral';
                categoriasMap[cat] = (categoriasMap[cat] || 0) + t.valor;
                // Agrupamento por Responsável (Apenas Despesas)
                const resp = t.responsavel || 'Não definido';
                responsaveisMap[resp] = (responsaveisMap[resp] || 0) + t.valor;
            }
            // Agrupamento para Linha do Tempo
            const dataFormatada = format(parseISO(t.data_transacao), 'dd/MM', { locale: ptBR });
            if (!timelineMap[dataFormatada]) {
                timelineMap[dataFormatada] = { data: dataFormatada, Receitas: 0, Despesas: 0 };
            }
            if (t.tipo === 'receita')
                timelineMap[dataFormatada].Receitas += t.valor;
            else
                timelineMap[dataFormatada].Despesas += t.valor;
        });
        // 3. Formatar para Gráficos
        const dadosPizza = Object.entries(categoriasMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
        const dadosResponsaveis = Object.entries(responsaveisMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
        // Ordenar a linha do tempo cronologicamente
        const dadosTimeline = Object.values(timelineMap).sort((a, b) => {
            const [diaA, mesA] = a.data.split('/');
            const [diaB, mesB] = b.data.split('/');
            return new Date(2024, Number(mesA) - 1, Number(diaA)).getTime() - new Date(2024, Number(mesB) - 1, Number(diaB)).getTime();
        });
        // 4. Maiores Despesas (Ranking)
        const maioresDespesas = filtradas
            .filter(t => t.tipo === 'despesa')
            .sort((a, b) => b.valor - a.valor)
            .slice(0, 5); // Top 5
        return {
            totalReceitas,
            totalDespesas,
            saldoLiquido: totalReceitas - totalDespesas,
            dadosPizza,
            dadosTimeline,
            dadosResponsaveis,
            maioresDespesas,
            quantidade: filtradas.length
        };
    }, [transacoes, dataInicio, dataFim, filtroTipo, filtroResponsavel]);
    return (_jsxs("div", { className: "space-y-6 animate-in fade-in duration-300", children: [_jsxs("div", { className: "flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200 print:hidden", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-xl font-bold text-slate-800", children: "Relat\u00F3rios Avan\u00E7ados" }), _jsx("p", { className: "text-sm text-slate-500", children: "Filtre, analise e exporte seus dados financeiros." })] }), _jsxs("button", { onClick: handleExportar, className: "bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors", children: [_jsx(Download, { size: 16 }), " Exportar / Imprimir"] })] }), _jsxs("div", { className: "bg-white p-5 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1", children: "Data In\u00EDcio" }), _jsxs("div", { className: "relative", children: [_jsx(Calendar, { size: 14, className: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" }), _jsx("input", { type: "date", value: dataInicio, onChange: (e) => setDataInicio(e.target.value), className: "w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1", children: "Data Fim" }), _jsxs("div", { className: "relative", children: [_jsx(Calendar, { size: 14, className: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" }), _jsx("input", { type: "date", value: dataFim, onChange: (e) => setDataFim(e.target.value), className: "w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1", children: "Tipo" }), _jsxs("div", { className: "relative", children: [_jsx(Filter, { size: 14, className: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" }), _jsxs("select", { value: filtroTipo, onChange: (e) => setFiltroTipo(e.target.value), className: "w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none", children: [_jsx("option", { value: "todos", children: "Todas Movimenta\u00E7\u00F5es" }), _jsx("option", { value: "receita", children: "Apenas Receitas" }), _jsx("option", { value: "despesa", children: "Apenas Despesas" })] })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1", children: "Respons\u00E1vel" }), _jsxs("div", { className: "relative", children: [_jsx(User, { size: 14, className: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" }), _jsx("select", { value: filtroResponsavel, onChange: (e) => setFiltroResponsavel(e.target.value), className: "w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none", children: RESPONSAVEIS.map(resp => _jsx("option", { value: resp, children: resp }, resp)) })] })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsxs("div", { className: "bg-white p-5 rounded-xl shadow-sm border border-slate-200", children: [_jsxs("div", { className: "flex items-center gap-2 text-slate-500 mb-2", children: [_jsx(Wallet, { size: 16 }), " ", _jsx("h3", { className: "text-sm font-medium", children: "Resultado do Per\u00EDodo" })] }), _jsx("p", { className: `text-2xl font-bold ${relatorio.saldoLiquido >= 0 ? 'text-emerald-600' : 'text-red-600'}`, children: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(relatorio.saldoLiquido) }), _jsxs("p", { className: "text-xs text-slate-400 mt-1", children: [relatorio.quantidade, " movimenta\u00E7\u00F5es no per\u00EDodo"] })] }), _jsxs("div", { className: "bg-white p-5 rounded-xl shadow-sm border border-slate-200", children: [_jsxs("div", { className: "flex items-center gap-2 text-emerald-600 mb-2", children: [_jsx(TrendingUp, { size: 16 }), " ", _jsx("h3", { className: "text-sm font-medium", children: "Entradas" })] }), _jsx("p", { className: "text-2xl font-bold text-slate-800", children: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(relatorio.totalReceitas) })] }), _jsxs("div", { className: "bg-white p-5 rounded-xl shadow-sm border border-slate-200", children: [_jsxs("div", { className: "flex items-center gap-2 text-red-600 mb-2", children: [_jsx(TrendingDown, { size: 16 }), " ", _jsx("h3", { className: "text-sm font-medium", children: "Sa\u00EDdas" })] }), _jsx("p", { className: "text-2xl font-bold text-slate-800", children: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(relatorio.totalDespesas) })] })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs("div", { className: "bg-white p-6 rounded-xl shadow-sm border border-slate-200", children: [_jsxs("h3", { className: "font-bold text-slate-800 mb-6 flex items-center gap-2", children: [_jsx(ArrowRightLeft, { size: 18, className: "text-blue-500" }), "Fluxo Di\u00E1rio no Per\u00EDodo"] }), _jsx("div", { className: "h-[300px] w-full text-sm", children: relatorio.dadosTimeline.length === 0 ? (_jsx("div", { className: "h-full flex items-center justify-center text-slate-400", children: "Sem dados no per\u00EDodo." })) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(LineChart, { data: relatorio.dadosTimeline, margin: { top: 5, right: 5, left: -20, bottom: 5 }, children: [_jsx(XAxis, { dataKey: "data", stroke: "#94a3b8", fontSize: 12, tickLine: false }), _jsx(YAxis, { stroke: "#94a3b8", fontSize: 12, tickLine: false, tickFormatter: (val) => `R$ ${val}` }), _jsx(Tooltip, { formatter: (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value) }), _jsx(Legend, {}), _jsx(Line, { type: "monotone", dataKey: "Receitas", stroke: "#10b981", strokeWidth: 3, dot: { r: 4 }, activeDot: { r: 6 } }), _jsx(Line, { type: "monotone", dataKey: "Despesas", stroke: "#ef4444", strokeWidth: 3, dot: { r: 4 }, activeDot: { r: 6 } })] }) })) })] }), _jsxs("div", { className: "bg-white p-6 rounded-xl shadow-sm border border-slate-200", children: [_jsxs("h3", { className: "font-bold text-slate-800 mb-6 flex items-center gap-2", children: [_jsx(PieChartIcon, { size: 18, className: "text-amber-500" }), "Composi\u00E7\u00E3o de Despesas"] }), _jsx("div", { className: "h-[300px] w-full flex flex-col items-center", children: relatorio.dadosPizza.length === 0 ? (_jsx("div", { className: "h-full flex items-center justify-center text-slate-400 text-sm", children: "Nenhuma despesa no per\u00EDodo." })) : (_jsxs(_Fragment, { children: [_jsx(ResponsiveContainer, { width: "100%", height: "70%", children: _jsxs(PieChart, { children: [_jsx(Pie, { data: relatorio.dadosPizza, cx: "50%", cy: "50%", innerRadius: 60, outerRadius: 80, paddingAngle: 5, dataKey: "value", children: relatorio.dadosPizza.map((_, index) => (_jsx(Cell, { fill: CORES_CATEGORIAS[index % CORES_CATEGORIAS.length] }, `cell-${index}`))) }), _jsx(Tooltip, { formatter: (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value) })] }) }), _jsx("div", { className: "w-full mt-2 grid grid-cols-2 gap-x-4 gap-y-2 overflow-y-auto max-h-[30%] pr-2", children: relatorio.dadosPizza.map((item, index) => (_jsxs("div", { className: "flex justify-between items-center text-xs", children: [_jsxs("div", { className: "flex items-center gap-1.5 truncate pr-2", children: [_jsx("div", { className: "w-2.5 h-2.5 rounded-full shrink-0", style: { backgroundColor: CORES_CATEGORIAS[index % CORES_CATEGORIAS.length] } }), _jsx("span", { className: "text-slate-600 truncate", children: item.name })] }), _jsxs("span", { className: "font-medium text-slate-800 shrink-0", children: [((item.value / relatorio.totalDespesas) * 100).toFixed(1), "%"] })] }, item.name))) })] })) })] })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs("div", { className: "bg-white p-6 rounded-xl shadow-sm border border-slate-200", children: [_jsx("h3", { className: "font-bold text-slate-800 mb-4 text-lg", children: "Top 5 Maiores Gastos" }), relatorio.maioresDespesas.length === 0 ? (_jsx("p", { className: "text-sm text-slate-500", children: "Nenhum gasto registrado." })) : (_jsx("div", { className: "space-y-3", children: relatorio.maioresDespesas.map((t, index) => (_jsxs("div", { className: "flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50", children: [_jsxs("div", { className: "flex items-center gap-3 truncate", children: [_jsxs("span", { className: "text-slate-400 font-bold w-4", children: [index + 1, "\u00BA"] }), _jsxs("div", { children: [_jsx("p", { className: "font-medium text-slate-800 text-sm truncate", children: t.descricao }), _jsxs("p", { className: "text-xs text-slate-500", children: [format(parseISO(t.data_transacao), 'dd/MM/yyyy'), " \u2022 ", t.categoria] })] })] }), _jsx("span", { className: "font-bold text-red-600 shrink-0", children: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.valor) })] }, t.id))) }))] }), _jsxs("div", { className: "bg-white p-6 rounded-xl shadow-sm border border-slate-200", children: [_jsxs("h3", { className: "font-bold text-slate-800 mb-4 text-lg flex items-center gap-2", children: [_jsx(User, { size: 18, className: "text-indigo-500" }), "Despesas por Respons\u00E1vel"] }), _jsx("div", { className: "h-[200px] w-full text-sm mt-4", children: relatorio.dadosResponsaveis.length === 0 ? (_jsx("div", { className: "h-full flex items-center justify-center text-slate-400", children: "Sem dados." })) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: relatorio.dadosResponsaveis, layout: "vertical", margin: { top: 0, right: 20, left: 10, bottom: 0 }, children: [_jsx(XAxis, { type: "number", hide: true }), _jsx(YAxis, { dataKey: "name", type: "category", axisLine: false, tickLine: false, width: 80, style: { fill: '#475569', fontSize: 12, fontWeight: 500 } }), _jsx(Tooltip, { cursor: { fill: '#f8fafc' }, formatter: (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value) }), _jsx(Bar, { dataKey: "value", fill: "#6366f1", radius: [0, 4, 4, 0], barSize: 24, children: relatorio.dadosResponsaveis.map((entry, index) => (_jsx(Cell, { fill: entry.name === 'Pedro' ? '#3b82f6' : entry.name === 'Júlia' ? '#ec4899' : '#8b5cf6' }, `cell-${index}`))) })] }) })) })] })] })] }));
}
