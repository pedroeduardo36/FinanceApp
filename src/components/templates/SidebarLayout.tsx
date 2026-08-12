import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  ArrowRightLeft, 
  CreditCard, 
  CalendarDays, 
  BarChart3, 
  PiggyBank, 
  Tags,
  LogOut,
  Menu,
  X,
  Wallet
} from 'lucide-react';

export type TabId = 'painel' | 'transacoes' | 'cartoes' | 'recorrentes' | 'relatorios' | 'economias' | 'categorias';

interface SidebarLayoutProps {
  children: React.ReactNode;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onLogout: () => void;
  userEmail?: string;
}

export function SidebarLayout({ children, activeTab, onTabChange, onLogout, userEmail }: SidebarLayoutProps) {
  // Estado para controlar o menu no celular
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'painel', label: 'Painel Geral', icon: LayoutDashboard },
    { id: 'transacoes', label: 'Transações', icon: ArrowRightLeft },
    { id: 'cartoes', label: 'Meus Cartões', icon: CreditCard },
    { id: 'recorrentes', label: 'Custos Fixos', icon: CalendarDays },
    { id: 'economias', label: 'Caixinhas (Metas)', icon: PiggyBank },
    { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
    { id: 'categorias', label: 'Categorias', icon: Tags },
  ];

  // Função para fechar o menu ao clicar em um item no celular
  const handleTabClick = (id: TabId) => {
    onTabChange(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      
      {/* HEADER MOBILE (Aparece apenas em telas pequenas) */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2">
          <Wallet className="text-emerald-400" size={24} />
          <span className="font-bold text-lg tracking-wide">Finance<span className="text-emerald-400">App</span></span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)} 
          className="text-slate-300 hover:text-white p-1"
        >
          <Menu size={28} />
        </button>
      </div>

      {/* OVERLAY ESCURO DO MOBILE */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR (Menu Lateral) - Fixo no PC, Gaveta no Mobile */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Topo da Sidebar */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="text-emerald-400" size={28} />
            <h1 className="text-2xl font-bold text-white tracking-wide">
              Finance<span className="text-emerald-400">App</span>
            </h1>
          </div>
          {/* Botão de Fechar no Mobile */}
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden text-slate-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* Links do Menu */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto py-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm
                  ${isActive 
                    ? 'bg-emerald-500/10 text-emerald-400' 
                    : 'hover:bg-slate-800 hover:text-white'}
                `}
              >
                <Icon size={20} className={isActive ? 'text-emerald-400' : 'text-slate-400'} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Rodapé da Sidebar (Usuário e Logout) */}
        <div className="p-4 border-t border-slate-800">
          <div className="px-4 py-3 bg-slate-800/50 rounded-xl mb-3 overflow-hidden">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Conectado como</p>
            <p className="text-sm font-medium text-white truncate" title={userEmail}>{userEmail}</p>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-colors text-sm font-medium"
          >
            <LogOut size={20} />
            Sair da conta
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL DO CONTEÚDO */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto pb-20 md:pb-0">
            {children}
          </div>
        </div>
      </main>

    </div>
  );
}