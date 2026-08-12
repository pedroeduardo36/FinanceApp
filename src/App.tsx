import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { AuthForm } from "@/components/organisms/AuthForm";
import { SidebarLayout, TabId } from "@/components/templates/SidebarLayout";
import { Transacao } from "@/types";

// Páginas
import { PainelPage } from "@/pages/PainelPage";
import { CompromissosPage } from "@/pages/CompromissosPage";
import { CartoesPage } from "@/pages/CartoesPage";
import { RelatoriosPage } from "@/pages/RelatoriosPage";
import { TransacoesPage } from "@/pages/TransacoesPage";
import { EconomiasPage } from "@/pages/EconomiasPage";
import { CategoriasManager } from "@/components/organisms/CategoriasManager";

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("painel");

  // Estado Global das Transações para calcular Saldo Geral
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => setSession(session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) =>
      setSession(session),
    );
    return () => subscription.unsubscribe();
  }, []);

  const fetchTransacoes = useCallback(async () => {
    if (!session?.user.id) return;
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
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <AuthForm />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "painel":
        return <PainelPage userId={session.user.id} transacoes={transacoes} />;
      case "transacoes":
        return (
          <TransacoesPage
            userId={session.user.id}
            transacoes={transacoes}
            isLoading={isLoading}
            onRefresh={fetchTransacoes}
          />
        );
      case "economias":
        return (
          <EconomiasPage
            userId={session.user.id}
            onRefreshGlobais={fetchTransacoes}
            saldoGlobal={saldoAtual}
          />
        );
      default:
        return <div>Em construção...</div>;
      case "categorias":
        return <CategoriasManager userId={session.user.id} />;
      case "relatorios":
        return <RelatoriosPage transacoes={transacoes} />;
      case "cartoes":
        return <CartoesPage userId={session.user.id} transacoes={transacoes} />;
      case "recorrentes":
        return <CompromissosPage userId={session.user.id} />;
    }
  };

  return (
    <SidebarLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      userEmail={session.user.email || ""}
      onLogout={() => supabase.auth.signOut()}
    >
      {renderContent()}
    </SidebarLayout>
  );
}

export default App;
