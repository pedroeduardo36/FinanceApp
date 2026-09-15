import { useId, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, CircleDollarSign, Loader2, Percent, Plus, ReceiptText, WalletCards, X } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Feedback } from '@/components/ui/Feedback';
import { useRows } from '@/hooks/useRows';
import { requireMutation } from '@/lib/dataCore';
import { budgetAmount, budgetIncomeRows, currency, dateLabel, moneyInput, monthlyIncome, percentageFromAmount, shiftMonth, sumMoney } from '@/lib/finance';
import { supabase } from '@/lib/supabase';
import type { BudgetIncomeRow } from '@/lib/finance';
import type { Transacao } from '@/types';

interface OrcamentosPageProps { userId: string; transacoes: Transacao[] }
type InputMode = 'percentage' | 'amount';
interface AllocationDraft { mode: InputMode; value: string }

function monthLabel(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, monthNumber - 1, 1));
}

function parsePercentage(value: string) {
  if (value.trim() === '') return 0;
  if (!/^\d{1,3}([.,]\d{1,2})?$/.test(value.trim())) throw new Error('Use porcentagens de 0 a 100 com até duas casas decimais.');
  const parsed = Number(value.replace(',', '.'));
  if (parsed < 0 || parsed > 100) throw new Error('Cada porcentagem deve ficar entre 0 e 100.');
  return parsed;
}

function IncomeBreakdown({ item }: { item: BudgetIncomeRow }) {
  const popoverId = useId();
  const popoverRef = useRef<HTMLDivElement>(null);

  const showBreakdown = (target: HTMLElement) => {
    const popover = popoverRef.current;
    if (!popover) return;
    if (!popover.matches(':popover-open')) popover.showPopover();

    const trigger = target.getBoundingClientRect();
    const width = Math.min(512, window.innerWidth - 32);
    const left = Math.max(16, Math.min(trigger.left, window.innerWidth - width - 16));
    popover.style.width = `${width}px`;
    popover.style.left = `${left}px`;
    popover.style.top = `${trigger.bottom + 8}px`;

    const bounds = popover.getBoundingClientRect();
    if (bounds.bottom > window.innerHeight - 16) {
      popover.style.top = `${Math.max(16, trigger.top - bounds.height - 8)}px`;
    }
  };

  return <>
    <button
      type="button"
      aria-haspopup="dialog"
      aria-controls={popoverId}
      onMouseEnter={event => showBreakdown(event.currentTarget)}
      onFocus={event => showBreakdown(event.currentTarget)}
      onClick={event => showBreakdown(event.currentTarget)}
      className="flex items-center gap-1 rounded font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
    >
      {item.title}<ChevronDown size={15} aria-hidden="true" />
    </button>
    <div
      ref={popoverRef}
      id={popoverId}
      popover="auto"
      role="dialog"
      aria-label={`Entradas somadas em ${item.title}`}
      className="fixed m-0 max-h-[min(70vh,32rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-2xl"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Entradas somadas ({item.details.length})</p>
        <button type="button" onClick={() => popoverRef.current?.hidePopover()} aria-label="Fechar detalhes" className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"><X size={16} /></button>
      </div>
      <ul className="space-y-2">{item.details.map(detail => <li key={detail.id} className="border-b border-slate-100 pb-2 text-sm last:border-0 last:pb-0">
        <div className="flex justify-between gap-3"><span className="font-medium text-slate-700">{detail.descricao}</span><span className="whitespace-nowrap text-emerald-700">{currency(detail.valor)}</span></div>
        <p className="text-xs text-slate-500">{detail.responsavel?.trim() || 'Não informado'} · {dateLabel(detail.data_transacao)}</p>
      </li>)}</ul>
    </div>
  </>;
}

export function OrcamentosPage({ userId, transacoes }: OrcamentosPageProps) {
  const currentMonth = new Date();
  const initialMonth = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
  const [month, setMonth] = useState(initialMonth);
  const [drafts, setDrafts] = useState<Record<string, Record<string, AllocationDraft>>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { data: budgets, loading: budgetsLoading, error: budgetsError, reload: reloadBudgets } = useRows('orcamentos', userId);
  const { data: percentages, loading: percentagesLoading, error: percentagesError, reload: reloadPercentages } = useRows('orcamento_percentuais', userId);

  const monthPercentages = useMemo(() => new Map(percentages
    .filter(item => item.competencia.slice(0, 7) === month)
    .map(item => [item.orcamento_id, item.percentual])), [percentages, month]);
  const draftFor = (budgetId: string): AllocationDraft => drafts[month]?.[budgetId]
    ?? { mode: 'percentage', value: String(monthPercentages.get(budgetId) ?? 0) };
  const updateDraft = (budgetId: string, draft: AllocationDraft) => setDrafts(current => ({
    ...current, [month]: { ...current[month], [budgetId]: draft },
  }));

  const income = useMemo(() => monthlyIncome(transacoes, month), [transacoes, month]);
  const incomeRows = useMemo(() => budgetIncomeRows(transacoes, month), [transacoes, month]);
  const totalIncome = useMemo(() => sumMoney(income.map(item => item.valor)), [income]);
  const spendingByBudget = useMemo(() => {
    const values = new Map<string, number[]>();
    for (const transaction of transacoes) {
      if (transaction.tipo !== 'despesa' || transaction.data_transacao.slice(0, 7) !== month || !transaction.orcamento_id) continue;
      values.set(transaction.orcamento_id, [...(values.get(transaction.orcamento_id) ?? []), transaction.valor]);
    }
    return new Map([...values].map(([id, amounts]) => [id, sumMoney(amounts)]));
  }, [transacoes, month]);
  const unassignedSpent = useMemo(() => sumMoney(transacoes
    .filter(item => item.tipo === 'despesa' && item.data_transacao.slice(0, 7) === month && !item.orcamento_id)
    .map(item => item.valor)), [transacoes, month]);
  const parsedDrafts = budgets.map(budget => {
    const draft = draftFor(budget.id);
    try {
      if (draft.mode === 'amount') {
        const amount = moneyInput(draft.value.replace(',', '.'), true);
        const spent = spendingByBudget.get(budget.id) ?? 0;
        return { budget, draft, amount, spent, remaining: sumMoney([amount, -spent]), percentage: percentageFromAmount(totalIncome, amount), valid: true };
      }
      const percentage = parsePercentage(draft.value);
      const amount = budgetAmount(totalIncome, percentage);
      const spent = spendingByBudget.get(budget.id) ?? 0;
      return { budget, draft, percentage, amount, spent, remaining: sumMoney([amount, -spent]), valid: true };
    } catch { return { budget, draft, percentage: 0, amount: 0, spent: spendingByBudget.get(budget.id) ?? 0, remaining: 0, valid: false }; }
  });
  const totalPercentage = parsedDrafts.reduce((sum, item) => sum + item.percentage, 0);
  const totalAmount = sumMoney(parsedDrafts.map(item => item.amount));
  const totalSpent = sumMoney(parsedDrafts.map(item => item.spent));
  const totalRemaining = sumMoney([totalAmount, -totalSpent]);
  const formValid = parsedDrafts.every(item => item.valid) && totalPercentage <= 100 && totalAmount <= totalIncome;

  const createBudget = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setCreating(true); setActionError(null); setMessage(null);
    try {
      await requireMutation(supabase.from('orcamentos').insert([{ user_id: userId, nome: trimmedName }]).select());
      setName(''); setDialogOpen(false); await reloadBudgets();
    } catch {
      setActionError(budgetsError || percentagesError
        ? 'Estrutura de orçamentos indisponível. Execute database/orcamentos.sql no SQL Editor do Supabase.'
        : 'Não foi possível criar o orçamento. Verifique se o nome já existe.');
    }
    finally { setCreating(false); }
  };

  const savePercentages = async () => {
    setActionError(null); setMessage(null);
    if (!formValid) { setActionError('Revise os valores e porcentagens: a distribuição não pode ultrapassar as entradas do mês.'); return; }
    setSaving(true);
    try {
      if (parsedDrafts.length) {
        const payload = parsedDrafts.map(({ budget, percentage }) => ({
          user_id: userId, orcamento_id: budget.id, competencia: `${month}-01`, percentual: percentage,
        }));
        await requireMutation(supabase.from('orcamento_percentuais')
          .upsert(payload, { onConflict: 'orcamento_id,competencia' }).select(), payload.length);
        await reloadPercentages();
        setDrafts(current => {
          const next = { ...current };
          delete next[month];
          return next;
        });
      }
      setMessage(`Porcentagens de ${monthLabel(month)} salvas.`);
    } catch { setActionError('Não foi possível salvar as porcentagens deste mês.'); }
    finally { setSaving(false); }
  };

  const changeMonth = (offset: number) => {
    setActionError(null); setMessage(null);
    setMonth(current => shiftMonth(current, offset));
  };
  const isLoading = budgetsLoading || percentagesLoading;

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Planejamento mensal</p>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Orçamentos</h2>
        <p className="text-sm text-slate-500">Planeje, acompanhe os gastos e ajuste suas prioridades.</p>
      </div>
      <button type="button" onClick={() => { setActionError(null); setMessage(null); setDialogOpen(true); }} className="flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800">
        <Plus size={16} /> Adicionar orçamento
      </button>
    </div>

    <Feedback error={actionError} />
    <Feedback error={budgetsError || percentagesError ? 'Estrutura de orçamentos indisponível. Execute database/orcamentos.sql no SQL Editor do Supabase e tente novamente.' : null} retry={() => void Promise.all([reloadBudgets(), reloadPercentages()])} />
    {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">{message}</p>}

    <section aria-labelledby="entradas-heading" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 id="entradas-heading" className="font-bold text-slate-800">Entradas de {monthLabel(month)}</h3>
          <p className="text-sm text-slate-500">Do primeiro ao último dia do mês selecionado</p>
        </div>
        <strong className="text-2xl text-emerald-700">{currency(totalIncome)}</strong>
      </div>
      <div className="overflow-x-auto px-5 pb-3">
        <table>
          <caption className="sr-only">Origem das entradas consideradas nos orçamentos de {monthLabel(month)}</caption>
          <thead><tr><th scope="col">Título</th><th scope="col">Responsável</th><th scope="col" className="text-right">Valor</th></tr></thead>
          <tbody>
            {incomeRows.map(item => <tr key={item.id}>
              <td>{item.grouped ? <IncomeBreakdown item={item} /> : item.title}</td><td>{item.responsible}</td><td className="text-right font-medium text-emerald-700">{currency(item.value)}</td>
            </tr>)}
            {!incomeRows.length && <tr><td colSpan={3} className="py-6 text-center text-slate-500">Nenhuma entrada registrada neste mês.</td></tr>}
          </tbody>
          <tfoot><tr className="font-bold"><th scope="row" colSpan={2}>Total das entradas</th><td className="text-right text-emerald-700">{currency(totalIncome)}</td></tr></tfoot>
        </table>
      </div>
    </section>

    <section aria-labelledby="distribuicao-heading" className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={() => changeMonth(-1)} aria-label="Ir para o mês anterior" className="inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100"><ChevronLeft size={18} /> Anterior</button>
        <div className="text-center"><h3 id="distribuicao-heading" className="font-bold capitalize text-slate-800">{monthLabel(month)}</h3><p className="text-xs text-slate-500">Porcentagens exclusivas deste mês</p></div>
        <button type="button" onClick={() => changeMonth(1)} aria-label="Ir para o próximo mês" className="inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100">Próximo <ChevronRight size={18} /></button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label={`Resumo de ${monthLabel(month)}`}>
        <div className="rounded-2xl bg-slate-900 p-4 text-white">
          <div className="mb-3 flex items-center justify-between text-slate-300"><span className="text-xs font-medium uppercase tracking-wide">Entradas</span><CircleDollarSign size={18} /></div>
          <strong className="text-2xl">{currency(totalIncome)}</strong>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between text-slate-500"><span className="text-xs font-medium uppercase tracking-wide">Designado</span><WalletCards size={18} /></div>
          <strong className="text-2xl text-slate-900">{currency(totalAmount)}</strong>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between text-slate-500"><span className="text-xs font-medium uppercase tracking-wide">Gasto</span><ReceiptText size={18} /></div>
          <strong className="text-2xl text-slate-900">{currency(totalSpent)}</strong>
          {unassignedSpent > 0 && <p className="mt-1 text-xs text-amber-700">{currency(unassignedSpent)} sem orçamento</p>}
        </div>
        <div className={`rounded-2xl border p-4 ${totalRemaining < 0 ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
          <div className={`mb-3 text-xs font-medium uppercase tracking-wide ${totalRemaining < 0 ? 'text-red-700' : 'text-emerald-700'}`}>Saldo planejado</div>
          <strong className={`text-2xl ${totalRemaining < 0 ? 'text-red-800' : 'text-emerald-800'}`}>{currency(totalRemaining)}</strong>
        </div>
      </div>

      {isLoading ? <p role="status" className="text-sm text-slate-500">Carregando orçamentos...</p> : budgets.length ? <>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {parsedDrafts.map(({ budget, draft, amount, spent, remaining, percentage, valid }) => {
            const usage = amount > 0 ? Math.min(100, (spent / amount) * 100) : spent > 0 ? 100 : 0;
            return <article key={budget.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-4 flex items-start justify-between gap-3"><div><h4 className="text-lg font-bold text-slate-900">{budget.nome}</h4><p className="text-xs text-slate-500">Calculado sobre {currency(totalIncome)}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${remaining < 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{remaining < 0 ? 'Acima do limite' : 'Dentro do plano'}</span></div>
            <div className="mb-4 grid grid-cols-2 rounded-lg bg-slate-100 p-1" aria-label={`Forma de definir ${budget.nome}`}>
              <button type="button" aria-pressed={draft.mode === 'percentage'} onClick={() => updateDraft(budget.id, { mode: 'percentage', value: String(percentage) })} className={`rounded-md px-3 py-1.5 text-sm font-medium ${draft.mode === 'percentage' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'}`}>Porcentagem</button>
              <button type="button" aria-pressed={draft.mode === 'amount'} onClick={() => updateDraft(budget.id, { mode: 'amount', value: amount.toFixed(2) })} className={`rounded-md px-3 py-1.5 text-sm font-medium ${draft.mode === 'amount' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'}`}>Valor</button>
            </div>
            <label htmlFor={`budget-${budget.id}`} className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">{draft.mode === 'percentage' ? 'Porcentagem' : 'Valor específico'}</label>
            <div className="flex items-center gap-3">
              <div className="relative flex-1"><input id={`budget-${budget.id}`} type="number" min="0" max={draft.mode === 'percentage' ? 100 : undefined} step="0.01" inputMode="decimal" value={draft.value} onChange={event => updateDraft(budget.id, { ...draft, value: event.target.value })} aria-invalid={!valid} className={`w-full rounded-lg border border-slate-300 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${draft.mode === 'amount' ? 'px-9 pr-3' : 'px-3 pr-9'}`} />
                <span className={`pointer-events-none absolute top-2 text-slate-500 ${draft.mode === 'amount' ? 'left-3' : 'right-3'}`}>{draft.mode === 'amount' ? 'R$' : '%'}</span>
              </div>
              <strong className="min-w-28 text-right text-lg text-emerald-700">{valid ? draft.mode === 'amount' ? `${percentage.toLocaleString('pt-BR', { maximumFractionDigits: 6 })}%` : currency(amount) : '—'}</strong>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
              <div><p className="text-[11px] uppercase tracking-wide text-slate-500">Designado</p><p className="mt-1 font-semibold text-slate-800">{currency(amount)}</p></div>
              <div><p className="text-[11px] uppercase tracking-wide text-slate-500">Gasto</p><p className="mt-1 font-semibold text-slate-800">{currency(spent)}</p></div>
              <div><p className="text-[11px] uppercase tracking-wide text-slate-500">Restante</p><p className={`mt-1 font-semibold ${remaining < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{currency(remaining)}</p></div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" aria-label={`${usage.toFixed(0)}% do orçamento ${budget.nome} utilizado`} role="img"><div className={`h-full rounded-full transition-all duration-300 ${remaining < 0 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${usage}%` }} /></div>
          </article>})}
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm text-slate-500">Total distribuído</p><p className={`text-xl font-bold ${formValid ? 'text-slate-800' : 'text-red-700'}`}>{totalPercentage.toLocaleString('pt-BR', { maximumFractionDigits: 6 })}% · {formValid ? currency(totalAmount) : 'acima do total disponível'}</p><p className="text-xs text-slate-500">Disponível: {Math.max(0, 100 - totalPercentage).toLocaleString('pt-BR', { maximumFractionDigits: 6 })}%</p></div>
          <button type="button" onClick={() => void savePercentages()} disabled={saving || !formValid} className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-5 py-2.5 font-medium text-white hover:bg-slate-900 disabled:opacity-50">{saving && <Loader2 size={16} className="animate-spin" />} Salvar porcentagens</button>
        </div>
      </> : <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center"><Percent size={32} className="mx-auto mb-3 text-slate-400" /><p className="font-medium text-slate-700">Nenhum orçamento criado.</p><p className="text-sm text-slate-500">Adicione um orçamento para começar a distribuir suas entradas.</p></div>}
    </section>

    {dialogOpen && <Dialog label="Novo orçamento" onClose={() => { if (!creating) setDialogOpen(false); }}>
      <form onSubmit={createBudget} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between"><h3 className="text-lg font-bold text-slate-800">Novo orçamento</h3><button type="button" disabled={creating} onClick={() => setDialogOpen(false)} aria-label="Fechar" className="rounded-lg p-1 text-slate-600 hover:bg-slate-100"><X size={20} /></button></div>
        <label htmlFor="budget-name" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Nome</label>
        <input id="budget-name" autoFocus required maxLength={80} value={name} onChange={event => setName(event.target.value)} placeholder="Ex.: Moradia" className="mb-5 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        <button type="submit" disabled={creating || !name.trim()} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 font-medium text-white hover:bg-emerald-800 disabled:opacity-50">{creating && <Loader2 size={16} className="animate-spin" />} Adicionar orçamento</button>
      </form>
    </Dialog>}
  </div>;
}
