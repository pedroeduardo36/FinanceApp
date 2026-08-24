import React, { useMemo } from 'react';
import { Transacao } from '@/types';
import { 
  ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp, Calendar as CalendarIcon 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from 'recharts';
import { format, parseISO, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PainelPageProps {
  transacoes: Transacao[];
}

export function PainelPage({ transacoes }: PainelPageProps) {
  const resumoMes = useMemo(() => {
    const hoje = new Date();
    let receitas = 0;
    let despesas = 0;
    const fluxoDiario: Record<string, { data: string; valor: number; diaStr: string }> = {};

    transacoes.forEach(t => {
      const dataTx = parseISO(t.data_transacao);
      
      // Filtra apenas o mês atual
      if (isSameMonth(dataTx, hoje)) {
        if (t.tipo === 'receita') receitas += t.valor;
        else despesas += t.valor;

        const dia = format(dataTx, 'dd/MM', { locale: ptBR });
        
        if (!fluxoDiario[dia]) {
          fluxoDiario[dia] = { data: dataTx.toISOString(), diaStr: dia, valor: 0 };
        }
        
        fluxoDiario[dia].valor += (t.tipo === 'receita' ? t.valor : -t.valor);
      }
    });

    const saldoLiquido = receitas - despesas;
    
    // Calcula o saldo cumulativo dia a dia para o gráfico
    const dadosGrafico = Object.values(fluxoDiario)
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
      
    let saldoAcumulado = 0;
    const graficoFormatado = dadosGrafico.map(d => {
      saldoAcumulado += d.valor;
      return {
        dia: d.diaStr,
        Saldo: saldoAcumulado
      };
    });

    // Pega as últimas 5 transações gerais para a lista rápida
    const ultimasTransacoes = [...transacoes]
      .sort((a, b) => new Date(b.data_transacao).getTime() - new Date(a.data_transacao).getTime())
      .slice(0, 5);

    return { receitas, despesas, saldoLiquido, graficoFormatado, ultimasTransacoes };
  }, [transacoes]);

  const formataMoeda = (valor: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">Visão Geral</h2>
          <p className="text-sm text-slate-500">Acompanhe a saúde financeira da sua conta.</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm self-start md:self-auto">
          <CalendarIcon size={16} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-600 capitalize">
            {format(new Date(), 'MMMM yyyy', { locale: ptBR })}
          </span>
        </div>
      </div>

      {/* CARDS DE RESUMO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-blue-500 rounded-r-2xl" />
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Wallet size={20} /></div>
            <h3 className="text-sm font-medium text-slate-500">Saldo Mensal</h3>
          </div>
          <p className={`text-2xl md:text-3xl font-bold ${resumoMes.saldoLiquido >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
            {formataMoeda(resumoMes.saldoLiquido)}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500 rounded-r-2xl" />
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><ArrowUpCircle size={20} /></div>
            <h3 className="text-sm font-medium text-slate-500">Receitas</h3>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-slate-800">
            {formataMoeda(resumoMes.receitas)}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-red-500 rounded-r-2xl" />
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg"><ArrowDownCircle size={20} /></div>
            <h3 className="text-sm font-medium text-slate-500">Despesas</h3>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-slate-800">
            {formataMoeda(resumoMes.despesas)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GRÁFICO DE FLUXO */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp size={18} className="text-indigo-500" />
              Evolução do Saldo (Mês Atual)
            </h3>
          </div>
          
          <div className="h-[250px] md:h-[300px] w-full text-sm">
            {resumoMes.graficoFormatado.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400">Sem movimentações no mês.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={resumoMes.graficoFormatado} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  <Area type="monotone" dataKey="Saldo" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorSaldo)" activeDot={{ r: 6, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* LISTA RÁPIDA DE TRANSAÇÕES */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-800 mb-6">Últimas Movimentações</h3>
          
          <div className="flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2">
            {resumoMes.ultimasTransacoes.length === 0 ? (
              <p className="text-sm text-slate-400 text-center my-auto">Nada registrado ainda.</p>
            ) : (
              resumoMes.ultimasTransacoes.map(t => {
                const isReceita = t.tipo === 'receita';
                return (
                  <div key={t.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`p-2.5 rounded-xl shrink-0 ${isReceita ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {isReceita ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-medium text-slate-800 truncate">{t.descricao}</p>
                        <p className="text-xs text-slate-400 truncate">{format(parseISO(t.data_transacao), 'dd/MM/yyyy')} • {t.categoria}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold shrink-0 ml-2 ${isReceita ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {isReceita ? '+' : '-'} {formataMoeda(t.valor)}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}