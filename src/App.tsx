import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { SidebarLayout, type TabId } from '@/components/templates/SidebarLayout';
import { AuthForm } from '@/components/organisms/AuthForm';
import { Feedback } from '@/components/ui/Feedback';
import { useRows } from '@/hooks/useRows';

const PainelPage = lazy(() => import('@/pages/PainelPage').then(m => ({ default: m.PainelPage })));
const TransacoesPage = lazy(() => import('@/pages/TransacoesPage').then(m => ({ default: m.TransacoesPage })));
const CartoesPage = lazy(() => import('@/pages/CartoesPage').then(m => ({ default: m.CartoesPage })));
const CompromissosPage = lazy(() => import('@/pages/CompromissosPage').then(m => ({ default: m.CompromissosPage })));
const EconomiasPage = lazy(() => import('@/pages/EconomiasPage').then(m => ({ default: m.EconomiasPage })));
const OrcamentosPage = lazy(() => import('@/pages/OrcamentosPage').then(m => ({ default: m.OrcamentosPage })));
const RelatoriosPage = lazy(() => import('@/pages/RelatoriosPage').then(m => ({ default: m.RelatoriosPage })));
const CategoriasManager = lazy(() => import('@/components/organisms/CategoriasManager').then(m => ({ default: m.CategoriasManager })));
const tabs: TabId[] = ['painel', 'transacoes', 'cartoes', 'recorrentes', 'economias', 'orcamentos', 'relatorios', 'categorias'];
function currentTab(): TabId {
  return tabs.find(tab => `#${tab}` === window.location.hash) ?? 'painel';
}
function subscribeTab(listener: () => void) {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
}

function Conta({ session }: { session: Session }) {
  const userId = session.user.id;
  const { data: transacoes, loading, error, reload } = useRows('transacoes', userId);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const activeTab = useSyncExternalStore(subscribeTab, currentTab);
  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch { setLogoutError('Não foi possível sair. Tente novamente.'); }
  };
  const renderContent = () => {
    switch (activeTab) {
      case 'painel': return <PainelPage userId={userId} transacoes={transacoes} />;
      case 'transacoes': return <TransacoesPage userId={userId} transacoes={transacoes} isLoading={loading} onRefresh={reload} />;
      case 'cartoes': return <CartoesPage userId={userId} transacoes={transacoes} />;
      case 'recorrentes': return <CompromissosPage userId={userId} onRefreshTransacoes={reload} />;
      case 'economias': return <EconomiasPage userId={userId} transacoes={transacoes} onRefreshTransacoes={reload} />;
      case 'orcamentos': return <OrcamentosPage userId={userId} transacoes={transacoes} />;
      case 'relatorios': return <RelatoriosPage transacoes={transacoes} />;
      case 'categorias': return <CategoriasManager userId={userId} />;
    }
  };
  return <SidebarLayout activeTab={activeTab} onLogout={logout} userEmail={session.user.email}>
    <Feedback error={logoutError} />
    <Feedback error={error} retry={() => void reload()} />
    {loading ? <p role="status">Carregando dados da conta...</p> : !error &&
      <Suspense fallback={<p role="status">Carregando página...</p>}>{renderContent()}</Suspense>}
  </SidebarLayout>;
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    let eventReceived = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      eventReceived = true;
      if (active) { setSession(next); setError(null); }
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active || eventReceived) return;
      if (error) { setError('Não foi possível recuperar a sessão. Recarregue a página.'); setSession(null); }
      else setSession(data.session);
    }).catch(() => {
      if (active && !eventReceived) { setError('Não foi possível recuperar a sessão. Recarregue a página.'); setSession(null); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  if (session === undefined) return <main className="p-8" role="status">Verificando sessão...</main>;
  if (!session) return <><Feedback error={error} /><AuthForm /></>;
  // Trocar de identidade destrói todos os estados e consultas da conta anterior.
  return <Conta key={session.user.id} session={session} />;
}
