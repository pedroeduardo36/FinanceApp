import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface TransactionFormProps {
  userId: string;
  onTransactionAdded: () => void; // Função para atualizar a lista após salvar
}

export function TransactionForm({ userId, onTransactionAdded }: TransactionFormProps) {
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('despesa');
  const [dataTransacao, setDataTransacao] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('transacoes').insert([
        {
          user_id: userId,
          descricao,
          valor: parseFloat(valor), // Converte string para número
          tipo,
          data_transacao: dataTransacao,
        }
      ]);

      if (error) throw error;

      // Limpa o formulário e avisa a tela principal para buscar os dados de novo
      setDescricao('');
      setValor('');
      onTransactionAdded();
    } catch (error) {
      console.error('Erro ao salvar transação:', error);
      alert('Erro ao salvar. Verifique o console.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-4">
      <h3 className="font-bold text-slate-800 text-lg border-b pb-2">Nova Transação</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
          <input
            type="text"
            required
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md"
            placeholder="Ex: Salário, Mercado..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
          <input
            type="number"
            step="0.01"
            required
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
          <input
            type="date"
            required
            value={dataTransacao}
            onChange={(e) => setDataTransacao(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as 'receita' | 'despesa')}
            className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
          >
            <option value="receita">Receita (Entrada)</option>
            <option value="despesa">Despesa (Saída)</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-md mt-4 transition-colors disabled:opacity-50"
      >
        {loading ? 'Salvando...' : 'Adicionar Transação'}
      </button>
    </form>
  );
}