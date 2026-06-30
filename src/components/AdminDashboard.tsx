import React, { useState, useTransition } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Sparkles, Database, Search, Filter, Download, Trash2, Edit, LogOut, 
  Calendar, CreditCard, PiggyBank, RefreshCw, Check, X, PhoneCall, Mail, GraduationCap,
  TrendingUp, AlertTriangle, ChevronDown, CheckCircle2, MapPin, BadgePercent
} from 'lucide-react';
import { toast } from 'sonner';
import { registrationService } from '../services/registrationService';
import { isSupabaseConfigured } from '../lib/supabase';
import { Registration, FilterParams } from '../types';

interface AdminDashboardProps {
  adminEmail: string;
  isDemo: boolean;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ adminEmail, isDemo, onLogout }) => {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Filters State
  const [filters, setFilters] = useState<FilterParams>({
    searchQuery: '',
    dateRange: 'all',
    pack: 'all',
    status: 'all',
    subject: 'all'
  });

  // Action modals states
  const [editingReg, setEditingReg] = useState<Registration | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [quickStatusMenuId, setQuickStatusMenuId] = useState<string | null>(null);

  // TanStack Query to fetch data
  const { data: registrations = [], isLoading, isRefetching, refetch } = useQuery<Registration[]>({
    queryKey: ['registrations'],
    queryFn: () => registrationService.getRegistrations(),
    initialData: []
  });

  // Mutations
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Registration> }) => 
      registrationService.updateRegistration(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      toast.success("Mise à jour effectuée !");
      setEditingReg(null);
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => registrationService.deleteRegistration(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      toast.success("Inscription supprimée");
      setConfirmDeleteId(null);
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    }
  });

  // Filter & Search Logic
  const filteredRegistrations = registrations.filter(reg => {
    // 1. Search Query
    const searchLower = filters.searchQuery.toLowerCase();
    const matchesSearch = 
      reg.fullname.toLowerCase().includes(searchLower) ||
      reg.phone.includes(filters.searchQuery) ||
      reg.university.toLowerCase().includes(searchLower) ||
      reg.field.toLowerCase().includes(searchLower);

    // 2. Pack Filter
    const matchesPack = filters.pack === 'all' || reg.pack === filters.pack;

    // 3. Status Filter
    const matchesStatus = filters.status === 'all' || reg.status === filters.status;

    // 4. Date Filter
    let matchesDate = true;
    const regDate = new Date(reg.created_at);
    const now = new Date();
    
    if (filters.dateRange === 'today') {
      matchesDate = regDate.toDateString() === now.toDateString();
    } else if (filters.dateRange === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      matchesDate = regDate >= oneWeekAgo;
    } else if (filters.dateRange === 'month') {
      matchesDate = regDate.getMonth() === now.getMonth() && regDate.getFullYear() === now.getFullYear();
    }

    // 5. Subject Filter
    const matchesSubject = filters.subject === 'all' || 
      (reg.subjects && reg.subjects.toLowerCase().includes(filters.subject.toLowerCase()));

    return matchesSearch && matchesPack && matchesStatus && matchesDate && matchesSubject;
  });

  // Calculate Dashboard metrics dynamically
  const stats = registrationService.computeStats(filteredRegistrations);
  const isFilteredActive = filters.searchQuery !== '' || filters.dateRange !== 'all' || filters.pack !== 'all' || filters.status !== 'all' || filters.subject !== 'all';

  // Quick Status change helper
  const handleStatusChange = (id: string, newStatus: Registration['status']) => {
    updateMutation.mutate({ id, updates: { status: newStatus } });
    setQuickStatusMenuId(null);
  };

  // Export to CSV / Excel
  const handleExportExcel = () => {
    if (filteredRegistrations.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    const headers = [
      'ID', 'Date Inscription', 'Nom Complet', 'Téléphone WhatsApp', 'Email', 
      'Université', 'Filière', 'Niveau', 'Matières à préparer', 'Pack', 
      'Séances Totales', 'Séances Demandées', 'Prix unitaire (FCFA)', 
      'Montant Total (FCFA)', 'Montant Payé (FCFA)', 'Statut'
    ];
    
    const csvRows = [headers.join(';')];
    
    filteredRegistrations.forEach(reg => {
      const row = [
        reg.id,
        new Date(reg.created_at).toLocaleDateString('fr-FR'),
        reg.fullname.replace(/;/g, ','),
        reg.phone,
        reg.email || '',
        reg.university.replace(/;/g, ','),
        reg.field.replace(/;/g, ','),
        reg.level,
        reg.subjects.replace(/[\n\r]/g, ' ').replace(/;/g, ','),
        reg.pack,
        reg.total_sessions,
        reg.selected_sessions,
        reg.price_per_session,
        reg.total_price,
        reg.status === 'Payé' ? reg.total_price : reg.payment_received,
        reg.status
      ];
      csvRows.push(row.join(';'));
    });
    
    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `amphix_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Fichier Excel (CSV) téléchargé !");
  };

  // Export to Landscape PDF
  const handleExportPDF = () => {
    if (filteredRegistrations.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Veuillez autoriser les popups pour générer le rapport PDF.");
      return;
    }
    
    const registrationsHtml = filteredRegistrations.map((reg, index) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px; font-size: 11px; text-align: center;">${index + 1}</td>
        <td style="padding: 10px; font-size: 11px; font-weight: bold; color: #0f172a;">${reg.fullname}</td>
        <td style="padding: 10px; font-size: 11px; font-family: monospace;">${reg.phone}</td>
        <td style="padding: 10px; font-size: 11px; color: #334155;">
          ${reg.university}<br/>
          <small style="color: #64748b;">${reg.field} - ${reg.level}</small>
        </td>
        <td style="padding: 10px; font-size: 11px; font-weight: bold; color: ${reg.pack === 'Pulse' ? '#2563eb' : '#7c3aed'};">${reg.pack}</td>
        <td style="padding: 10px; font-size: 11px; text-align: center; font-weight: 600;">${reg.selected_sessions}/${reg.total_sessions}</td>
        <td style="padding: 10px; font-size: 11px; font-weight: bold; text-align: right; font-family: monospace;">${reg.total_price.toLocaleString('fr-FR')} FCFA</td>
        <td style="padding: 10px; font-size: 11px; text-align: center;">
          <span style="padding: 4px 8px; border-radius: 9999px; font-size: 9px; font-weight: bold; display: inline-block;
            background-color: ${
              reg.status === 'Payé' ? '#dcfce7; color: #15803d;' :
              reg.status === 'Confirmé' ? '#dbeafe; color: #1d4ed8;' :
              reg.status === 'En attente' ? '#fef3c7; color: #b45309;' :
              '#fee2e2; color: #b91c1c;'
            }">
            ${reg.status}
          </span>
        </td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Rapport Inscriptions Amphix Rattrapage</title>
          <style>
            @page { size: A4 landscape; margin: 1.5cm; }
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; line-height: 1.4; }
            .header-table { width: 100%; border-collapse: collapse; border-bottom: 3px solid #2563eb; padding-bottom: 15px; margin-bottom: 25px; }
            .title { font-size: 24px; font-weight: bold; color: #0f172a; margin: 0; }
            .subtitle { font-size: 12px; color: #64748b; margin: 5px 0 0 0; }
            .stats-container { display: flex; gap: 15px; margin-bottom: 25px; }
            .stat-box { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 15px; }
            .stat-lbl { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; }
            .stat-val { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 4px; font-family: monospace; }
            table.data { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background: #f1f5f9; text-align: left; padding: 10px; font-size: 10px; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1; }
            .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 10px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <h1 class="title">AMPHIX RATTRAPAGE</h1>
                <p class="subtitle">Rapport d'Inscriptions et Tableau de Suivi Financier</p>
              </td>
              <td style="text-align: right; font-size: 11px;">
                <p style="margin: 0; font-weight: bold;">Date : ${new Date().toLocaleDateString('fr-FR')}</p>
                <p style="margin: 5px 0 0 0; color: #64748b;">Administrateur : ${adminEmail}</p>
                <p style="margin: 3px 0 0 0; color: #2563eb; font-weight: bold;">Inscrits listés : ${filteredRegistrations.length}</p>
              </td>
            </tr>
          </table>

          <div class="stats-container">
            <div class="stat-box">
              <div class="stat-lbl">Inscrits</div>
              <div class="stat-val">${stats.totalInscrits}</div>
            </div>
            <div class="stat-box">
              <div class="stat-lbl">Attendu</div>
              <div class="stat-val">${stats.totalAttendu.toLocaleString('fr-FR')} FCFA</div>
            </div>
            <div class="stat-box">
              <div class="stat-lbl">Encaissé</div>
              <div class="stat-val" style="color: #16a34a;">${stats.totalPaye.toLocaleString('fr-FR')} FCFA</div>
            </div>
            <div class="stat-box">
              <div class="stat-lbl">Restant à Percevoir</div>
              <div class="stat-val" style="color: #dc2626;">${stats.totalRestant.toLocaleString('fr-FR')} FCFA</div>
            </div>
          </div>

          <table class="data">
            <thead>
              <tr>
                <th style="width: 4%; text-align: center;">N°</th>
                <th style="width: 22%;">Étudiant</th>
                <th style="width: 13%;">WhatsApp</th>
                <th style="width: 26%;">Université / Profil</th>
                <th style="width: 8%;">Formule</th>
                <th style="width: 8%; text-align: center;">Séances</th>
                <th style="width: 11%; text-align: right;">Tarif</th>
                <th style="width: 8%; text-align: center;">Statut</th>
              </tr>
            </thead>
            <tbody>
              ${registrationsHtml}
            </tbody>
          </table>

          <div class="footer">
            <div>Document administratif officiel — Plateforme de rattrapage Amphix</div>
            <div>Signature de l'organisateur : _________________________</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    toast.success("Rapport PDF généré !");
  };

  const handleUpdateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingReg) return;

    const formData = new FormData(e.currentTarget);
    const updates: Partial<Registration> = {
      fullname: formData.get('fullname') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string || '',
      university: formData.get('university') as string,
      field: formData.get('field') as string,
      level: formData.get('level') as string,
      subjects: formData.get('subjects') as string,
      status: formData.get('status') as Registration['status'],
      selected_sessions: Number(formData.get('selected_sessions')),
    };

    // Recalculate price
    const pricePerSession = editingReg.pack === 'Pulse' ? 600 : 1000;
    updates.price_per_session = pricePerSession;
    updates.total_price = Number(updates.selected_sessions) * pricePerSession;

    // Sync payment if 'Payé'
    if (updates.status === 'Payé') {
      updates.payment_received = updates.total_price;
    } else if (updates.status === 'En attente' || updates.status === 'Annulé') {
      updates.payment_received = 0;
    } else {
      updates.payment_received = Number(formData.get('payment_received')) || 0;
    }

    updateMutation.mutate({ id: editingReg.id, updates });
  };

  return (
    <div className="space-y-8" id="admin-dashboard-view">
      {/* Upper Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#007a5e]/10 text-[#007a5e]">
              Admin
            </span>
            <h2 className="text-xl font-semibold text-slate-900 font-serif">Espace de Gestion</h2>
          </div>
          <p className="text-xs text-slate-500">
            Connecté en tant que : <span className="font-mono text-[#007a5e] font-semibold">{adminEmail}</span>
            {isDemo && " (Mode Démo)"}
          </p>
        </div>

        {/* Database connection badge & log out */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className={`px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 border ${
            isSupabaseConfigured 
              ? 'bg-emerald-50 border-emerald-200 text-[#007a5e]' 
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            <Database className="h-3.5 w-3.5" />
            <span className="font-medium">
              {isSupabaseConfigured ? "Supabase Live" : "Démo Local"}
            </span>
          </div>

          <button
            id="logout-btn"
            onClick={onLogout}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Déconnexion
          </button>
        </div>
      </div>

      {/* 1. Statistics Cards Block */}
      <div className="space-y-2">
        {isFilteredActive && (
          <div className="flex items-center gap-2 text-xs text-[#007a5e] bg-emerald-50/50 border border-emerald-100/60 px-3 py-1.5 rounded-xl w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-[#007a5e] animate-pulse" />
            <span>Chiffres filtrés actifs ({filteredRegistrations.length} dossier{filteredRegistrations.length > 1 ? 's' : ''} affiché{filteredRegistrations.length > 1 ? 's' : ''})</span>
          </div>
        )}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4" id="dashboard-stats-grid">
        {/* Total Registered */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Inscrits</span>
            <Users className="h-5 w-5 text-[#007a5e]" />
          </div>
          <div>
            <h4 className="text-2xl font-bold font-mono text-slate-950 leading-none">
              {stats.totalInscrits}
            </h4>
            <span className="text-[10px] text-slate-500 mt-1.5 block">étudiants au total</span>
          </div>
        </div>

        {/* Pulse counts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#007a5e] tracking-wider">Pulse (Public)</span>
            <Sparkles className="h-5 w-5 text-[#007a5e]" />
          </div>
          <div>
            <h4 className="text-2xl font-bold font-mono text-[#007a5e] leading-none">
              {stats.pulseInscrits}
            </h4>
            <span className="text-[10px] text-slate-500 mt-1.5 block">accompagnements</span>
          </div>
        </div>

        {/* Private counts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#00966b] tracking-wider">Private (Indiv)</span>
            <TrendingUp className="h-5 w-5 text-[#00966b]" />
          </div>
          <div>
            <h4 className="text-2xl font-bold font-mono text-[#00966b] leading-none">
              {stats.privateInscrits}
            </h4>
            <span className="text-[10px] text-slate-500 mt-1.5 block">cours particuliers</span>
          </div>
        </div>

        {/* Expected financial volume */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Volume Attendu</span>
            <Calendar className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h4 className="text-xl font-bold font-mono text-slate-900 leading-none truncate">
              {stats.totalAttendu.toLocaleString('fr-FR')}
            </h4>
            <span className="text-[10px] text-emerald-600 font-bold mt-1.5 block">FCFA</span>
          </div>
        </div>

        {/* Total Paid */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Revenus Encaissés</span>
            <PiggyBank className="h-5 w-5 text-emerald-700" />
          </div>
          <div>
            <h4 className="text-xl font-bold font-mono text-[#007a5e] leading-none truncate">
              {stats.totalPaye.toLocaleString('fr-FR')}
            </h4>
            <span className="text-[10px] text-slate-500 mt-1.5 block">FCFA perçus</span>
          </div>
        </div>

        {/* Outstanding Balance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-red-600 tracking-wider">Reste à Percevoir</span>
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h4 className="text-xl font-bold font-mono text-red-600 leading-none truncate">
              {stats.totalRestant.toLocaleString('fr-FR')}
            </h4>
            <span className="text-[10px] text-slate-500 mt-1.5 block">FCFA restants</span>
          </div>
        </div>
      </div>
    </div>

      {/* 2. Interactive Search & Filters Control Panel */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4" id="filters-panel">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Search bar */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              id="search-input"
              type="text"
              value={filters.searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                startTransition(() => {
                  setFilters(prev => ({ ...prev, searchQuery: val }));
                });
              }}
              placeholder="Rechercher par nom, téléphone, université, filière..."
              className="w-full rounded-xl pl-11 pr-4 py-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#007a5e]/20 focus:border-[#007a5e] bg-slate-50 text-slate-800 text-sm h-11"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 justify-end">
            <button
              id="refresh-data-btn"
              onClick={() => {
                refetch();
                toast.success("Registre actualisé !");
              }}
              className={`p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all cursor-pointer ${
                isLoading || isRefetching ? 'animate-spin text-[#007a5e]' : ''
              }`}
              title="Actualiser les données"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            <button
              id="export-excel-btn"
              onClick={handleExportExcel}
              className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="h-4 w-4 text-emerald-600" />
              Exporter Excel
            </button>

            <button
              id="export-pdf-btn"
              onClick={handleExportPDF}
              className="px-4 py-3 rounded-xl bg-[#007a5e]/10 border border-[#007a5e]/20 text-xs font-semibold text-[#007a5e] hover:bg-[#007a5e]/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              Imprimer PDF
            </button>
          </div>
        </div>

        {/* Grid Filters */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
          {/* Date Selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Période d'inscription</label>
            <select
              id="filter-date"
              value={filters.dateRange}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
              className="w-full rounded-xl px-3 py-2 bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#007a5e]/20 focus:border-[#007a5e] h-10"
            >
              <option value="all">Toutes les dates</option>
              <option value="today">Aujourd'hui</option>
              <option value="week">7 derniers jours</option>
              <option value="month">Ce mois</option>
            </select>
          </div>

          {/* Pack Selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Formule / Pack</label>
            <select
              id="filter-pack"
              value={filters.pack}
              onChange={(e) => setFilters(prev => ({ ...prev, pack: e.target.value as any }))}
              className="w-full rounded-xl px-3 py-2 bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#007a5e]/20 focus:border-[#007a5e] h-10"
            >
              <option value="all">Toutes les formules</option>
              <option value="Pulse">Amphix Pulse (Public)</option>
              <option value="Private">Amphix Private (Individuel)</option>
            </select>
          </div>

          {/* Status Selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Statut de dossier</label>
            <select
              id="filter-status"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
              className="w-full rounded-xl px-3 py-2 bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#007a5e]/20 focus:border-[#007a5e] h-10"
            >
              <option value="all">Tous les statuts</option>
              <option value="En attente">En attente</option>
              <option value="Confirmé">Confirmé</option>
              <option value="Payé">Payé</option>
              <option value="Annulé">Annulé</option>
            </select>
          </div>

          {/* Subject Selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tri par matière</label>
            <select
              id="filter-subject"
              value={filters.subject}
              onChange={(e) => setFilters(prev => ({ ...prev, subject: e.target.value }))}
              className="w-full rounded-xl px-3 py-2 bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#007a5e]/20 focus:border-[#007a5e] h-10"
            >
              <option value="all">Toutes les matières</option>
              <option value="Administration Windows / Linux">Windows / Linux</option>
              <option value="Équations différentielles, suites et séries numériques">Éq. Diff / Suites / Séries</option>
              <option value="SQL">SQL</option>
              <option value="Algèbre relationnelle">Algèbre relationnelle</option>
              <option value="Python">Python</option>
              <option value="Recherche opérationnelle">Recherche opérationnelle</option>
            </select>
          </div>

          {/* Clean filters reset */}
          <div className="flex items-end col-span-2 md:col-span-1">
            <button
              id="reset-filters-btn"
              onClick={() => setFilters({ searchQuery: '', dateRange: 'all', pack: 'all', status: 'all', subject: 'all' })}
              className="w-full py-2 rounded-xl border border-dashed border-slate-200 hover:border-slate-300 text-xs text-slate-500 hover:text-slate-800 bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer h-10 font-medium"
            >
              Réinitialiser les filtres
            </button>
          </div>
        </div>
      </div>

      {/* 3. Registrations Grid / Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <svg className="animate-spin h-8 w-8 text-[#007a5e]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-sm text-slate-500">Chargement des dossiers d'inscription...</p>
          </div>
        ) : filteredRegistrations.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="inline-flex p-4 rounded-full bg-slate-50 border border-slate-100 text-slate-400">
              <Users className="h-6 w-6" />
            </div>
            <h4 className="text-base font-semibold text-slate-900 font-serif">Aucun dossier trouvé</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Aucun dossier ne correspond à vos critères de recherche ou filtres de date.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="registrations-table">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date / Étudiant</th>
                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Profil Universitaire</th>
                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Pack & Séances</th>
                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Montant</th>
                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Statut</th>
                  <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-transparent">
                <AnimatePresence mode="popLayout">
                  {filteredRegistrations.map((reg) => (
                    <motion.tr
                      key={reg.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-slate-50/50 transition-all group"
                    >
                      {/* 1. Date & Student */}
                      <td className="px-5 py-4.5 space-y-1 max-w-[220px]">
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {new Date(reg.created_at).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <h4 className="text-sm font-semibold text-slate-900 group-hover:text-[#007a5e] transition-colors truncate">
                          {reg.fullname}
                        </h4>
                        <div className="flex flex-col gap-1 pt-1">
                          <a
                            href={`https://wa.me/${reg.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-[#007a5e] hover:underline font-semibold"
                          >
                            <PhoneCall className="h-3 w-3" />
                            {reg.phone}
                          </a>
                          {reg.email && (
                            <span className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                              <Mail className="h-3 w-3 shrink-0" />
                              {reg.email}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. University Profile */}
                      <td className="px-5 py-4.5 space-y-1 max-w-[240px]">
                        <div className="flex items-center gap-1.5 text-xs text-slate-800">
                          <GraduationCap className="h-3.5 w-3.5 text-[#007a5e] shrink-0" />
                          <span className="font-semibold truncate">{reg.university}</span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                          {reg.field} &bull; <span className="text-slate-700 font-semibold">{reg.level}</span>
                        </p>
                        <div className="text-[11px] text-slate-500 italic bg-slate-50 p-1.5 rounded border border-slate-100 truncate max-w-[220px]" title={reg.subjects}>
                          Sujet: {reg.subjects}
                        </div>
                      </td>

                      {/* 3. Pack & Sessions */}
                      <td className="px-5 py-4.5 space-y-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase inline-block ${
                          reg.pack === 'Pulse'
                            ? 'bg-emerald-50 border border-emerald-100 text-[#007a5e]'
                            : 'bg-emerald-100/50 border border-emerald-200 text-[#007a5e]'
                        }`}>
                          {reg.pack}
                        </span>
                        <div className="text-xs font-semibold text-slate-800">
                          {reg.selected_sessions} / {reg.total_sessions} séances
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          ({reg.price_per_session} FCFA/u)
                        </span>
                      </td>

                      {/* 4. Financial total */}
                      <td className="px-5 py-4.5 text-right space-y-1">
                        <div className="text-sm font-semibold text-slate-900 font-mono">
                          {reg.total_price.toLocaleString('fr-FR')} <span className="text-[10px] text-slate-500">FCFA</span>
                        </div>
                        {reg.status === 'Payé' ? (
                          <span className="text-[10px] text-[#007a5e] font-semibold flex items-center gap-1 justify-end">
                            <Check className="h-3 w-3" /> Solde réglé
                          </span>
                        ) : reg.payment_received > 0 ? (
                          <div className="text-[10px] space-y-0.5">
                            <p className="text-emerald-700 font-medium">Reçu: {reg.payment_received.toLocaleString('fr-FR')} F</p>
                            <p className="text-red-600 font-medium">Reste: {(reg.total_price - reg.payment_received).toLocaleString('fr-FR')} F</p>
                          </div>
                        ) : (
                          <span className="text-[10px] text-amber-600 font-medium block">
                            Non payé
                          </span>
                        )}
                      </td>

                      {/* 5. Colored Status badge with dropdown trigger */}
                      <td className="px-5 py-4.5 text-center relative">
                        <button
                          id={`status-dropdown-${reg.id}`}
                          onClick={() => setQuickStatusMenuId(quickStatusMenuId === reg.id ? null : reg.id)}
                          className={`px-3 py-1 rounded-full text-[11px] font-semibold cursor-pointer hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-1.5 ${
                            reg.status === 'Payé' ? 'bg-emerald-50 text-[#007a5e] border border-emerald-100' :
                            reg.status === 'Confirmé' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                            reg.status === 'En attente' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            'bg-red-50 text-red-700 border border-red-100'
                          }`}
                        >
                          {reg.status}
                          <ChevronDown className="h-3 w-3 opacity-60" />
                        </button>

                        {/* Quick Status Menu overlay */}
                        {quickStatusMenuId === reg.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setQuickStatusMenuId(null)} />
                            <div className="absolute right-1/2 translate-x-1/2 top-12 z-20 w-32 rounded-xl bg-white border border-slate-100 p-1.5 shadow-xl">
                              {(['En attente', 'Confirmé', 'Payé', 'Annulé'] as const).map((st) => (
                                <button
                                  key={st}
                                  id={`set-status-${st}-${reg.id}`}
                                  onClick={() => handleStatusChange(reg.id, st)}
                                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors hover:bg-slate-50 ${
                                    reg.status === st ? 'text-[#007a5e] font-bold bg-emerald-50/50' : 'text-slate-600'
                                  }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </td>

                      {/* 6. Edit / Delete Row actions */}
                      <td className="px-5 py-4.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            id={`edit-reg-${reg.id}`}
                            onClick={() => setEditingReg(reg)}
                            className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:text-[#007a5e] hover:bg-slate-100 transition-colors cursor-pointer border border-slate-100"
                            title="Modifier le dossier"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            id={`delete-reg-${reg.id}`}
                            onClick={() => setConfirmDeleteId(reg.id)}
                            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer border border-red-100"
                            title="Supprimer l'inscription"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Beautiful Full-featured Registration Edit Modal */}
      <AnimatePresence>
        {editingReg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setEditingReg(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-white text-slate-800 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] z-10"
              id="edit-modal-container"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 font-serif">
                  <Edit className="h-4 w-4 text-[#007a5e]" />
                  Modifier le dossier : {editingReg.fullname}
                </h3>
                <button
                  id="close-edit-modal"
                  onClick={() => setEditingReg(null)}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateSubmit} className="flex-1 overflow-y-auto p-6 space-y-4" id="edit-form">
                <div className="grid grid-cols-2 gap-4">
                  {/* Fullname */}
                  <div className="col-span-2">
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Nom complet</label>
                    <input
                      id="edit-fullname"
                      type="text"
                      name="fullname"
                      defaultValue={editingReg.fullname}
                      className="w-full rounded-xl px-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#007a5e]/20 focus:border-[#007a5e] bg-slate-50 text-slate-800 text-sm"
                      required
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">WhatsApp</label>
                    <input
                      id="edit-phone"
                      type="text"
                      name="phone"
                      defaultValue={editingReg.phone}
                      className="w-full rounded-xl px-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#007a5e]/20 focus:border-[#007a5e] bg-slate-50 text-slate-800 text-sm font-mono"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Email</label>
                    <input
                      id="edit-email"
                      type="email"
                      name="email"
                      defaultValue={editingReg.email || ''}
                      className="w-full rounded-xl px-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#007a5e]/20 focus:border-[#007a5e] bg-slate-50 text-slate-800 text-sm"
                    />
                  </div>

                  {/* University */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Université</label>
                    <input
                      id="edit-university"
                      type="text"
                      name="university"
                      defaultValue={editingReg.university}
                      className="w-full rounded-xl px-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#007a5e]/20 focus:border-[#007a5e] bg-slate-50 text-slate-800 text-sm"
                      required
                    />
                  </div>

                  {/* Field */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Filière</label>
                    <input
                      id="edit-field"
                      type="text"
                      name="field"
                      defaultValue={editingReg.field}
                      className="w-full rounded-xl px-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#007a5e]/20 focus:border-[#007a5e] bg-slate-50 text-slate-800 text-sm"
                      required
                    />
                  </div>

                  {/* Level */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Niveau</label>
                    <input
                      id="edit-level"
                      type="text"
                      name="level"
                      defaultValue={editingReg.level}
                      className="w-full rounded-xl px-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#007a5e]/20 focus:border-[#007a5e] bg-slate-50 text-slate-800 text-sm"
                      required
                    />
                  </div>

                  {/* Sessions count */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">
                      Séances ({editingReg.pack})
                    </label>
                    <input
                      id="edit-sessions"
                      type="number"
                      name="selected_sessions"
                      min={1}
                      max={editingReg.pack === 'Pulse' ? 5 : 3}
                      defaultValue={editingReg.selected_sessions}
                      className="w-full rounded-xl px-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#007a5e]/20 focus:border-[#007a5e] bg-slate-50 text-slate-800 text-sm font-mono"
                      required
                    />
                  </div>

                  {/* Subjects / Matières */}
                  <div className="col-span-2">
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Matières à préparer</label>
                    <textarea
                      id="edit-subjects"
                      name="subjects"
                      rows={2}
                      defaultValue={editingReg.subjects}
                      className="w-full rounded-xl px-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#007a5e]/20 focus:border-[#007a5e] bg-slate-50 text-slate-800 text-sm resize-none"
                      required
                    />
                  </div>

                  {/* Status Dropdown */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Statut de dossier</label>
                    <select
                      id="edit-status"
                      name="status"
                      defaultValue={editingReg.status}
                      className="w-full rounded-xl px-3 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#007a5e]/20 focus:border-[#007a5e] bg-slate-50 text-slate-800 text-sm h-11"
                    >
                      <option value="En attente">En attente</option>
                      <option value="Confirmé">Confirmé</option>
                      <option value="Payé">Payé</option>
                      <option value="Annulé">Annulé</option>
                    </select>
                  </div>

                  {/* Payment Received Input */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Montant payé (FCFA)</label>
                    <input
                      id="edit-payment"
                      type="number"
                      name="payment_received"
                      defaultValue={editingReg.payment_received || 0}
                      className="w-full rounded-xl px-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#007a5e]/20 focus:border-[#007a5e] bg-slate-50 text-slate-800 text-sm font-mono"
                    />
                  </div>
                </div>

                {/* Submitting Actions */}
                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button
                    id="cancel-edit-btn"
                    type="button"
                    onClick={() => setEditingReg(null)}
                    className="flex-1 rounded-full py-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 text-sm font-semibold transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    id="save-edit-btn"
                    type="submit"
                    className="flex-1 rounded-full py-3 bg-[#007a5e] hover:bg-[#005f48] text-white text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Enregistrer les modifications
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmDeleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setConfirmDeleteId(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm rounded-3xl bg-white p-6 space-y-6 text-center border border-slate-100 z-10 shadow-2xl text-slate-800"
              id="delete-confirmation-dialog"
            >
              <div className="w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto text-red-600 mb-2">
                <Trash2 className="h-5 w-5" />
              </div>

              <div className="space-y-1.5">
                <h4 className="text-lg font-semibold text-slate-900 font-serif">Supprimer l'inscription ?</h4>
                <p className="text-xs text-slate-500">
                  Cette action est définitive. Le dossier de l'étudiant sera définitivement supprimé du registre.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  id="cancel-delete-btn"
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 rounded-full py-2.5 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-all"
                >
                  Annuler
                </button>
                <button
                  id="confirm-delete-btn"
                  onClick={() => {
                    if (confirmDeleteId) deleteMutation.mutate(confirmDeleteId);
                  }}
                  className="flex-1 rounded-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-all"
                >
                  Confirmer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
