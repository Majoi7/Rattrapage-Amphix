export interface Registration {
  id: string;
  created_at: string;
  fullname: string;
  phone: string;
  email?: string;
  university: string;
  field: string;
  level: string;
  subjects: string;
  pack: 'Pulse' | 'Private';
  total_sessions: number;
  selected_sessions: number;
  price_per_session: number;
  total_price: number;
  status: 'En attente' | 'Confirmé' | 'Payé' | 'Annulé';
  payment_received: number;
}

export interface DashboardStats {
  totalInscrits: number;
  pulseInscrits: number;
  privateInscrits: number;
  totalAttendu: number;
  totalPaye: number;
  totalRestant: number;
}

export interface FilterParams {
  searchQuery: string;
  dateRange: 'all' | 'today' | 'week' | 'month';
  pack: 'all' | 'Pulse' | 'Private';
  status: 'all' | 'En attente' | 'Confirmé' | 'Payé' | 'Annulé';
  subject: 'all' | string;
}
