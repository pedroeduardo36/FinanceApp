import type { Transacao } from '../types/index.ts';

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return localDate(date) === value;
}
export function moneyInput(value: string, allowZero = false): number {
  const text = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error('Informe um valor com até duas casas decimais.');
  const [whole, decimal = ''] = text.split('.');
  const cents = Number(whole + decimal.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents < (allowZero ? 0 : 1)) throw new Error('Informe um valor válido.');
  return cents / 100;
}
export function cents(value: number): number {
  const result = Math.round(value * 100);
  if (!Number.isFinite(value) || !Number.isSafeInteger(result)) throw new Error('Valor monetário inválido.');
  return result;
}
export function sumMoney(values: number[]): number {
  const result = values.reduce((sum, value) => sum + cents(value), 0);
  if (!Number.isSafeInteger(result)) throw new Error('Total monetário fora do limite suportado.');
  return result / 100;
}
export function installments(value: string, count: number, date: string) {
  const total = cents(moneyInput(value));
  if (!Number.isInteger(count) || count < 1 || count > 48 || total < count) throw new Error('Use de 1 a 48 parcelas de pelo menos R$ 0,01.');
  if (!validDate(date)) throw new Error('Informe uma data válida.');
  const [year, month, day] = date.split('-').map(Number);
  const base = Math.floor(total / count);
  return Array.from({ length: count }, (_, index) => {
    const last = new Date(year, month + index, 0).getDate();
    return {
      valor: (base + (index < total % count ? 1 : 0)) / 100,
      data_transacao: localDate(new Date(year, month - 1 + index, Math.min(day, last))),
      parcela_atual: index + 1, total_parcelas: count,
    };
  });
}
export function accountBalance(rows: Transacao[], today = localDate()): number {
  return sumMoney(rows.filter(t => t.data_transacao.slice(0, 10) <= today)
    .map(t => t.tipo === 'receita' ? t.valor : -t.valor));
}
export function timeline(rows: Transacao[]) {
  const days = new Map<string, { data: string; Receitas: number; Despesas: number }>();
  for (const row of rows) {
    const date = row.data_transacao.slice(0, 10);
    const day = days.get(date) ?? { data: date, Receitas: 0, Despesas: 0 };
    const key = row.tipo === 'receita' ? 'Receitas' : 'Despesas';
    day[key] = sumMoney([day[key], row.valor]);
    days.set(date, day);
  }
  return [...days.values()].sort((a, b) => a.data.localeCompare(b.data));
}
export const currency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
export const dateLabel = (value: string) => value.slice(0, 10).split('-').reverse().join('/');

export function monthBounds(month: string): { start: string; end: string } {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Competência mensal inválida.');
  const [year, monthNumber] = month.split('-').map(Number);
  if (monthNumber < 1 || monthNumber > 12) throw new Error('Competência mensal inválida.');
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return { start: `${month}-01`, end: `${month}-${String(lastDay).padStart(2, '0')}` };
}

export function shiftMonth(month: string, offset: number): string {
  const { start } = monthBounds(month);
  if (!Number.isInteger(offset)) throw new Error('Deslocamento mensal inválido.');
  const [year, monthNumber] = start.split('-').map(Number);
  const result = new Date(year, monthNumber - 1 + offset, 1);
  return `${result.getFullYear()}-${String(result.getMonth() + 1).padStart(2, '0')}`;
}

export function monthlyIncome(rows: Transacao[], month: string): Transacao[] {
  const { start, end } = monthBounds(month);
  return rows.filter(row => {
    const date = row.data_transacao.slice(0, 10);
    return row.tipo === 'receita' && date >= start && date <= end;
  }).sort((a, b) => a.data_transacao.localeCompare(b.data_transacao) || a.descricao.localeCompare(b.descricao));
}

export function budgetAmount(total: number, percentage: number): number {
  const totalCents = cents(total);
  const percentageUnits = Math.round(percentage * 1_000_000);
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100 || Math.abs(percentage * 1_000_000 - percentageUnits) > 1e-6) {
    throw new Error('Porcentagem inválida.');
  }
  const numerator = BigInt(totalCents) * BigInt(percentageUnits);
  return Number((numerator + 50_000_000n) / 100_000_000n) / 100;
}

export function percentageFromAmount(total: number, amount: number): number {
  const totalCents = cents(total);
  const amountCents = cents(amount);
  if (totalCents <= 0) {
    if (amountCents === 0) return 0;
    throw new Error('Não há entradas neste mês para calcular a porcentagem.');
  }
  if (amountCents < 0) throw new Error('Informe um valor igual ou maior que zero.');
  const numerator = BigInt(amountCents) * 100_000_000n;
  return Number(numerator / BigInt(totalCents)) / 1_000_000;
}

export function summarize(rows: Transacao[], start: string, end: string, type = 'todos', responsible = 'Todos') {
  const valid = validDate(start) && validDate(end) && start <= end;
  const filtered = valid ? rows.filter(t => {
    const date = t.data_transacao.slice(0, 10);
    return date >= start && date <= end && (type === 'todos' || t.tipo === type)
      && (responsible === 'Todos' || t.responsavel === responsible);
  }) : [];
  const expenses = filtered.filter(t => t.tipo !== 'receita');
  const totalReceitas = sumMoney(filtered.filter(t => t.tipo === 'receita').map(t => t.valor));
  const totalDespesas = sumMoney(expenses.map(t => t.valor));
  const group = (key: 'categoria' | 'responsavel') => {
    const groups = new Map<string, number[]>();
    for (const row of expenses) {
      const name = row[key] || 'Não definido';
      groups.set(name, [...(groups.get(name) ?? []), row.valor]);
    }
    return [...groups].map(([name, values]) => ({ name, value: sumMoney(values) })).sort((a, b) => b.value - a.value);
  };
  return { totalReceitas, totalDespesas, saldoLiquido: sumMoney([totalReceitas, -totalDespesas]),
    dadosPizza: group('categoria'), dadosResponsaveis: group('responsavel'), dadosTimeline: timeline(filtered),
    maioresDespesas: [...expenses].sort((a, b) => b.valor - a.valor).slice(0, 5), quantidade: filtered.length };
}
