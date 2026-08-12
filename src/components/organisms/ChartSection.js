import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
export function ChartSection({ transacoes }) {
    // Agrupa transações por mês/ano para o gráfico
    const dadosAgrupados = transacoes.reduce((acc, t) => {
        const mesAno = t.data_transacao.substring(0, 7); // yyyy-MM
        if (!acc[mesAno]) {
            acc[mesAno] = { mes: mesAno, receita: 0, despesa: 0 };
        }
        if (t.tipo === 'receita') {
            acc[mesAno].receita += t.valor;
        }
        else {
            acc[mesAno].despesa += t.valor;
        }
        return acc;
    }, {});
    const dadosGrafico = Object.values(dadosAgrupados).sort((a, b) => a.mes.localeCompare(b.mes));
    return (_jsxs("div", { className: "bg-white p-6 rounded-xl shadow-sm border border-slate-100 mt-6", children: [_jsx("h3", { className: "font-bold text-slate-800 text-lg mb-4", children: "Evolu\u00E7\u00E3o Mensal (Receitas vs Despesas)" }), _jsx("div", { className: "h-[300px] w-full", children: dadosGrafico.length === 0 ? (_jsx("div", { className: "h-full flex items-center justify-center text-slate-400 text-sm", children: "Sem dados suficientes para exibir o gr\u00E1fico." })) : (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: dadosGrafico, children: [_jsx(XAxis, { dataKey: "mes", stroke: "#64748b", fontSize: 12 }), _jsx(YAxis, { stroke: "#64748b", fontSize: 12 }), _jsx(Tooltip, { formatter: (value) => `R$ ${Number(value).toFixed(2)}` }), _jsx(Legend, {}), _jsx(Bar, { dataKey: "receita", name: "Receitas", fill: "#10b981", radius: [4, 4, 0, 0] }), _jsx(Bar, { dataKey: "despesa", name: "Despesas", fill: "#ef4444", radius: [4, 4, 0, 0] })] }) })) })] }));
}
