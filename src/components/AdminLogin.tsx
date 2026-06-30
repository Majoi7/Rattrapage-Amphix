import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, Mail, Sparkles, Database, KeyRound, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AdminLoginProps {
  onLoginSuccess: (session: { email: string; isDemo: boolean }) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setIsLoading(true);

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          throw error;
        }

        if (data.user) {
          toast.success("Connexion réussie (Supabase)");
          onLoginSuccess({ email: data.user.email || email, isDemo: false });
        }
      } catch (error: any) {
        console.error('Supabase auth error:', error);
        toast.error(`Erreur d'authentification Supabase : ${error.message || 'Identifiants invalides'}`);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Local Simulation Mode
      setTimeout(() => {
        setIsLoading(false);
        // Let them login with admin credentials easily in the demo environment
        if (email.toLowerCase() === 'admin@amphix.ci' && password === 'admin') {
          toast.success("Connexion réussie (Mode Démo Administrateur)");
          onLoginSuccess({ email, isDemo: true });
        } else if (email && password) {
          // Be friendly: tell them they can use the default or accept standard admin logins for ease of use
          toast.info("Pour tester l'admin en mode démo, utilisez : admin@amphix.ci / admin. Connexion réussie par défaut !");
          onLoginSuccess({ email, isDemo: true });
        }
      }, 1000);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4" id="admin-login-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-2xl p-8 space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-[#007a5e] mb-2">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-semibold font-serif text-slate-900 tracking-tight flex items-center justify-center gap-2">
            Espace Professeur
            <Sparkles className="h-4 w-4 text-[#007a5e]" />
          </h2>
          <p className="text-xs text-slate-500">
            Identifiez-vous pour gérer les inscriptions de rattrapage.
          </p>
        </div>

        {/* Database Connection Info Status Badge */}
        <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs leading-relaxed ${
          isSupabaseConfigured 
            ? 'bg-emerald-50 border-emerald-200 text-[#007a5e]' 
            : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          {isSupabaseConfigured ? (
            <>
              <Database className="h-4 w-4 shrink-0 mt-0.5 text-[#007a5e]" />
              <div>
                <span className="font-semibold block">Supabase est configuré !</span>
                Utilisez vos identifiants d'administrateur Supabase réels.
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <span className="font-semibold block text-amber-900">Mode Démo Activé (Pas de clés)</span>
                Connectez-vous pour voir le tableau de bord :
                <div className="font-mono bg-amber-100/50 border border-amber-200 px-2.5 py-1.5 rounded-lg mt-1 text-amber-900 select-all">
                  Email : admin@amphix.ci<br />
                  Mot de passe : admin
                </div>
              </div>
            </>
          )}
        </div>

        <form onSubmit={handleLogin} className="space-y-4" id="login-form">
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Adresse Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@amphix.ci"
                className="w-full rounded-xl pl-11 pr-4 py-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#007a5e]/20 focus:border-[#007a5e] bg-slate-50 text-slate-800 text-sm h-11"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Mot de passe
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl pl-11 pr-4 py-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#007a5e]/20 focus:border-[#007a5e] bg-slate-50 text-slate-800 text-sm h-11"
                required
              />
            </div>
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            disabled={isLoading}
            className="w-full rounded-full py-3.5 bg-[#007a5e] hover:bg-[#005f48] text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Connexion en cours...
              </>
            ) : (
              "Se connecter"
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
