import React from 'react';
import { TrendingUp } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';

interface ChartData {
  dia: string;
  Saldo: number;
}

interface ChartSectionProps {
  data: ChartData[];
  title?: string;
}

export function ChartSection({ data, title = "Evolução do Saldo" }: ChartSectionProps) {
  const formataMoeda = (valor: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm w-full h-full flex flex-col">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <TrendingUp size={18} className="text-indigo-500" />
          {title}
        </h3>
      </div>
      
      <div className="flex-1 min-h-[250px] w-full text-sm">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400">
            Sem dados suficientes para o gráfico.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="dia" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$ ${val}`} />
              <Tooltip 
                formatter={(value: any) => [formataMoeda(value), 'Saldo no dia']}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Area 
                type="monotone" 
                dataKey="Saldo" 
                stroke="#6366f1" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorSaldo)" 
                activeDot={{ r: 6, strokeWidth: 0 }} 
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}