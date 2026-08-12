import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { LayoutDashboard, CreditCard, CalendarDays, BarChart3, PiggyBank, Tag, LogOut, ArrowLeftRight } from 'lucide-react';
export function SidebarLayout({ children, activeTab, setActiveTab, userEmail, onLogout }) {
    const menuItems = [
        { id: 'painel', label: 'Painel', icon: LayoutDashboard },
        { id: 'transacoes', label: 'Transações', icon: ArrowLeftRight },
        { id: 'cartoes', label: 'Cartões', icon: CreditCard },
        { id: 'recorrentes', label: 'Compromissos', icon: CalendarDays },
        { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
        { id: 'economias', label: 'Economias', icon: PiggyBank },
        { id: 'categorias', label: 'Categorias', icon: Tag }, // Importe o Tag do lucide-react
    ];
    return (_jsxs("div", { className: "flex h-screen bg-slate-50 overflow-hidden", children: [_jsxs("aside", { className: "w-64 bg-emerald-900 text-white flex flex-col transition-all duration-300", children: [_jsxs("div", { className: "p-6 border-b border-emerald-800", children: [_jsx("h1", { className: "text-xl font-bold tracking-wider text-emerald-50", children: "FINANCE APP" }), _jsx("p", { className: "text-xs text-emerald-300/70 mt-1 truncate", children: "Gest\u00E3o Pessoal" })] }), _jsx("nav", { className: "flex-1 py-4 px-3 space-y-1 overflow-y-auto", children: menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;
                            return (_jsxs("button", { onClick: () => setActiveTab(item.id), className: `w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                                    ? 'bg-emerald-800 text-white shadow-sm'
                                    : 'text-emerald-100/70 hover:bg-emerald-800/50 hover:text-white'}`, children: [_jsx(Icon, { size: 18, className: isActive ? 'text-emerald-400' : '' }), item.label] }, item.id));
                        }) }), _jsx("div", { className: "p-4 border-t border-emerald-800", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-xs text-emerald-300 truncate max-w-[140px]", title: userEmail, children: userEmail }), _jsx("button", { onClick: onLogout, className: "text-emerald-400 hover:text-white transition-colors p-2 rounded-md hover:bg-emerald-800", title: "Sair", children: _jsx(LogOut, { size: 16 }) })] }) })] }), _jsxs("main", { className: "flex-1 flex flex-col h-screen overflow-hidden bg-[#f8fafc]", children: [_jsx("header", { className: "bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0", children: _jsx("h2", { className: "text-xl font-semibold text-slate-800 capitalize", children: menuItems.find(i => i.id === activeTab)?.label }) }), _jsx("div", { className: "flex-1 overflow-y-auto p-8", children: _jsx("div", { className: "max-w-6xl mx-auto", children: children }) })] })] }));
}
