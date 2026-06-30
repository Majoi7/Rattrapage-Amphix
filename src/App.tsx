import React, { useState } from 'react';
import { QueryClient, QueryClientProvider, useMutation, useQueryClient } from '@tanstack/react-query';
import { Toaster, toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Shield, Compass, Check, Users, User, ArrowRight, Smartphone, 
  MessageSquare, GraduationCap, ChevronRight, Bookmark, HelpCircle, BookOpen, Star, CheckCircle2, Download
} from 'lucide-react';
import { isSupabaseConfigured } from './lib/supabase';
import { RegistrationForm } from './components/RegistrationForm';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { registrationService } from './services/registrationService';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppContent() {
  const queryClient = useQueryClient();
  const [currentTab, setCurrentTab] = useState<'home' | 'admin'>('home');
  const [selectedPack, setSelectedPack] = useState<'Pulse' | 'Private' | null>(null);
  const [adminSession, setAdminSession] = useState<{ email: string; isDemo: boolean } | null>(() => {
    // Check if session exists in localStorage for convenience during refreshing
    const stored = localStorage.getItem('amphix_admin_session');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });

  // Mutation to handle registration submission
  const createRegistrationMutation = useMutation({
    mutationFn: (data: any) => registrationService.createRegistration(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
    }
  });

  const handleOpenForm = (pack: 'Pulse' | 'Private') => {
    setSelectedPack(pack);
  };

  const handleCloseForm = () => {
    setSelectedPack(null);
  };

  const handleFormSubmit = async (formData: any) => {
    await createRegistrationMutation.mutateAsync(formData);
  };

  const handleLoginSuccess = (session: { email: string; isDemo: boolean }) => {
    setAdminSession(session);
    localStorage.setItem('amphix_admin_session', JSON.stringify(session));
  };

  const handleLogout = () => {
    setAdminSession(null);
    localStorage.removeItem('amphix_admin_session');
    toast.info("Déconnexion réussie");
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#f2fdf7] via-white to-[#f7fee7] text-slate-800 flex flex-col relative overflow-hidden selection:bg-emerald-600 selection:text-white" id="main-container">
      {/* Subtle brand grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(4,120,87,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(4,120,87,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      
      {/* Decorative ambient glowing emerald blobs */}
      <div className="absolute top-[-10%] right-[10%] w-[500px] h-[500px] bg-emerald-100/40 rounded-full filter blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[15%] left-[-5%] w-[400px] h-[400px] bg-teal-50/50 rounded-full filter blur-[100px] pointer-events-none" />

      {/* 1. Header Navigation Bar */}
      <nav className="sticky top-0 z-40 border-b border-emerald-950/5 bg-white/75 backdrop-blur-md px-4 sm:px-6 py-4" id="global-navbar">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button 
            id="logo-home-btn"
            onClick={() => setCurrentTab('home')} 
            className="flex items-center gap-2 group cursor-pointer"
          >
            <div className="h-9 w-9 rounded-xl bg-[#007a5e] flex items-center justify-center shadow-md shadow-emerald-700/10 group-hover:scale-105 transition-all">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div className="text-left flex items-center gap-2">
              <span className="text-xl font-serif font-semibold tracking-tight text-[#007a5e]">Amphix</span>
            </div>
          </button>

          {/* Desktop links exactly as in the mockup design image */}
          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => setCurrentTab('home')}
              className={`text-sm font-medium tracking-wide transition-colors cursor-pointer ${
                currentTab === 'home' ? 'text-[#007a5e] font-semibold' : 'text-slate-600 hover:text-[#007a5e]'
              }`}
            >
              Espace Étudiant
            </button>
            <button
              onClick={() => setCurrentTab('admin')}
              className={`text-sm font-medium tracking-wide transition-colors cursor-pointer ${
                currentTab === 'admin' ? 'text-[#007a5e] font-semibold' : 'text-slate-600 hover:text-[#007a5e]'
              }`}
            >
              Espace Professeur
            </button>
            <a href="#pricing-cards" className="text-sm font-medium text-slate-600 hover:text-[#007a5e] transition-colors">
              Programmes
            </a>
            <a href="#pricing-cards" className="text-sm font-medium text-slate-600 hover:text-[#007a5e] transition-colors">
              Tarifs
            </a>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="nous-contacter-btn"
              onClick={() => handleOpenForm('Pulse')}
              className="px-5 py-2.5 bg-[#007a5e] hover:bg-[#005f48] text-white text-sm font-medium rounded-full transition-all shadow-sm cursor-pointer"
            >
              Nous contacter
            </button>
            
            {/* Tiny secret administrative button */}
            <button
              id="nav-admin-btn"
              onClick={() => setCurrentTab(currentTab === 'admin' ? 'home' : 'admin')}
              className="p-2 rounded-lg text-slate-400 hover:text-[#007a5e] hover:bg-emerald-50 transition-colors"
              title="Portail Admin"
            >
              <Shield className="h-4 w-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* 2. Main Content Routing Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-12 relative z-10">
        <AnimatePresence mode="wait">
          {currentTab === 'home' ? (
            <motion.div
              key="home-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-16"
              id="home-view"
            >
              {/* Hero Presentation precisely matching the user design mockup */}
              <div className="text-center space-y-6 max-w-4xl mx-auto pt-6">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white border border-[#047857]/10 text-xs font-medium text-[#047857] mb-2 shadow-[0_2px_12px_rgba(4,120,87,0.03)]"
                >
                  <Sparkles className="h-4 w-4 text-[#007a5e]" />
                  La communauté d'étudiants qui réussissent
                </motion.div>
                
                <h1 className="text-5xl sm:text-7xl font-semibold font-serif text-slate-900 tracking-tight leading-[1.1] max-w-3xl mx-auto">
                  Ta réussite commence <span className="text-[#00966b] italic block sm:inline">maintenant</span>
                </h1>
                
                <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto font-sans leading-relaxed flex items-center justify-center gap-1">
                  Reprends tes cours de zéro avec <span className="text-[#007a5e] font-semibold">Amphix</span> <span className="text-slate-300 animate-pulse">|</span>
                </p>

                {/* 3 Status Badges below the subtitle */}
                <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-4 pb-4">
                  <div className="flex items-center gap-2 px-5 py-2.5 bg-white rounded-full border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] text-xs font-medium text-slate-700">
                    <Users className="h-4 w-4 text-slate-400" />
                    70% Présentiel
                  </div>
                  <div className="flex items-center gap-2 px-5 py-2.5 bg-white rounded-full border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] text-xs font-medium text-slate-700">
                    <Smartphone className="h-4 w-4 text-slate-400" />
                    30% En ligne (Meeting)
                  </div>
                  <div className="flex items-center gap-2 px-5 py-2.5 bg-white rounded-full border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] text-xs font-medium text-slate-700">
                    <CheckCircle2 className="h-4 w-4 text-[#007a5e]" />
                    Adapté à ton emploi du temps
                  </div>
                </div>

                {/* Two main call to actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                  <button
                    id="hero-enroll-now-btn"
                    onClick={() => handleOpenForm('Pulse')}
                    className="w-full sm:w-auto px-8 py-3.5 bg-[#00966b] hover:bg-[#007a5e] text-white font-semibold text-sm rounded-full transition-all shadow-lg shadow-emerald-800/10 hover:shadow-emerald-800/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Rejoindre maintenant
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <a
                    href="#pricing-cards"
                    className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-slate-50 text-[#007a5e] font-semibold text-sm rounded-full border border-[#00966b]/30 transition-all text-center flex items-center justify-center cursor-pointer"
                  >
                    Comment ça marche ?
                  </a>
                </div>
              </div>

              {/* Two Premium Card Layouts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto" id="pricing-cards">
                {/* 1. Pulse Plan Card */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="rounded-3xl p-8 bg-white border border-emerald-950/5 shadow-[0_4px_30px_rgba(4,120,87,0.02)] hover:shadow-[0_12px_40px_rgba(4,120,87,0.06)] hover:border-emerald-500/25 transition-all duration-300 relative flex flex-col justify-between overflow-hidden group"
                  id="pulse-card"
                >
                  {/* Accent bar at the top */}
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#00966b] to-emerald-700" />
                  
                  <div className="space-y-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-[#007a5e]/10 text-[#007a5e] uppercase tracking-wider">
                          Formule Standard
                        </span>
                        <h2 className="text-2xl font-semibold text-slate-950 font-serif mt-3">Amphix Pulse</h2>
                        <p className="text-xs text-slate-500 mt-1">Accompagnement public dynamique</p>
                      </div>
                      <div className="bg-emerald-50 p-3 rounded-2xl text-[#007a5e] border border-emerald-100">
                        <Users className="h-6 w-6" />
                      </div>
                    </div>

                    {/* Price structure */}
                    <div className="pt-4 border-t border-slate-100">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Tarif Forfaitaire</span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-4xl font-bold text-slate-900 font-mono">3 000</span>
                        <span className="text-lg font-bold text-[#007a5e] font-mono">FCFA</span>
                        <span className="text-xs text-slate-500 ml-1">/ pack complet</span>
                      </div>
                      <span className="text-xs text-emerald-600 font-semibold block mt-1.5">
                        Soit seulement 600 FCFA par séance !
                      </span>
                    </div>

                    {/* Sessions tag */}
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 font-medium">
                      <BookOpen className="h-4 w-4 text-[#007a5e] shrink-0" />
                      Nombre total de séances : <span className="font-bold text-slate-900 font-mono text-sm ml-1">5</span>
                    </div>

                    {/* Feature Lists */}
                    <ul className="space-y-3 pt-2 text-xs text-slate-600">
                      <li className="flex items-start gap-2.5">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Séances de révision interactives en petit groupe</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Annales d'examens corrigées et commentées</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Supports de cours synthétiques offerts</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Suivi des questions sur groupe WhatsApp dédié</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-8 mt-6 border-t border-slate-100">
                    <button
                      id="enroll-pulse-btn"
                      onClick={() => handleOpenForm('Pulse')}
                      className="w-full rounded-full py-3.5 bg-[#007a5e] hover:bg-[#005f48] text-white font-semibold text-sm tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      S'inscrire
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>

                {/* 2. Private Plan Card */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="rounded-3xl p-8 bg-white border border-emerald-950/5 shadow-[0_4px_30px_rgba(4,120,87,0.02)] hover:shadow-[0_12px_40px_rgba(4,120,87,0.06)] hover:border-emerald-500/25 transition-all duration-300 relative flex flex-col justify-between overflow-hidden group"
                  id="private-card"
                >
                  {/* Accent bar at the top */}
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-600 to-[#00966b]" />
                  
                  <div className="space-y-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-[#00966b]/10 text-[#00966b] uppercase tracking-wider">
                          Formule VIP
                        </span>
                        <h2 className="text-2xl font-semibold text-slate-950 font-serif mt-3">Amphix Private</h2>
                        <p className="text-xs text-slate-500 mt-1">Accompagnement individuel sur-mesure</p>
                      </div>
                      <div className="bg-emerald-50 p-3 rounded-2xl text-[#00966b] border border-emerald-100">
                        <User className="h-6 w-6" />
                      </div>
                    </div>

                    {/* Price structure */}
                    <div className="pt-4 border-t border-slate-100">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Tarif Forfaitaire</span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-4xl font-bold text-slate-900 font-mono">3 000</span>
                        <span className="text-lg font-bold text-[#00966b] font-mono">FCFA</span>
                        <span className="text-xs text-slate-500 ml-1">/ pack complet</span>
                      </div>
                      <span className="text-xs text-emerald-600 font-semibold block mt-1.5">
                        Soit 1000 FCFA par séance individuelle !
                      </span>
                    </div>

                    {/* Sessions tag */}
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 font-medium">
                      <BookOpen className="h-4 w-4 text-[#00966b] shrink-0" />
                      Nombre total de séances : <span className="font-bold text-slate-900 font-mono text-sm ml-1">3</span>
                    </div>

                    {/* Feature Lists */}
                    <ul className="space-y-3 pt-2 text-xs text-slate-600">
                      <li className="flex items-start gap-2.5">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Séances individuelles 1-to-1 avec enseignant dédié</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Planning ultra-flexible selon vos disponibilités</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Aide aux devoirs ciblée et méthodologie d'examen</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>Échanges prioritaires et hotline WhatsApp directe</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-8 mt-6 border-t border-slate-100">
                    <button
                      id="enroll-private-btn"
                      onClick={() => handleOpenForm('Private')}
                      className="w-full rounded-full py-3.5 bg-[#00966b] hover:bg-[#007a5e] text-white font-semibold text-sm tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      S'inscrire
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              </div>

              {/* Informative FAQ / Value Prop Section */}
              <div className="max-w-3xl mx-auto border-t border-slate-100 pt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div className="space-y-2">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 text-[#007a5e] flex items-center justify-center mx-auto border border-emerald-100">
                    <Star className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900">Méthodologie Prouvée</h4>
                  <p className="text-xs text-slate-500">Révisez l'essentiel avec des enseignants qualifiés ayant l'expérience des examens.</p>
                </div>
                <div className="space-y-2">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 text-[#007a5e] flex items-center justify-center mx-auto border border-emerald-100">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 font-sans">Suivi WhatsApp Continu</h4>
                  <p className="text-xs text-slate-500">Posez vos questions à tout moment de vos révisions pour un éclaircissement direct.</p>
                </div>
                <div className="space-y-2">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 text-[#007a5e] flex items-center justify-center mx-auto border border-emerald-100">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900">Facturation Transparente</h4>
                  <p className="text-xs text-slate-500">Pas de frais cachés. Le prix s'adapte précisément aux séances que vous réservez.</p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="admin-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              id="admin-view"
            >
              {adminSession ? (
                <AdminDashboard 
                  adminEmail={adminSession.email}
                  isDemo={adminSession.isDemo}
                  onLogout={handleLogout}
                />
              ) : (
                <AdminLogin onLoginSuccess={handleLoginSuccess} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 3. Global Footer */}
      <footer className="border-t border-slate-100 py-8 px-4 text-center mt-12 bg-white/40" id="global-footer">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Amphix. Tous droits réservés.</p>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setCurrentTab('home')} 
              className="hover:text-[#007a5e] transition-colors font-medium"
            >
              Espace Étudiant
            </button>
            <span>&bull;</span>
            <button 
              onClick={() => setCurrentTab('admin')} 
              className="hover:text-[#007a5e] transition-colors font-medium"
            >
              Espace Professeur
            </button>
          </div>
        </div>
      </footer>

      {/* Floating installer button exactly as in the design mockup */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => toast.success("L'application mobile Amphix s'installe sur votre appareil...")}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#007a5e] hover:bg-[#005f48] text-white text-xs font-semibold rounded-full shadow-lg shadow-emerald-900/15 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          id="floating-installer-btn"
        >
          <Download className="h-3.5 w-3.5" />
          Installer l'app
        </button>
      </div>

      {/* Enrollment Interactive Modal */}
      <RegistrationForm
        initialPack={selectedPack}
        isOpen={selectedPack !== null}
        onClose={handleCloseForm}
        onSubmitSuccess={handleFormSubmit}
      />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <Toaster position="top-right" richColors theme="light" />
    </QueryClientProvider>
  );
}
