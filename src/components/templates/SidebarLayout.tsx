import { ReactNode } from 'react';
import { 
  LayoutDashboard, 
  CreditCard, 
  CalendarDays, 
  BarChart3, 
  PiggyBank, 
  Tag,
  LogOut,
  ArrowLeftRight
} from 'lucide-react';

export type TabId = 'painel' | 'transacoes' | 'cartoes' | 'recorrentes' | 'relatorios' | 'economias';

interface SidebarLayoutProps {
  children: ReactNode;
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  userEmail: string;
  onLogout: () => void;
}

export function SidebarLayout({ children, activeTab, setActiveTab, userEmail, onLogout }: SidebarLayoutProps) {
  const menuItems = [
    { id: 'painel', label: 'Painel', icon: LayoutDashboard },
    { id: 'transacoes', label: 'Transações', icon: ArrowLeftRight },
    { id: 'cartoes', label: 'Cartões', icon: CreditCard },
    { id: 'recorrentes', label: 'Compromissos', icon: CalendarDays },
    { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
    { id: 'economias', label: 'Economias', icon: PiggyBank },
    { id: 'categorias', label: 'Categorias', icon: Tag }, // Importe o Tag do lucide-react
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar (Menu Lateral inspirado na foto) */}
      <aside className="w-64 bg-emerald-900 text-white flex flex-col transition-all duration-300">
        <div className="p-6 border-b border-emerald-800">
          <h1 className="text-xl font-bold tracking-wider text-emerald-50">FINANCE APP</h1>
          <p className="text-xs text-emerald-300/70 mt-1 truncate">Gestão Pessoal</p>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as TabId)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-emerald-800 text-white shadow-sm' 
                    : 'text-emerald-100/70 hover:bg-emerald-800/50 hover:text-white'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-emerald-400' : ''} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-emerald-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-300 truncate max-w-[140px]" title={userEmail}>
              {userEmail}
            </span>
            <button 
              onClick={onLogout}
              className="text-emerald-400 hover:text-white transition-colors p-2 rounded-md hover:bg-emerald-800"
              title="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Conteúdo Principal (Main) */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#f8fafc]">
        {/* Cabeçalho dinâmico baseado na aba ativa */}
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-semibold text-slate-800 capitalize">
            {menuItems.find(i => i.id === activeTab)?.label}
          </h2>
        </header>
        
        {/* Área de scroll onde as páginas serão renderizadas */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}