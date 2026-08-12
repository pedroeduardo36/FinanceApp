import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Transacao } from '@/types';
import { 
  ChevronLeft, ChevronRight, Wallet, TrendingDown, 
  TrendingUp, PiggyBank, CalendarClock 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { format, subMonths, addMonths, isSameMonth, parseISO, isAfter, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PainelPageProps {
  userId: string;
  transacoes: Transacao[];
}

const CORES_CATEGORIAS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export function PainelPage({ userId, transacoes }: PainelPageProps) {
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
    const despesasPorCategoriaMap: Record<string, number> = {};
    const hoje = startOfDay(new Date());

    const proximosLancamentos: Transacao[] = [];

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
        } else {
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
          if (t.tipo === 'receita') rec += t.valor;
          else des += t.valor;
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* HEADER E FILTRO DE MÊS */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Visão Geral</h2>
          <p className="text-sm text-slate-500">Acompanhe a saúde financeira da sua conta.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
          <button onClick={mesAnterior} className="p-2 hover:bg-white rounded-md text-slate-600 shadow-sm transition-all"><ChevronLeft size={18} /></button>
          <span className="font-semibold text-slate-700 capitalize w-32 text-center">{mesFormatado}</span>
          <button onClick={proximoMes} className="p-2 hover:bg-white rounded-md text-slate-600 shadow-sm transition-all"><ChevronRight size={18} /></button>
        </div>
      </div>

      {/* CARDS DE RESUMO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-blue-500">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Wallet size={16} /> <h3 className="text-sm font-medium">Saldo em Conta</h3>
          </div>
          <p className="text-2xl font-bold text-slate-800">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculos.saldoGeral)}</p>
        </div>
        
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-2 text-emerald-600 mb-2">
            <TrendingUp size={16} /> <h3 className="text-sm font-medium">Receitas (Mês)</h3>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculos.receitasMes)}</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-red-500">
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <TrendingDown size={16} /> <h3 className="text-sm font-medium">Despesas (Mês)</h3>
          </div>
          <p className="text-2xl font-bold text-red-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculos.despesasMes)}</p>
        </div>

        <div className="bg-emerald-900 p-5 rounded-xl shadow-sm border border-emerald-800 text-white relative overflow-hidden">
          <div className="absolute right-[-20px] top-[-20px] opacity-10"><PiggyBank size={120} /></div>
          <div className="flex items-center gap-2 text-emerald-200 mb-2 relative z-10">
            <PiggyBank size={16} /> <h3 className="text-sm font-medium">Total Investido (Caixinhas)</h3>
          </div>
          <p className="text-2xl font-bold relative z-10">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldoCaixinhas)}</p>
          <p className="text-xs text-emerald-300 mt-1 relative z-10">Rendendo 100% do CDI</p>
        </div>
      </div>

      {/* ÁREA DOS GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GRÁFICO DE BARRAS: Evolução */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-6">Evolução Mensal (6 Meses)</h3>
          <div className="h-[300px] w-full text-sm">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={calculos.dadosEvolucao} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="mes" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$ ${val}`} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(value: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)} />
                <Legend iconType="circle" />
                <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO DE PIZZA: Despesas por Categoria */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-2">Despesas por Categoria</h3>
          <p className="text-xs text-slate-500 mb-4">No mês selecionado</p>
          
          <div className="h-[220px] w-full">
            {calculos.dadosPizza.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">Nenhuma despesa no mês.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={calculos.dadosPizza} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {calculos.dadosPizza.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CORES_CATEGORIAS[index % CORES_CATEGORIAS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          
          {/* Legenda Customizada do Donut */}
          <div className="mt-4 space-y-2 max-h-[120px] overflow-y-auto pr-2">
            {calculos.dadosPizza.map((item, index) => (
              <div key={item.name} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CORES_CATEGORIAS[index % CORES_CATEGORIAS.length] }} />
                  <span className="text-slate-600 truncate max-w-[100px]" title={item.name}>{item.name}</span>
                </div>
                <span className="font-medium text-slate-800">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.value)}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Lançamentos Futuros */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <CalendarClock className="text-amber-500" size={20} />
          <h3 className="font-bold text-slate-800 text-lg">Próximos Lançamentos (Futuro)</h3>
        </div>
        
        {calculos.proximosLancamentos.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">Não há lançamentos programados para os próximos dias.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {calculos.proximosLancamentos.map(t => (
              <div key={t.id} className="p-4 rounded-lg border border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{t.descricao}</p>
                  <p className="text-xs text-slate-500 mt-1">{format(parseISO(t.data_transacao), "dd 'de' MMM", { locale: ptBR })}</p>
                </div>
                <span className={`text-sm font-bold ${t.tipo === 'receita' ? 'text-emerald-600' : 'text-slate-800'}`}>
                  {t.tipo === 'receita' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.valor)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}