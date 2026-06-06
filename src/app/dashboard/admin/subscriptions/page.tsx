'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, Check, XCircle, Clock, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import type { PostgrestError } from '@supabase/supabase-js';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role?: string;
}

interface Subscription {
  id: string;
  plan_type: string;
  status: string;
  start_date: string;
  next_renewal: string;
  amount?: number;
  user_id: string;
  profiles?: {
    id: string;
    email: string;
    full_name: string;
  };
}

const planNames: Record<string, string> = {
  'prueba': 'Plan de Prueba',
  'basico': 'Plan Básico',
  'plus': 'Plan Plus',
  'pro': 'Plan Pro'
};

const planPrices: Record<string, number> = {
  'prueba': 0,
  'basico': 10,
  'plus': 20,
  'pro': 35
};

export default function AdminSubscriptionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (profileError) {
        setError(`Error al cargar el perfil: ${profileError.message}`);
        console.error('Profile error:', profileError);
        return;
      }

      if (!profileData || profileData.role !== 'admin') {
        router.push('/dashboard');
        return;
      }

      setProfile(profileData);

      // First, try without the join to see if that works
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .order('start_date', { ascending: false });

      if (subError) {
        console.error('Subscriptions error (full):', JSON.stringify(subError, null, 2));
        setError(`Error al cargar suscripciones: ${JSON.stringify(subError)}`);
        // Try to get at least the subscriptions without the user data
        if (subData) {
          console.log('Got subscriptions without user data:', subData);
          setSubscriptions(subData);
          setError(null); // Clear error since we have partial data
        }
        return;
      }

      if (subData) {
        // Now try to get user profiles separately
        const userIds = [...new Set(subData.map(s => s.user_id).filter(Boolean))];
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .in('id', userIds);
          
          if (profilesData) {
            // Create a map for easy lookup
            const profileMap = new Map(profilesData.map(p => [p.id, p]));
            // Join the data
            const joinedData = subData.map(sub => ({
              ...sub,
              profiles: profileMap.get(sub.user_id)
            }));
            setSubscriptions(joinedData);
          } else {
            setSubscriptions(subData);
          }
        } else {
          setSubscriptions(subData);
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(`Error inesperado: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [user, router]);

  const approveSubscription = useCallback(async (subscription: Subscription) => {
    try {
      await supabase
        .from('subscriptions')
        .update({ status: 'active' })
        .eq('id', subscription.id);

      // Find and update the associated invoice
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('*')
        .eq('subscription_id', subscription.id)
        .eq('status', 'unpaid');

      if (invoicesData && invoicesData.length > 0) {
        await supabase
          .from('invoices')
          .update({ status: 'paid', paid_date: new Date().toISOString() })
          .eq('id', invoicesData[0].id);
      }

      await fetchData();
    } catch (err) {
      console.error('Error approving subscription:', err as PostgrestError);
    }
  }, [fetchData]);

  const denySubscription = useCallback(async (subscription: Subscription) => {
    try {
      await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', subscription.id);

      // Find and update the associated invoice
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('*')
        .eq('subscription_id', subscription.id)
        .eq('status', 'unpaid');

      if (invoicesData && invoicesData.length > 0) {
        await supabase
          .from('invoices')
          .update({ status: 'cancelled' })
          .eq('id', invoicesData[0].id);
      }

      await fetchData();
    } catch (err) {
      console.error('Error denying subscription:', err as PostgrestError);
    }
  }, [fetchData]);

  const cancelSubscription = useCallback(async (subscription: Subscription) => {
    try {
      await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', subscription.id);

      await fetchData();
    } catch (err) {
      console.error('Error cancelling subscription:', err as PostgrestError);
    }
  }, [fetchData]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchData();
    }
  }, [user, authLoading, router, fetchData]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-accent-primary text-xl font-black animate-pulse">Cargando...</div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const pendingSubscriptions = subscriptions.filter(s => s.status === 'pending_approval');
  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row h-screen">
      <Sidebar
        activePage="admin-subscriptions"
        userRole={profile?.role || 'user'}
        userInitials={profile ? getInitials(profile.full_name) : 'U'}
        userEmail={user?.email || ''}
        userName={profile?.full_name || 'Usuario'}
      />

      <main className="flex-1 p-4 md:p-12 max-w-6xl mx-auto overflow-y-auto pt-20 md:pt-12">
        <header className="mb-8 md:mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-accent-primary/20 flex items-center justify-center text-accent-primary">
              <CreditCard size={24} className="md:w-7 md:h-7" />
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-black">Gestión de Suscripciones</h1>
              <p className="text-foreground/60 text-xs md:text-sm">Aprobar, denegar y gestionar suscripciones</p>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500 text-red-500 flex items-center gap-3">
            <XCircle size={20} />
            <div>
              <p className="font-bold text-sm md:text-base">Error</p>
              <p className="text-xs md:text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-12">
          <div className="p-4 md:p-8 rounded-2xl md:rounded-3xl bg-card border border-border hover:border-green-500/30 transition-all">
            <div className="flex items-center justify-between mb-2 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500">
                <Check size={20} className="md:w-6 md:h-6" />
              </div>
            </div>
            <p className="text-foreground/60 text-xs md:text-sm mb-1">Activas</p>
            <p className="text-2xl md:text-3xl font-black">{activeSubscriptions.length}</p>
          </div>

          <div className="p-4 md:p-8 rounded-2xl md:rounded-3xl bg-card border border-border hover:border-yellow-500/30 transition-all">
            <div className="flex items-center justify-between mb-2 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                <Clock size={20} className="md:w-6 md:h-6" />
              </div>
            </div>
            <p className="text-foreground/60 text-xs md:text-sm mb-1">Pendientes</p>
            <p className="text-2xl md:text-3xl font-black">{pendingSubscriptions.length}</p>
          </div>

          <div className="p-4 md:p-8 rounded-2xl md:rounded-3xl bg-card border border-border hover:border-accent-primary/30 transition-all">
            <div className="flex items-center justify-between mb-2 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-accent-primary/10 flex items-center justify-center text-accent-primary">
                <Users size={20} className="md:w-6 md:h-6" />
              </div>
            </div>
            <p className="text-foreground/60 text-xs md:text-sm mb-1">Total</p>
            <p className="text-2xl md:text-3xl font-black">{subscriptions.length}</p>
          </div>
        </div>

        {/* Pending Approvals */}
        {pendingSubscriptions.length > 0 && (
          <div className="p-4 md:p-8 rounded-2xl md:rounded-3xl bg-card border-2 border-yellow-500/30 mb-8 md:mb-12">
            <div className="flex items-center gap-3 mb-6 md:mb-8">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                <Clock size={20} className="md:w-6 md:h-6" />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-black text-yellow-500">Solicitudes Pendientes</h2>
                <p className="text-foreground/50 text-xs md:text-sm">{pendingSubscriptions.length} suscripciones esperando aprobación</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-yellow-500/20">
                    <th className="text-left pb-4 font-bold text-foreground/60 text-xs md:text-sm">Usuario</th>
                    <th className="text-left pb-4 font-bold text-foreground/60 text-xs md:text-sm hidden md:table-cell">Plan</th>
                    <th className="text-left pb-4 font-bold text-foreground/60 text-xs md:text-sm">Monto</th>
                    <th className="text-left pb-4 font-bold text-foreground/60 text-xs md:text-sm hidden sm:table-cell">Fecha</th>
                    <th className="text-right pb-4 font-bold text-foreground/60 text-xs md:text-sm">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingSubscriptions.map((sub) => (
                    <tr key={sub.id} className="border-b border-yellow-500/10 hover:bg-yellow-500/5 transition-all">
                      <td className="py-4">
                        {sub.profiles && sub.profiles.full_name ? (
                          <div className="flex items-center gap-3 md:gap-4">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary font-bold text-xs md:text-sm">
                              {getInitials(sub.profiles.full_name)}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-xs md:text-sm">{sub.profiles.full_name}</span>
                              <p className="text-xs text-foreground/60 truncate">{sub.profiles.email}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-foreground/50 text-xs md:text-sm">Usuario desconocido (ID: {sub.user_id})</span>
                        )}
                      </td>
                      <td className="py-4 font-bold text-xs md:text-sm hidden md:table-cell">{planNames[sub.plan_type] || sub.plan_type}</td>
                      <td className="py-4 font-bold text-xs md:text-sm">{sub.amount?.toFixed(2) || '0'} €</td>
                      <td className="py-4 text-foreground/60 text-xs md:text-sm hidden sm:table-cell">{formatDate(sub.start_date)}</td>
                      <td className="py-4 text-right flex items-center justify-end gap-2">
                        <button
                          onClick={() => denySubscription(sub)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all"
                          title="Denegar"
                        >
                          <XCircle size={14} className="md:w-4 md:h-4" />
                        </button>
                        <button
                          onClick={() => approveSubscription(sub)}
                          className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-lg transition-all"
                          title="Aprobar"
                        >
                          <Check size={14} className="md:w-4 md:h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* All Subscriptions */}
        <div className="p-4 md:p-8 rounded-2xl md:rounded-3xl bg-card border border-border">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-accent-primary/10 flex items-center justify-center text-accent-primary">
                <CreditCard size={20} className="md:w-6 md:h-6" />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-black">Todas las Suscripciones</h2>
                <p className="text-foreground/50 text-xs md:text-sm">{subscriptions.length} suscripciones</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-foreground/10">
                  <th className="text-left pb-4 font-bold text-foreground/60 text-xs md:text-sm">Usuario</th>
                  <th className="text-left pb-4 font-bold text-foreground/60 text-xs md:text-sm hidden md:table-cell">Plan</th>
                  <th className="text-left pb-4 font-bold text-foreground/60 text-xs md:text-sm">Monto</th>
                  <th className="text-left pb-4 font-bold text-foreground/60 text-xs md:text-sm">Estado</th>
                  <th className="text-left pb-4 font-bold text-foreground/60 text-xs md:text-sm hidden lg:table-cell">Fecha Inicio</th>
                  <th className="text-left pb-4 font-bold text-foreground/60 text-xs md:text-sm hidden lg:table-cell">Próxima Renovación</th>
                  <th className="text-right pb-4 font-bold text-foreground/60 text-xs md:text-sm">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="border-b border-foreground/5 hover:bg-foreground/5">
                    <td className="py-4">
                      {sub.profiles && sub.profiles.full_name ? (
                        <div className="flex items-center gap-3 md:gap-4">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary font-bold text-xs md:text-sm">
                            {getInitials(sub.profiles.full_name)}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-xs md:text-sm">{sub.profiles.full_name}</span>
                            <p className="text-xs text-foreground/60 truncate">{sub.profiles.email}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-foreground/50 text-xs md:text-sm">Usuario desconocido (ID: {sub.user_id})</span>
                      )}
                    </td>
                    <td className="py-4 font-bold text-xs md:text-sm hidden md:table-cell">{planNames[sub.plan_type] || sub.plan_type}</td>
                    <td className="py-4 font-bold text-xs md:text-sm">{sub.amount?.toFixed(2) || '0'} €</td>
                    <td className="py-4">
                      <span className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold uppercase ${
                        sub.status === 'active' ? 'bg-green-500/10 text-green-500' :
                        sub.status === 'pending_approval' ? 'bg-yellow-500/10 text-yellow-500' :
                        sub.status === 'cancelled' ? 'bg-red-500/10 text-red-500' :
                        'bg-gray-500/10 text-gray-500'
                      }`}>
                        {sub.status === 'active' ? 'Activa' :
                         sub.status === 'pending_approval' ? 'Pendiente' :
                         sub.status === 'cancelled' ? 'Cancelada' :
                         sub.status}
                      </span>
                    </td>
                    <td className="py-4 text-foreground/60 text-xs md:text-sm hidden lg:table-cell">{formatDate(sub.start_date)}</td>
                    <td className="py-4 text-foreground/60 text-xs md:text-sm hidden lg:table-cell">{formatDate(sub.next_renewal)}</td>
                    <td className="py-4 text-right flex items-center justify-end gap-2">
                      {sub.status === 'pending_approval' && (
                        <>
                          <button
                            onClick={() => denySubscription(sub)}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all"
                            title="Denegar"
                          >
                            <XCircle size={14} className="md:w-4 md:h-4" />
                          </button>
                          <button
                            onClick={() => approveSubscription(sub)}
                            className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-lg transition-all"
                            title="Aprobar"
                          >
                            <Check size={14} className="md:w-4 md:h-4" />
                          </button>
                        </>
                      )}
                      {sub.status === 'active' && (
                        <button
                          onClick={() => cancelSubscription(sub)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all"
                          title="Cancelar"
                        >
                          <XCircle size={14} className="md:w-4 md:h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
