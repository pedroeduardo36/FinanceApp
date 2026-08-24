import React, { useState } from 'react';
import { Cartao } from '@/types';
import { 
  Tag, ShoppingCart, Utensils, Car, Coffee, Home, 
  Zap, Smartphone, Heart, Briefcase, DollarSign, PiggyBank, ArrowRightLeft,
  Loader2, Settings2, CreditCard, Calendar
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

export interface AdvancedTransactionData {
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
  observacoes?: string; // Campo extra para formulário avançado
}

interface AdvancedTransactionFormProps {
  initialData?: Partial<AdvancedTransactionData>;
  categoriasList: CategoriaOpt[];
  cartoesList: Cartao[];
  onSubmit: (data: AdvancedTransactionData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function AdvancedTransactionForm({ 
  initialData, 
  categoriasList, 
  cartoesList, 
  onSubmit, 
  onCancel,
  isLoading = false 
}: AdvancedTransactionFormProps) {
  
  const isEditing = !!initialData?.id;
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [formData, setFormData] = useState<AdvancedTransactionData>({
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
    observacoes: initialData?.observacoes || '',
  });

  const handleChange = (field: keyof AdvancedTransactionData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      
      {/* SEÇÃO BÁSICA */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-2">
          <DollarSign size={16} className="text-emerald-500" /> Informações Principais
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Descrição</label>
            <input 
              type="text" 
              required 
              value={formData.descricao} 
              onChange={(e) => handleChange('descricao', e.target.value)} 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white" 
              placeholder="Ex: Conta de Luz"
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
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white" 
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Tipo da Movimentação</label>
            <div className="flex bg-white rounded-lg border border-slate-300 overflow-hidden">
              <button
                type="button"
                onClick={() => handleChange('tipo', 'despesa')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${formData.tipo === 'despesa' ? 'bg-red-50 text-red-600' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                Saída
              </button>
              <div className="w-px bg-slate-300"></div>
              <button
                type="button"
                onClick={() => handleChange('tipo', 'receita')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${formData.tipo === 'receita' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                Entrada
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* BOTÃO TOGGLE AVANÇADO */}
      <button 
        type="button" 
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-sm font-medium text-slate-500 hover:text-emerald-600 flex items-center gap-1.5 transition-colors px-1"
      >
        <Settings2 size={16} />
        {showAdvanced ? 'Ocultar Opções Avançadas' : 'Mostrar Opções Avançadas'}
      </button>

      {/* SEÇÃO AVANÇADA */}
      {showAdvanced && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                <Calendar size={12} /> Data
              </label>
              <input 
                type="date" 
                required 
                value={formData.dataTransacao} 
                onChange={(e) => handleChange('dataTransacao', e.target.value)} 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                <Tag size={12} /> Categoria
              </label>
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                <CreditCard size={12} /> Cartão de Crédito
              </label>
              <select 
                value={formData.cartaoId} 
                onChange={(e) => handleChange('cartaoId', e.target.value)} 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                disabled={formData.tipo === 'receita'}
              >
                <option value="">Nenhum (Dinheiro/Débito)</option>
                {cartoesList.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
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
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Parcelamento</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    min="1" 
                    max="48" 
                    value={formData.parcelas} 
                    onChange={(e) => handleChange('parcelas', parseInt(e.target.value) || 1)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
                  />
                  <span className="text-sm text-slate-500 whitespace-nowrap">x parcelas</span>
                </div>
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">Ícone Visual</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(ICONES_TRANSACOES).map(([chave, IconeComp]) => (
                  <button 
                    key={chave} 
                    type="button" 
                    onClick={() => handleChange('icone', chave)} 
                    className={`p-2 rounded-lg border transition-all ${
                      formData.icone === chave 
                        ? 'bg-slate-800 border-slate-800 text-white shadow-sm' 
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <IconeComp size={18} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AÇÕES */}
      <div className="flex justify-end gap-3 pt-2">
        <button 
          type="button" 
          onClick={onCancel} 
          className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-medium"
        >
          Cancelar
        </button>
        <button 
          type="submit" 
          disabled={isLoading} 
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-6 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
        >
          {isLoading && <Loader2 size={16} className="animate-spin" />}
          {isLoading ? 'Registrando...' : 'Salvar Transação'}
        </button>
      </div>
    </form>
  );
}