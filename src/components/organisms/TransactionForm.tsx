import React, { useState, useEffect } from 'react';
import { Cartao } from '@/types';
import { 
  Tag, ShoppingCart, Utensils, Car, Coffee, Home, 
  Zap, Smartphone, Heart, Briefcase, DollarSign, PiggyBank, ArrowRightLeft,
  Loader2
} from 'lucide-react';

const ICONES_TRANSACOES: Record<string, React.ElementType> = {
  'tag': Tag, 'cart': ShoppingCart, 'food': Utensils, 'car': Car, 
  'coffee': Coffee, 'home': Home, 'energy': Zap, 'phone': Smartphone, 
  'health': Heart, 'work': Briefcase, 'money': DollarSign, 
  'bank': PiggyBank, 'transfer': ArrowRightLeft
};

const RESPONSAVEIS = ['Pedro', 'Júlia', 'Ambos'];

interface CategoriaOpt {
  id: string;
  nome: string;
  subcategoria?: string;
}

export interface TransactionFormData {
  id?: string;
  descricao: string;
  valorTotal: string;
  tipo: 'receita' | 'despesa';
  dataTransacao: string;
  categoria: string;
  responsavel: string;
  icone: string;
  cartaoId: string;
  parcelas: number;
}

interface TransactionFormProps {
  initialData?: Partial<TransactionFormData>;
  categoriasList: CategoriaOpt[];
  cartoesList: Cartao[];
  onSubmit: (data: TransactionFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function TransactionForm({ 
  initialData, 
  categoriasList, 
  cartoesList, 
  onSubmit, 
  onCancel,
  isLoading = false 
}: TransactionFormProps) {
  
  const isEditing = !!initialData?.id;

  const [formData, setFormData] = useState<TransactionFormData>({
    id: initialData?.id,
    descricao: initialData?.descricao || '',
    valorTotal: initialData?.valorTotal || '',
    tipo: initialData?.tipo || 'despesa',
    dataTransacao: initialData?.dataTransacao || new Date().toISOString().split('T')[0],
    categoria: initialData?.categoria || '',
    responsavel: initialData?.responsavel || RESPONSAVEIS[2],
    icone: initialData?.icone || 'tag',
    cartaoId: initialData?.cartaoId || '',
    parcelas: initialData?.parcelas || 1,
  });

  const handleChange = (field: keyof TransactionFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Descrição</label>
          <input 
            type="text" 
            required 
            value={formData.descricao} 
            onChange={(e) => handleChange('descricao', e.target.value)} 
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
            placeholder="Ex: Supermercado"
          />
        </div>
        
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
            Valor {isEditing ? '' : 'Total'} (R$)
          </label>
          <input 
            type="number" 
            step="0.01" 
            required 
            value={formData.valorTotal} 
            onChange={(e) => handleChange('valorTotal', e.target.value)} 
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
            placeholder="0.00"
          />
        </div>
        
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Data Base</label>
          <input 
            type="date" 
            required 
            value={formData.dataTransacao} 
            onChange={(e) => handleChange('dataTransacao', e.target.value)} 
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
          />
        </div>
        
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Tipo</label>
          <select 
            value={formData.tipo} 
            onChange={(e) => handleChange('tipo', e.target.value)} 
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="despesa">Despesa (Saída)</option>
            <option value="receita">Receita (Entrada)</option>
          </select>
        </div>
        
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Cartão (Opcional)</label>
          <select 
            value={formData.cartaoId} 
            onChange={(e) => handleChange('cartaoId', e.target.value)} 
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="">Nenhum (Dinheiro/Pix)</option>
            {cartoesList.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Categoria</label>
          <select 
            value={formData.categoria} 
            onChange={(e) => handleChange('categoria', e.target.value)} 
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="">Geral</option>
            {categoriasList.map((c) => (
              <option key={c.id} value={c.nome}>
                {c.nome} {c.subcategoria ? `(${c.subcategoria})` : ''}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Responsável</label>
          <select 
            value={formData.responsavel} 
            onChange={(e) => handleChange('responsavel', e.target.value)} 
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            {RESPONSAVEIS.map((resp) => (
              <option key={resp} value={resp}>{resp}</option>
            ))}
          </select>
        </div>
        
        {formData.tipo === 'despesa' && !isEditing && (
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Número de Parcelas</label>
            <input 
              type="number" 
              min="1" 
              max="48" 
              value={formData.parcelas} 
              onChange={(e) => handleChange('parcelas', parseInt(e.target.value) || 1)} 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
            />
          </div>
        )}
        
        <div className="md:col-span-2 mt-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">Ícone da Transação</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ICONES_TRANSACOES).map(([chave, IconeComp]) => (
              <button 
                key={chave} 
                type="button" 
                onClick={() => handleChange('icone', chave)} 
                className={`p-2.5 rounded-lg border transition-all ${
                  formData.icone === chave 
                    ? 'bg-emerald-100 border-emerald-500 text-emerald-700 shadow-sm' 
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <IconeComp size={20} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
        <button 
          type="button" 
          onClick={onCancel} 
          className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
        >
          Cancelar
        </button>
        <button 
          type="submit" 
          disabled={isLoading} 
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-6 rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
        >
          {isLoading && <Loader2 size={16} className="animate-spin" />}
          {isLoading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}