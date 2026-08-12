import React, { useState, useMemo } from 'react';
import { Transacao } from '@/types';
import { 
  Filter, Download, Calendar, TrendingUp, TrendingDown, 
  Wallet, PieChart as PieChartIcon, ArrowRightLeft, User
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RelatoriosPageProps {
  transacoes: Transacao[];
}

const CORES_CATEGORIAS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#0ea5e9'];
const RESPONSAVEIS = ['Todos', 'Pedro', 'Júlia', 'Ambos'];

export function RelatoriosPage({ transacoes }: RelatoriosPageProps) {
  // Estados dos Filtros (Padrão: Mês Atual)
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'receita' | 'despesa'>('todos');
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
    const categoriasMap: Record<string, number> = {};
    const responsaveisMap: Record<string, number> = {};
    const timelineMap: Record<string, { data: string; Receitas: number; Despesas: number }> = {};

    filtradas.forEach(t => {
      // Totais
      if (t.tipo === 'receita') totalReceitas += t.valor;
      else totalDespesas += t.valor;

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
      if (t.tipo === 'receita') timelineMap[dataFormatada].Receitas += t.valor;
      else timelineMap[dataFormatada].Despesas += t.valor;
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* HEADER E EXPORTAÇÃO */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Relatórios Avançados</h2>
          <p className="text-sm text-slate-500">Filtre, analise e exporte seus dados financeiros.</p>
        </div>
        <button 
          onClick={handleExportar}
          className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Download size={16} /> Exportar / Imprimir
        </button>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Data Início</label>
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="date" 
              value={dataInicio} 
              onChange={(e) => setDataInicio(e.target.value)} 
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Data Fim</label>
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="date" 
              value={dataFim} 
              onChange={(e) => setDataFim(e.target.value)} 
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Tipo</label>
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select 
              value={filtroTipo} 
              onChange={(e) => setFiltroTipo(e.target.value as any)} 
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="todos">Todas Movimentações</option>
              <option value="receita">Apenas Receitas</option>
              <option value="despesa">Apenas Despesas</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Responsável</label>
          <div className="relative">
            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select 
              value={filtroResponsavel} 
              onChange={(e) => setFiltroResponsavel(e.target.value)} 
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {RESPONSAVEIS.map(resp => <option key={resp} value={resp}>{resp}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* CARDS DE RESUMO DO PERÍODO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Wallet size={16} /> <h3 className="text-sm font-medium">Resultado do Período</h3>
          </div>
          <p className={`text-2xl font-bold ${relatorio.saldoLiquido >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(relatorio.saldoLiquido)}
          </p>
          <p className="text-xs text-slate-400 mt-1">{relatorio.quantidade} movimentações no período</p>
        </div>
        
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 text-emerald-600 mb-2">
            <TrendingUp size={16} /> <h3 className="text-sm font-medium">Entradas</h3>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(relatorio.totalReceitas)}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <TrendingDown size={16} /> <h3 className="text-sm font-medium">Saídas</h3>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(relatorio.totalDespesas)}
          </p>
        </div>
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LINHA DO TEMPO */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <ArrowRightLeft size={18} className="text-blue-500" /> 
            Fluxo Diário no Período
          </h3>
          <div className="h-[300px] w-full text-sm">
            {relatorio.dadosTimeline.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400">Sem dados no período.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={relatorio.dadosTimeline} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <XAxis dataKey="data" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} tickFormatter={(val) => `R$ ${val}`} />
                  <Tooltip formatter={(value: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="Receitas" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Despesas" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* PIZZA: CATEGORIAS */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <PieChartIcon size={18} className="text-amber-500" /> 
            Composição de Despesas
          </h3>
          
          <div className="h-[300px] w-full flex flex-col items-center">
            {relatorio.dadosPizza.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">Nenhuma despesa no período.</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="70%">
                  <PieChart>
                    <Pie data={relatorio.dadosPizza} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {relatorio.dadosPizza.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CORES_CATEGORIAS[index % CORES_CATEGORIAS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)} />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="w-full mt-2 grid grid-cols-2 gap-x-4 gap-y-2 overflow-y-auto max-h-[30%] pr-2">
                  {relatorio.dadosPizza.map((item, index) => (
                    <div key={item.name} className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1.5 truncate pr-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CORES_CATEGORIAS[index % CORES_CATEGORIAS.length] }} />
                        <span className="text-slate-600 truncate">{item.name}</span>
                      </div>
                      <span className="font-medium text-slate-800 shrink-0">
                        {((item.value / relatorio.totalDespesas) * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      {/* BLOCOS INFERIORES: TOP DESPESAS E GASTOS POR RESPONSÁVEL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* TOP 5 DESPESAS */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-4 text-lg">Top 5 Maiores Gastos</h3>
          {relatorio.maioresDespesas.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum gasto registrado.</p>
          ) : (
            <div className="space-y-3">
              {relatorio.maioresDespesas.map((t, index) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-3 truncate">
                    <span className="text-slate-400 font-bold w-4">{index + 1}º</span>
                    <div>
                      <p className="font-medium text-slate-800 text-sm truncate">{t.descricao}</p>
                      <p className="text-xs text-slate-500">{format(parseISO(t.data_transacao), 'dd/MM/yyyy')} • {t.categoria}</p>
                    </div>
                  </div>
                  <span className="font-bold text-red-600 shrink-0">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.valor)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* GASTOS POR RESPONSÁVEL */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-4 text-lg flex items-center gap-2">
            <User size={18} className="text-indigo-500" />
            Despesas por Responsável
          </h3>
          <div className="h-[200px] w-full text-sm mt-4">
            {relatorio.dadosResponsaveis.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400">Sem dados.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={relatorio.dadosResponsaveis} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} style={{ fill: '#475569', fontSize: 12, fontWeight: 500 }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(value: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)} />
                  <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={24}>
                    {relatorio.dadosResponsaveis.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'Pedro' ? '#3b82f6' : entry.name === 'Júlia' ? '#ec4899' : '#8b5cf6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}