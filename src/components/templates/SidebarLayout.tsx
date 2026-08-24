import React from 'react';
import { 
  LayoutDashboard, ArrowRightLeft, CreditCard, CalendarDays, 
  BarChart3, PiggyBank, Tags, LogOut 
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
  const menuItems: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'painel', label: 'Painel', icon: LayoutDashboard },
    { id: 'transacoes', label: 'Transações', icon: ArrowRightLeft },
    { id: 'cartoes', label: 'Cartões', icon: CreditCard },
    { id: 'recorrentes', label: 'Compromissos', icon: CalendarDays },
    { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
    { id: 'economias', label: 'Economias', icon: PiggyBank },
    { id: 'categorias', label: 'Categorias', icon: Tags },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      
      {/* SIDEBAR: w-16 no celular (apenas ícones), w-64 no Computador */}
      <aside className="fixed inset-y-0 left-0 z-50 flex flex-col bg-[#1A5336] text-white w-16 md:w-64 transition-all duration-300 ease-in-out shadow-xl">
        
        {/* Topo / Logo */}
        <div className="p-4 flex flex-col items-center md:items-start border-b border-white/10 shrink-0 min-h-[72px] justify-center">
          {/* Aparece só no PC */}
          <div className="hidden md:block w-full">
            <h1 className="text-xl font-bold tracking-wider uppercase truncate">Finance App</h1>
            <p className="text-xs text-emerald-300 truncate">Gestão Pessoal</p>
          </div>
          {/* Aparece só no Mobile (Sigla) */}
          <div className="md:hidden font-bold text-xl tracking-tighter text-emerald-300">
            FA
          </div>
        </div>

        {/* Navegação */}
        <nav className="flex-1 overflow-y-auto py-4 flex flex-col gap-2 px-2 custom-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                title={item.label}
                className={`
                  flex items-center justify-center md:justify-start gap-3 p-3 rounded-lg transition-all duration-200
                  ${isActive ? 'bg-white/20 font-semibold' : 'hover:bg-white/10 opacity-70 hover:opacity-100'}
                `}
              >
                <Icon size={20} className="shrink-0" />
                <span className="hidden md:inline-block text-sm whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Rodapé / Logout */}
        <div className="p-3 md:p-4 border-t border-white/10 shrink-0 flex items-center justify-center md:justify-between">
          <div className="hidden md:block truncate max-w-[140px]">
            <p className="text-xs text-emerald-300 truncate" title={userEmail}>{userEmail}</p>
          </div>
          <button
            onClick={onLogout}
            title="Sair da conta"
            className="p-2 hover:bg-red-500/80 hover:text-white rounded-lg transition-colors flex items-center justify-center text-emerald-200"
          >
            <LogOut size={20} />
          </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen ml-16 md:ml-64 transition-all duration-300 overflow-hidden bg-slate-50">
        <div className="flex-1 overflow-x-hidden p-4 md:p-8 w-full">
          {children}
        </div>
      </main>

    </div>
  );
}