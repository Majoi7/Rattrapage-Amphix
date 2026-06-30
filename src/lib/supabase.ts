import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

// Clean up placeholders
const isUrlValid = supabaseUrl && !supabaseUrl.includes('YOUR_') && !supabaseUrl.includes('VITE_SUPABASE_URL');
const isKeyValid = supabaseAnonKey && !supabaseAnonKey.includes('YOUR_') && !supabaseAnonKey.includes('VITE_SUPABASE_ANON_KEY');

export const isSupabaseConfigured = Boolean(isUrlValid && isKeyValid);

// Create real client if configured, otherwise null
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Initial high-quality mock data for the application in case Supabase is not configured
const INITIAL_MOCK_REGISTRATIONS = [
  {
    id: 'reg_1',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), // 2 hours ago
    fullname: 'Koffi Kouamé Jean',
    phone: '+225 0707123456',
    email: 'koffi.jean@univ-cocody.ci',
    university: 'Université Félix Houphouët-Boigny',
    field: 'Sciences Économiques',
    level: 'Licence 2',
    subjects: 'Microéconomie, Statistiques descriptives',
    pack: 'Pulse' as const,
    total_sessions: 5,
    selected_sessions: 4,
    price_per_session: 600,
    total_price: 2400,
    status: 'Payé' as const,
    payment_received: 2400
  },
  {
    id: 'reg_2',
    created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(), // Yesterday
    fullname: 'Marie-Laure Kone',
    phone: '+225 0505987654',
    email: 'marielaure@polytechnique.edu',
    university: 'INPHB Yamoussoukro',
    field: 'Classes Préparatoires',
    level: 'Année 1',
    subjects: 'Analyse Mathématique, Algèbre Linéaire',
    pack: 'Private' as const,
    total_sessions: 3,
    selected_sessions: 3,
    price_per_session: 1000,
    total_price: 3000,
    status: 'Confirmé' as const,
    payment_received: 0
  },
  {
    id: 'reg_3',
    created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(), // 3 days ago
    fullname: 'Aman Yao Junior',
    phone: '+225 0101445566',
    email: 'aman.yao@esatic.ci',
    university: 'ESATIC',
    field: 'Génie Logiciel',
    level: 'Licence 3',
    subjects: 'Algorithmique complexe, Base de données',
    pack: 'Pulse' as const,
    total_sessions: 5,
    selected_sessions: 5,
    price_per_session: 600,
    total_price: 3000,
    status: 'En attente' as const,
    payment_received: 0
  },
  {
    id: 'reg_4',
    created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), // 5 days ago
    fullname: 'Fatoumata Coulibaly',
    phone: '+225 0709887766',
    email: '',
    university: 'Université Nangui Abrogoua',
    field: 'Biologie',
    level: 'Licence 1',
    subjects: 'Chimie Organique',
    pack: 'Private' as const,
    total_sessions: 3,
    selected_sessions: 2,
    price_per_session: 1000,
    total_price: 2000,
    status: 'Annulé' as const,
    payment_received: 0
  }
];

// Helper to interact with Mock database (localStorage)
export const mockDb = {
  getRegistrations: () => {
    const data = localStorage.getItem('amphix_registrations');
    if (!data) {
      localStorage.setItem('amphix_registrations', JSON.stringify(INITIAL_MOCK_REGISTRATIONS));
      return INITIAL_MOCK_REGISTRATIONS;
    }
    try {
      return JSON.parse(data);
    } catch {
      return INITIAL_MOCK_REGISTRATIONS;
    }
  },
  saveRegistrations: (regs: any[]) => {
    localStorage.setItem('amphix_registrations', JSON.stringify(regs));
  }
};
