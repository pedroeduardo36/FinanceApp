import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Cartao } from '@/types';
import { addMonths, format } from 'date-fns';

interface AdvancedFormProps {
  userId: string;
  onSuccess: () => void;
}

const CATEGORIAS = ['Alimentação', 'Moradia', 'Transporte', 'Lazer', 'Saúde', 'Educação', 'Outros'];
const RESPONSAVEIS = ['Família', 'Particular', 'Conjunto'];

export function AdvancedTransactionForm({ userId, onSuccess }: AdvancedFormProps) {
  const [descricao, setDescricao] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [tipo, setTipo] = useState<'receita' | 'despesa' | 'fatura_cartao'>('despesa');
  const [dataTransacao, setDataTransacao] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [responsavel, setResponsavel] = useState(RESPONSAVEIS[0]);
  const [parcelas, setParcelas] = useState(1);
  const [cartaoId, setCartaoId] = useState<string>('');
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('cartoes_credito').select('*').eq('user_id', userId).then(({ data }) => {
      if (data) setCartoes(data);
    });
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const valorNumerico = parseFloat(valorTotal);
      const numParcelas = tipo === 'despesa' || tipo === 'fatura_cartao' ? Number(parcelas) : 1;
      const valorParcela = valorNumerico / numParcelas;

      const transacoesParaInserir = Array.from({ length: numParcelas }).map((_, index) => {
        const dataBase = new Date(dataTransacao);
        const dataCalculada = addMonths(dataBase, index);

        return {
          user_id: userId,
          descricao: numParcelas > 1 ? `${descricao} (${index + 1}/${numParcelas})` : descricao,
          valor: valorParcela,
          tipo,
          data_transacao: format(dataCalculada, 'yyyy-MM-dd'),
          categoria,
          responsavel,
          parcela_atual: index + 1,
          total_parcelas: numParcelas,
          cartao_id: cartaoId || null,
        };
      });

      const { error } = await supabase.from('transacoes').insert(transacoesParaInserir);
      if (error) throw error;

      setDescricao('');
      setValorTotal('');
      setParcelas(1);
      onSuccess();
    } catch (error) {
      console.error('Erro ao salvar transação:', error);
      alert('Erro ao salvar transações parceladas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-4">
      <h3 className="font-bold text-slate-800 text-lg border-b pb-2">Nova Transação / Despesa</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
          <input
            type="text"
            required
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md"
            placeholder="Ex: Compra Online, Supermercado..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Valor Total (R$)</label>
          <input
            type="number"
            step="0.01"
            required
            value={valorTotal}
            onChange={(e) => setValorTotal(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Data Base / Vencimento</label>
          <input
            type="date"
            required
            value={dataTransacao}
            onChange={(e) => setDataTransacao(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Movimentação</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as any)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
          >
            <option value="despesa">Despesa (À vista / Conta)</option>
            <option value="receita">Receita (Entrada)</option>
            <option value="fatura_cartao">Fatura de Cartão</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
          >
            {CATEGORIAS.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Responsável</label>
          <select
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
          >
            {RESPONSAVEIS.map((resp) => (
              <option key={resp} value={resp}>{resp}</option>
            ))}
          </select>
        </div>

        {tipo === 'despesa' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Número de Parcelas</label>
            <input
              type="number"
              min="1"
              max="48"
              value={parcelas}
              onChange={(e) => setParcelas(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-md mt-4 transition-colors disabled:opacity-50"
      >
        {loading ? 'Processando Projeção...' : 'Salvar Transação'}
      </button>
    </form>
  );
}