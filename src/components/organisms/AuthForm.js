import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
export function AuthForm() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error)
                    throw error;
            }
            else {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error)
                    throw error;
                setMessage('Cadastro realizado! Verifique seu email se necessário, ou faça login.');
            }
        }
        catch (error) {
            setMessage(error.message || 'Ocorreu um erro na autenticação.');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "w-full max-w-md bg-white rounded-xl shadow-md p-8 border border-slate-100", children: [_jsx("h2", { className: "text-2xl font-bold text-slate-800 mb-6", children: isLogin ? 'Entrar no FinanceApp' : 'Criar Conta' }), _jsxs("form", { onSubmit: handleAuth, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Email" }), _jsx("input", { type: "email", required: true, value: email, onChange: (e) => setEmail(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500", placeholder: "seu@email.com" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Senha" }), _jsx("input", { type: "password", required: true, value: password, onChange: (e) => setPassword(e.target.value), className: "w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" })] }), message && (_jsx("div", { className: "text-sm text-amber-600 bg-amber-50 p-2 rounded", children: message })), _jsx("button", { type: "submit", disabled: loading, className: "w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50", children: loading ? 'Aguarde...' : isLogin ? 'Entrar' : 'Cadastrar' })] }), _jsx("div", { className: "mt-6 text-center", children: _jsx("button", { type: "button", onClick: () => setIsLogin(!isLogin), className: "text-sm text-emerald-600 hover:underline", children: isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça login' }) })] }));
}
