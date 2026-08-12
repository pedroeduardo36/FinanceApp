import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, ChevronRight, Wallet, TrendingDown, TrendingUp, PiggyBank, CalendarClock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, subMonths, addMonths, isSameMonth, parseISO, isAfter, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
const CORES_CATEGORIAS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
export function PainelPage({ userId, transacoes }) {
    const [dataFiltro, setDataFiltro] = useState(new Date());
    const [saldoCaixinhas, setSaldoCaixinhas] = useState(0);
    useEffect(() => {
        const fetchCaixinhas = async () => {
            const { data } = await supabase.from('caixinhas').select('saldo_atual').eq('user_id', userId);
            if (data) {
                const totalInvestido = data.reduce((acc, c) => acc + c.saldo_atual, 0);
                setSaldoCaixinhas(totalInvestido);
            }
        };
        fetchCaixinhas();
    }, [userId]);
    // --- NAVEGAÇÃO DE MESES ---
    const mesAnterior = () => setDataFiltro(subMonths(dataFiltro, 1));
    const proximoMes = () => setDataFiltro(addMonths(dataFiltro, 1));
    const mesFormatado = format(dataFiltro, 'MMMM yyyy', { locale: ptBR });
    // --- CÁLCULOS E FILTROS ---
    const calculos = useMemo(() => {
        let saldoGeral = 0;
        let receitasMes = 0;
        let despesasMes = 0;
        const despesasPorCategoriaMap = {};
        const hoje = startOfDay(new Date());
        const proximosLancamentos = [];
        transacoes.forEach(t => {
            const dataTx = parseISO(t.data_transacao);
            const isMesSelecionado = isSameMonth(dataTx, dataFiltro);
            // Saldo Geral (Até a data atual, ou todas? Vamos usar todas as já pagas/até hoje)
            if (!isAfter(dataTx, hoje)) {
                saldoGeral += t.tipo === 'receita' ? t.valor : -t.valor;
            }
            // Lançamentos Futuros (A partir de amanhã)
            if (isAfter(dataTx, hoje) && proximosLancamentos.length < 5) {
                proximosLancamentos.push(t);
            }
            // Filtros do Mês Selecionado
            if (isMesSelecionado) {
                if (t.tipo === 'receita') {
                    receitasMes += t.valor;
                }
                else {
                    despesasMes += t.valor;
                    // Agrupa para o gráfico de pizza
                    const cat = t.categoria || 'Outros';
                    despesasPorCategoriaMap[cat] = (despesasPorCategoriaMap[cat] || 0) + t.valor;
                }
            }
        });
        // Formata dados para os gráficos
        const dadosPizza = Object.entries(despesasPorCategoriaMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value); // Ordena do maior pro menor
        // Dados para o Gráfico de Barras (Últimos 6 meses)
        const dadosEvolucao = Array.from({ length: 6 }).map((_, i) => {
            const mesBase = subMonths(dataFiltro, 5 - i);
            let rec = 0;
            let des = 0;
            transacoes.forEach(t => {
                if (isSameMonth(parseISO(t.data_transacao), mesBase)) {
                    if (t.tipo === 'receita')
                        rec += t.valor;
                    else
                        des += t.valor;
                }
            });
            return {
                mes: format(mesBase, 'MMM', { locale: ptBR }),
                Receitas: rec,
                Despesas: des
            };
        });
        return { saldoGeral, receitasMes, despesasMes, dadosPizza, dadosEvolucao, proximosLancamentos };
    }, [transacoes, dataFiltro]);
    return (_jsxs("div", { className: "space-y-6 animate-in fade-in duration-300", children: [_jsxs("div", { className: "flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-xl font-bold text-slate-800", children: "Vis\u00E3o Geral" }), _jsx("p", { className: "text-sm text-slate-500", children: "Acompanhe a sa\u00FAde financeira da sua conta." })] }), _jsxs("div", { className: "flex items-center gap-4 bg-slate-50 p-1.5 rounded-lg border border-slate-100", children: [_jsx("button", { onClick: mesAnterior, className: "p-2 hover:bg-white rounded-md text-slate-600 shadow-sm transition-all", children: _jsx(ChevronLeft, { size: 18 }) }), _jsx("span", { className: "font-semibold text-slate-700 capitalize w-32 text-center", children: mesFormatado }), _jsx("button", { onClick: proximoMes, className: "p-2 hover:bg-white rounded-md text-slate-600 shadow-sm transition-all", children: _jsx(ChevronRight, { size: 18 }) })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", children: [_jsxs("div", { className: "bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-blue-500", children: [_jsxs("div", { className: "flex items-center gap-2 text-slate-500 mb-2", children: [_jsx(Wallet, { size: 16 }), " ", _jsx("h3", { className: "text-sm font-medium", children: "Saldo em Conta" })] }), _jsx("p", { className: "text-2xl font-bold text-slate-800", children: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculos.saldoGeral) })] }), _jsxs("div", { className: "bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-emerald-500", children: [_jsxs("div", { className: "flex items-center gap-2 text-emerald-600 mb-2", children: [_jsx(TrendingUp, { size: 16 }), " ", _jsx("h3", { className: "text-sm font-medium", children: "Receitas (M\u00EAs)" })] }), _jsx("p", { className: "text-2xl font-bold text-emerald-600", children: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculos.receitasMes) })] }), _jsxs("div", { className: "bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-red-500", children: [_jsxs("div", { className: "flex items-center gap-2 text-red-600 mb-2", children: [_jsx(TrendingDown, { size: 16 }), " ", _jsx("h3", { className: "text-sm font-medium", children: "Despesas (M\u00EAs)" })] }), _jsx("p", { className: "text-2xl font-bold text-red-600", children: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculos.despesasMes) })] }), _jsxs("div", { className: "bg-emerald-900 p-5 rounded-xl shadow-sm border border-emerald-800 text-white relative overflow-hidden", children: [_jsx("div", { className: "absolute right-[-20px] top-[-20px] opacity-10", children: _jsx(PiggyBank, { size: 120 }) }), _jsxs("div", { className: "flex items-center gap-2 text-emerald-200 mb-2 relative z-10", children: [_jsx(PiggyBank, { size: 16 }), " ", _jsx("h3", { className: "text-sm font-medium", children: "Total Investido (Caixinhas)" })] }), _jsx("p", { className: "text-2xl font-bold relative z-10", children: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldoCaixinhas) }), _jsx("p", { className: "text-xs text-emerald-300 mt-1 relative z-10", children: "Rendendo 100% do CDI" })] })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [_jsxs("div", { className: "lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200", children: [_jsx("h3", { className: "font-bold text-slate-800 mb-6", children: "Evolu\u00E7\u00E3o Mensal (6 Meses)" }), _jsx("div", { className: "h-[300px] w-full text-sm", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: calculos.dadosEvolucao, margin: { top: 10, right: 10, left: -20, bottom: 0 }, children: [_jsx(XAxis, { dataKey: "mes", stroke: "#94a3b8", fontSize: 12, tickLine: false, axisLine: false }), _jsx(YAxis, { stroke: "#94a3b8", fontSize: 12, tickLine: false, axisLine: false, tickFormatter: (val) => `R$ ${val}` }), _jsx(Tooltip, { cursor: { fill: '#f1f5f9' }, formatter: (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value) }), _jsx(Legend, { iconType: "circle" }), _jsx(Bar, { dataKey: "Receitas", fill: "#10b981", radius: [4, 4, 0, 0], maxBarSize: 40 }), _jsx(Bar, { dataKey: "Despesas", fill: "#ef4444", radius: [4, 4, 0, 0], maxBarSize: 40 })] }) }) })] }), _jsxs("div", { className: "bg-white p-6 rounded-xl shadow-sm border border-slate-200", children: [_jsx("h3", { className: "font-bold text-slate-800 mb-2", children: "Despesas por Categoria" }), _jsx("p", { className: "text-xs text-slate-500 mb-4", children: "No m\u00EAs selecionado" }), _jsx("div", { className: "h-[220px] w-full", children: calculos.dadosPizza.length === 0 ? (_jsx("div", { className: "h-full flex items-center justify-center text-slate-400 text-sm", children: "Nenhuma despesa no m\u00EAs." })) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(PieChart, { children: [_jsx(Pie, { data: calculos.dadosPizza, cx: "50%", cy: "50%", innerRadius: 60, outerRadius: 80, paddingAngle: 5, dataKey: "value", children: calculos.dadosPizza.map((_, index) => (_jsx(Cell, { fill: CORES_CATEGORIAS[index % CORES_CATEGORIAS.length] }, `cell-${index}`))) }), _jsx(Tooltip, { formatter: (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value) })] }) })) }), _jsx("div", { className: "mt-4 space-y-2 max-h-[120px] overflow-y-auto pr-2", children: calculos.dadosPizza.map((item, index) => (_jsxs("div", { className: "flex justify-between items-center text-xs", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-3 h-3 rounded-full", style: { backgroundColor: CORES_CATEGORIAS[index % CORES_CATEGORIAS.length] } }), _jsx("span", { className: "text-slate-600 truncate max-w-[100px]", title: item.name, children: item.name })] }), _jsx("span", { className: "font-medium text-slate-800", children: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.value) })] }, item.name))) })] })] }), _jsxs("div", { className: "bg-white p-6 rounded-xl shadow-sm border border-slate-200", children: [_jsxs("div", { className: "flex items-center gap-2 mb-4", children: [_jsx(CalendarClock, { className: "text-amber-500", size: 20 }), _jsx("h3", { className: "font-bold text-slate-800 text-lg", children: "Pr\u00F3ximos Lan\u00E7amentos (Futuro)" })] }), calculos.proximosLancamentos.length === 0 ? (_jsx("p", { className: "text-sm text-slate-500 py-4", children: "N\u00E3o h\u00E1 lan\u00E7amentos programados para os pr\u00F3ximos dias." })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: calculos.proximosLancamentos.map(t => (_jsxs("div", { className: "p-4 rounded-lg border border-slate-100 bg-slate-50/50 flex justify-between items-center", children: [_jsxs("div", { children: [_jsx("p", { className: "font-semibold text-slate-800 text-sm", children: t.descricao }), _jsx("p", { className: "text-xs text-slate-500 mt-1", children: format(parseISO(t.data_transacao), "dd 'de' MMM", { locale: ptBR }) })] }), _jsxs("span", { className: `text-sm font-bold ${t.tipo === 'receita' ? 'text-emerald-600' : 'text-slate-800'}`, children: [t.tipo === 'receita' ? '+' : '-', " ", new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.valor)] })] }, t.id))) }))] })] }));
}
