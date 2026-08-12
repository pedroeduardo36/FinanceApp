import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Transacao } from '@/types';

interface ChartProps {
  transacoes: Transacao[];
}

export function ChartSection({ transacoes }: ChartProps) {
  // Agrupa transações por mês/ano para o gráfico
  const dadosAgrupados = transacoes.reduce((acc: Record<string, { mes: string; receita: number; despesa: number }>, t) => {
    const mesAno = t.data_transacao.substring(0, 7); // yyyy-MM
    if (!acc[mesAno]) {
      acc[mesAno] = { mes: mesAno, receita: 0, despesa: 0 };
    }
    if (t.tipo === 'receita') {
      acc[mesAno].receita += t.valor;
    } else {
      acc[mesAno].despesa += t.valor;
    }
    return acc;
  }, {});

  const dadosGrafico = Object.values(dadosAgrupados).sort((a, b) => a.mes.localeCompare(b.mes));

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 mt-6">
      <h3 className="font-bold text-slate-800 text-lg mb-4">Evolução Mensal (Receitas vs Despesas)</h3>
      <div className="h-[300px] w-full">
        {dadosGrafico.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm">
            Sem dados suficientes para exibir o gráfico.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosGrafico}>
              <XAxis dataKey="mes" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip formatter={(value: any) => `R$ ${Number(value).toFixed(2)}`} />
              <Legend />
              <Bar dataKey="receita" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesa" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}