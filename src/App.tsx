import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Transacao } from '@/types';

// Componentes de Template e Autenticação
import { SidebarLayout, TabId } from '@/components/templates/SidebarLayout';
import { AuthForm } from '@/components/organisms/AuthForm';

// Páginas Principais
import { PainelPage } from '@/pages/PainelPage';
import { TransacoesPage } from '@/pages/TransacoesPage';
import { CartoesPage } from '@/pages/CartoesPage';
import { CompromissosPage } from '@/pages/CompromissosPage';
import { EconomiasPage } from '@/pages/EconomiasPage';
import { RelatoriosPage } from '@/pages/RelatoriosPage';

// Organizadores
import { CategoriasManager } from '@/components/organisms/CategoriasManager';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('painel');
  
  // Estado global de transações (usado por várias páginas)
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [isLoadingTransacoes, setIsLoadingTransacoes] = useState(false);

  // Controle de Sessão (Login)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Busca as transações gerais do usuário
  const fetchTransacoes = async () => {
    if (!session?.user?.id) return;
    
    setIsLoadingTransacoes(true);
    const { data, error } = await supabase
      .from('transacoes')
      .select('*')
      .eq('user_id', session.user.id)
      .order('data_transacao', { ascending: false });

    if (!error && data) {
      setTransacoes(data);
    }
    setIsLoadingTransacoes(false);
  };

  // Recarrega os dados caso o usuário mude
  useEffect(() => {
    if (session?.user?.id) {
      fetchTransacoes();
    }
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Se não estiver logado, mostra a tela de login
  if (!session) {
    return <AuthForm />;
  }

  // Roteador Interno: Decide qual página renderizar baseado na aba ativa
  const renderContent = () => {
    switch (activeTab) {
      case 'painel':
        return <PainelPage transacoes={transacoes} />;
      case 'transacoes':
        return <TransacoesPage userId={session.user.id} transacoes={transacoes} isLoading={isLoadingTransacoes} onRefresh={fetchTransacoes} />;
      case 'cartoes':
        return <CartoesPage userId={session.user.id} transacoes={transacoes} />;
      case 'recorrentes':
        return <CompromissosPage userId={session.user.id} />;
      case 'economias':
        return <EconomiasPage userId={session.user.id} transacoes={transacoes} onRefreshTransacoes={fetchTransacoes} />;
      case 'relatorios':
        return <RelatoriosPage transacoes={transacoes} />;
      case 'categorias':
        return <CategoriasManager userId={session.user.id} />;
      default:
        return <PainelPage transacoes={transacoes} />;
    }
  };

  return (
    <SidebarLayout 
      activeTab={activeTab} 
      onTabChange={setActiveTab} 
      onLogout={handleLogout}
      userEmail={session.user.email}
    >
      {renderContent()}
    </SidebarLayout>
  );
}