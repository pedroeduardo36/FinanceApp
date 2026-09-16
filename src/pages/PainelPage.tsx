import { useToday } from '@/hooks/useToday';
import { dateLabel, monthBounds, monthlyProjection, shiftMonth, sumMoney, summarize } from '@/lib/finance';
import { useRows } from '@/hooks/useRows';
import { Feedback } from '@/components/ui/Feedback';
import { useMemo, useState } from 'react';
import type { Transacao } from '@/types';
import {
  ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp, Calendar as CalendarIcon, ChevronLeft, ChevronRight
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PainelPageProps {
  userId: string;
  transacoes: Transacao[];
}

export function PainelPage({ userId, transacoes }: PainelPageProps) {
  const today = useToday();
  const currentMonth = today.slice(0, 7);
  const [mes, setMes] = useState(currentMonth);
  const { data: compromissos, error: commitmentsError, reload: reloadCommitments } = useRows('compromissos', userId);
  const resumoMes = useMemo(() => {
    const bounds = monthBounds(mes);
    const report = summarize(transacoes, bounds.start, bounds.end);
    const projection = monthlyProjection(transacoes, compromissos, mes, currentMonth);
    const graficoFormatado = report.dadosTimeline.reduce<{ dia: string; Saldo: number }[]>((points, day) =>
      [...points, { dia: dateLabel(day.data), Saldo: sumMoney([points.at(-1)?.Saldo ?? 0, day.Receitas, -day.Despesas]) }], []);
    return { receitas: projection.income, despesas: projection.expense, saldoLiquido: projection.balance,
      compromissos: projection.commitments, variaveis: projection.variableCommitments,
      graficoFormatado, ultimasTransacoes: [...projection.transactions].sort((a, b) => b.data_transacao.localeCompare(a.data_transacao)).slice(0, 5) };
  }, [transacoes, compromissos, mes, currentMonth]);

  const formataMoeda = (valor: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

  return (
    <div className="space-y-6">
      <Feedback error={commitmentsError} retry={() => void reloadCommitments()} />
      <details className="rounded-lg border bg-white p-4"><summary>Ver evolução do saldo em tabela</summary>
        <table><caption>Saldo acumulado no mês</caption><thead><tr><th scope="col">Data</th><th scope="col">Saldo</th></tr></thead>
          <tbody>{resumoMes.graficoFormatado.map(d => <tr key={d.dia}><th scope="row">{d.dia}</th><td>{formataMoeda(d.Saldo)}</td></tr>)}</tbody></table>
      </details>
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">Visão Geral</h2>
          <p className="text-sm text-slate-500">Acompanhe a saúde financeira da sua conta.</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm self-start md:self-auto">
          <button type="button" onClick={() => setMes(value => shiftMonth(value, -1))} aria-label="Mês anterior" className="rounded-md p-2 text-slate-600 hover:bg-slate-100"><ChevronLeft size={16} /></button>
          <span className="flex min-w-40 items-center justify-center gap-2 px-2 text-sm font-medium capitalize text-slate-700"><CalendarIcon size={16} />{format(parseISO(`${mes}-01`), 'MMMM yyyy', { locale: ptBR })}</span>
          <button type="button" onClick={() => setMes(value => shiftMonth(value, 1))} aria-label="Próximo mês" className="rounded-md p-2 text-slate-600 hover:bg-slate-100"><ChevronRight size={16} /></button>
        </div>
      </div>

      {/* CARDS DE RESUMO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-blue-500 rounded-r-2xl" />
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Wallet size={20} /></div>
            <h3 className="text-sm font-medium text-slate-500">Saldo projetado</h3>
          </div>
          <p className={`text-2xl md:text-3xl font-bold ${resumoMes.saldoLiquido >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
            {formataMoeda(resumoMes.saldoLiquido)}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500 rounded-r-2xl" />
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg"><ArrowUpCircle size={20} /></div>
            <h3 className="text-sm font-medium text-slate-500">Entradas projetadas</h3>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-slate-800">
            {formataMoeda(resumoMes.receitas)}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-red-500 rounded-r-2xl" />
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg"><ArrowDownCircle size={20} /></div>
            <h3 className="text-sm font-medium text-slate-500">Gastos projetados</h3>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-slate-800">
            {formataMoeda(resumoMes.despesas)}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between"><h3 className="font-bold text-slate-800">Compromissos projetados</h3>{resumoMes.variaveis > 0 && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">{resumoMes.variaveis} sem valor definido</span>}</div>
        {resumoMes.compromissos.length === 0 ? <p className="text-sm text-slate-500">Nenhum compromisso pendente para este mês.</p> : <div className="grid gap-2 md:grid-cols-2">{resumoMes.compromissos.map(item => <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3"><div><p className="text-sm font-medium text-slate-800">{item.descricao}</p><p className="text-xs text-slate-500">Vencimento no dia {item.dia_vencimento}</p></div><strong className="text-sm text-slate-700">{item.valor == null ? 'A definir' : formataMoeda(item.valor)}</strong></div>)}</div>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* GRÁFICO DE FLUXO */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp size={18} className="text-indigo-500" />
              Evolução das transações do mês
            </h3>
          </div>

          <div className="h-[250px] md:h-[300px] w-full text-sm">
            {resumoMes.graficoFormatado.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-600">Sem movimentações no mês.</div>
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
                    formatter={(value) => [formataMoeda(Number(value ?? 0)), 'Saldo no dia']}
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
              <p className="text-sm text-slate-600 text-center my-auto">Nada registrado ainda.</p>
            ) : (
              resumoMes.ultimasTransacoes.map(t => {
                const isReceita = t.tipo === 'receita';
                return (
                  <div key={t.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`p-2.5 rounded-xl shrink-0 ${isReceita ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                        {isReceita ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-medium text-slate-800 truncate">{t.descricao}</p>
                        <p className="text-xs text-slate-600 truncate">{format(parseISO(t.data_transacao), 'dd/MM/yyyy')} • {t.categoria}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold shrink-0 ml-2 ${isReceita ? 'text-emerald-700' : 'text-slate-800'}`}>
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
