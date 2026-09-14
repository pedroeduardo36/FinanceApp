import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Wallet, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';

export function AuthForm() {
  const [notice, setNotice] = useState<string | null>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setNotice('Cadastro solicitado. Se necessário, confirme o email recebido antes de entrar.');
        setIsLogin(true);
      }
    } catch {
      setError('Não foi possível autenticar. Verifique seus dados ou a confirmação do email e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      {notice && <p role="status" className="p-3 text-emerald-800">{notice}</p>}
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mb-4">
            <Wallet size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">FinanceApp</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta gratuitamente.'}
          </p>
        </div>

        {error && (
          <div role="alert" className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 text-center border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label htmlFor="authform-field-0" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Email</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
              <input id="authform-field-0"
                type="email" autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="authform-field-1" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Senha</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
              <input id="authform-field-1"
                type="password" autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-700 hover:bg-emerald-700 text-white font-medium py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 mt-6 disabled:opacity-70"
          >
            {loading ? <><Loader2 size={20} className="animate-spin" /> Aguarde...</> : (
              <>
                {isLogin ? 'Entrar na Conta' : 'Criar Conta'} <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500">
            {isLogin ? "Ainda não tem uma conta?" : "Já possui uma conta?"}
          </p>
          <button
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            className="text-emerald-700 font-bold hover:text-emerald-700 transition-colors mt-1"
          >
            {isLogin ? 'Cadastre-se agora' : 'Faça login'}
          </button>
        </div>
      </div>
    </main>
  );
}
