import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { AuthForm } from "@/components/organisms/AuthForm";
import { SidebarLayout } from "@/components/templates/SidebarLayout";
// Páginas
import { PainelPage } from "@/pages/PainelPage";
import { CompromissosPage } from "@/pages/CompromissosPage";
import { CartoesPage } from "@/pages/CartoesPage";
import { RelatoriosPage } from "@/pages/RelatoriosPage";
import { TransacoesPage } from "@/pages/TransacoesPage";
import { EconomiasPage } from "@/pages/EconomiasPage";
import { CategoriasManager } from "@/components/organisms/CategoriasManager";
export function App() {
    const [session, setSession] = useState(null);
    const [activeTab, setActiveTab] = useState("painel");
    // Estado Global das Transações para calcular Saldo Geral
    const [transacoes, setTransacoes] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    useEffect(() => {
        supabase.auth
            .getSession()
            .then(({ data: { session } }) => setSession(session));
        const { data: { subscription }, } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
        return () => subscription.unsubscribe();
    }, []);
    const fetchTransacoes = useCallback(async () => {
        if (!session?.user.id)
            return;
        setIsLoading(true);
        const { data } = await supabase
            .from("transacoes")
            .select("*")
            .order("data_transacao", { ascending: false });
        setTransacoes(data || []);
        setIsLoading(false);
    }, [session?.user.id]);
    useEffect(() => {
        fetchTransacoes();
    }, [fetchTransacoes]);
    // Cálculo do Saldo Principal (Receitas - Despesas)
    const saldoAtual = transacoes.reduce((acc, t) => {
        return t.tipo === "receita" ? acc + t.valor : acc - t.valor;
    }, 0);
    if (!session) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center p-6 bg-slate-50", children: _jsx(AuthForm, {}) }));
    }
    const renderContent = () => {
        switch (activeTab) {
            case "painel":
                return _jsx(PainelPage, { userId: session.user.id, transacoes: transacoes });
            case "transacoes":
                return (_jsx(TransacoesPage, { userId: session.user.id, transacoes: transacoes, isLoading: isLoading, onRefresh: fetchTransacoes }));
            case "economias":
                return (_jsx(EconomiasPage, { userId: session.user.id, onRefreshGlobais: fetchTransacoes, saldoGlobal: saldoAtual }));
            default:
                return _jsx("div", { children: "Em constru\u00E7\u00E3o..." });
            case "categorias":
                return _jsx(CategoriasManager, { userId: session.user.id });
            case "relatorios":
                return _jsx(RelatoriosPage, { transacoes: transacoes });
            case "cartoes":
                return _jsx(CartoesPage, { userId: session.user.id, transacoes: transacoes });
            case "recorrentes":
                return _jsx(CompromissosPage, { userId: session.user.id });
        }
    };
    return (_jsx(SidebarLayout, { activeTab: activeTab, setActiveTab: setActiveTab, userEmail: session.user.email || "", onLogout: () => supabase.auth.signOut(), children: renderContent() }));
}
export default App;
