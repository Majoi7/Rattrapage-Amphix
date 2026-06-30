import { supabase, isSupabaseConfigured, mockDb } from '../lib/supabase';
import { Registration, DashboardStats } from '../types';

export const registrationService = {
  async getRegistrations(): Promise<Registration[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching registrations from Supabase, falling back to mock:', error);
        return mockDb.getRegistrations();
      }
      return data || [];
    } else {
      // Return mock data sorted by date
      const regs = mockDb.getRegistrations();
      return [...regs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  },

  async createRegistration(registration: Omit<Registration, 'id' | 'created_at' | 'status' | 'payment_received'>): Promise<Registration> {
    const newReg: Registration = {
      ...registration,
      id: `reg_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      status: 'En attente',
      payment_received: 0
    };

    if (isSupabaseConfigured && supabase) {
      // In Supabase, let the database generate id and created_at if set, but we pass these as default fallback
      const { data, error } = await supabase
        .from('registrations')
        .insert([{
          fullname: newReg.fullname,
          phone: newReg.phone,
          email: newReg.email || null,
          university: newReg.university,
          field: newReg.field,
          level: newReg.level,
          subjects: newReg.subjects,
          pack: newReg.pack,
          total_sessions: newReg.total_sessions,
          selected_sessions: newReg.selected_sessions,
          price_per_session: newReg.price_per_session,
          total_price: newReg.total_price,
          status: newReg.status,
          payment_received: newReg.payment_received
        }])
        .select()
        .single();

      if (error) {
        console.error('Error writing to Supabase, writing to mock instead:', error);
        const regs = mockDb.getRegistrations();
        regs.unshift(newReg);
        mockDb.saveRegistrations(regs);
        return newReg;
      }
      return data;
    } else {
      const regs = mockDb.getRegistrations();
      regs.unshift(newReg);
      mockDb.saveRegistrations(regs);
      return newReg;
    }
  },

  async updateRegistration(id: string, updates: Partial<Registration>): Promise<Registration> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('registrations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating in Supabase, updating mock instead:', error);
        return this.updateMockRegistration(id, updates);
      }
      return data;
    } else {
      return this.updateMockRegistration(id, updates);
    }
  },

  updateMockRegistration(id: string, updates: Partial<Registration>): Registration {
    const regs = mockDb.getRegistrations();
    const index = regs.findIndex((r: any) => r.id === id);
    if (index === -1) throw new Error('Registration not found');
    
    // Auto sync payment received if status changed to 'Payé' and not explicitly set
    let payment_received = updates.payment_received !== undefined 
      ? updates.payment_received 
      : regs[index].payment_received;
      
    if (updates.status === 'Payé' && regs[index].status !== 'Payé' && updates.payment_received === undefined) {
      payment_received = regs[index].total_price;
    } else if (updates.status === 'En attente' || updates.status === 'Annulé') {
      payment_received = 0;
    }

    const updatedReg = {
      ...regs[index],
      ...updates,
      payment_received
    };
    
    regs[index] = updatedReg;
    mockDb.saveRegistrations(regs);
    return updatedReg;
  },

  async deleteRegistration(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('registrations')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting from Supabase, deleting from mock instead:', error);
        return this.deleteMockRegistration(id);
      }
      return true;
    } else {
      return this.deleteMockRegistration(id);
    }
  },

  deleteMockRegistration(id: string): boolean {
    const regs = mockDb.getRegistrations();
    const filtered = regs.filter((r: any) => r.id !== id);
    mockDb.saveRegistrations(filtered);
    return true;
  },

  computeStats(registrations: Registration[]): DashboardStats {
    const activeRegs = registrations;
    const totalInscrits = activeRegs.length;
    const pulseInscrits = activeRegs.filter(r => r.pack === 'Pulse').length;
    const privateInscrits = activeRegs.filter(r => r.pack === 'Private').length;

    // Sum total expected money from ALL non-canceled registrations
    const nonCanceledRegs = activeRegs.filter(r => r.status !== 'Annulé');
    const totalAttendu = nonCanceledRegs.reduce((sum, r) => sum + r.total_price, 0);

    // Sum total paid money
    const totalPaye = nonCanceledRegs.reduce((sum, r) => {
      if (r.status === 'Payé') {
        return sum + r.total_price;
      }
      return sum + (r.payment_received || 0);
    }, 0);

    const totalRestant = Math.max(0, totalAttendu - totalPaye);

    return {
      totalInscrits,
      pulseInscrits,
      privateInscrits,
      totalAttendu,
      totalPaye,
      totalRestant
    };
  }
};
