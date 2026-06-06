'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Users, TrendingUp, MessageSquare, DollarSign, Settings, CreditCard, XCircle, MessageSquare as TicketIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role?: string;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeTickets: 0,
    totalRevenue: 0,
    activeSubscriptions: 0
  });

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (profileError) {
        setError(`Error al cargar perfil: ${profileError.message}`);
        console.error('Profile error:', profileError);
        return;
      }

      if (!profileData || profileData.role !== 'admin') {
        router.push('/dashboard');
        return;
      }

      setProfile(profileData);

      // Fetch each data source independently
      let userCount = 0;
      let activeTicketsCount = 0;
      let activeSubscriptionsCount = 0;
      let revenue = 0;

      try {
        const { count, error: userCountError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
        if (!userCountError) userCount = count || 0;
      } catch (e) { console.error('User count error:', e); }

      try {
        const { data: tickets, error: ticketsError } = await supabase
          .from('tickets')
          .select('*')
          .eq('status', 'open');
        if (!ticketsError && tickets) activeTicketsCount = tickets.length;
      } catch (e) { console.error('Tickets error:', e); }

      try {
        const { data: subscriptions, error: subsError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('status', 'active');
        if (!subsError && subscriptions) activeSubscriptionsCount = subscriptions.length;
      } catch (e) { console.error('Subscriptions error:', e); }

      try {
        const { data: metrics, error: metricsError } = await supabase
          .from('financial_metrics')
          .select('*')
          .order('date', { ascending: false })
          .limit(1);
        if (!metricsError && metrics && metrics.length > 0) revenue = metrics[0].total_revenue || 0;
      } catch (e) { console.error('Metrics error:', e); }

      setStats({
        totalUsers: userCount,
        activeTickets: activeTicketsCount,
        totalRevenue: revenue,
        activeSubscriptions: activeSubscriptionsCount
      });
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(`Error inesperado: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [user, router]);

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

  const quickActions = [
    { id: 'users', name: 'Usuarios', icon: Users, href: '/dashboard/admin/users', color: 'primary' },
    { id: 'subscriptions', name: 'Suscripciones', icon: CreditCard, href: '/dashboard/admin/subscriptions', color: 'secondary' },
    { id: 'tickets', name: 'Tickets', icon: TicketIcon, href: '/dashboard/admin/tickets', color: 'primary' },
    { id: 'finances', name: 'Finanzas', icon: DollarSign, href: '/dashboard/admin/finances', color: 'secondary' },
    { id: 'settings', name: 'Configuración', icon: Settings, href: '/dashboard/admin/settings', color: 'primary' }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row h-screen">
      <Sidebar
        activePage="admin"
        userRole={profile?.role || 'user'}
        userInitials={profile ? getInitials(profile.full_name) : 'U'}
        userEmail={user?.email || ''}
        userName={profile?.full_name || 'Usuario'}
      />

      <main className="flex-1 p-4 md:p-12 max-w-6xl mx-auto overflow-y-auto pt-20 md:pt-12">
        <header className="mb-8 md:mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-accent-primary/20 flex items-center justify-center text-accent-primary">
              <Shield size={24} className="md:w-7 md:h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black">Panel de Administración</h1>
              <p className="text-foreground/60 text-sm md:text-base">Gestiona la plataforma</p>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500 text-red-500 flex items-center gap-3">
            <XCircle size={20} />
            <div>
              <p className="font-bold">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-12">
          <div className="p-4 md:p-6 rounded-2xl md:rounded-3xl bg-card border border-border hover:border-accent-primary/50 transition-all">
            <div className="flex items-center justify-between mb-2 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-accent-primary/10 flex items-center justify-center text-accent-primary">
                <Users size={20} className="md:w-6 md:h-6" />
              </div>
            </div>
            <p className="text-foreground/60 text-xs md:text-sm mb-1">Usuarios Totales</p>
            <p className="text-2xl md:text-3xl font-black">{stats.totalUsers}</p>
          </div>

          <div className="p-4 md:p-6 rounded-2xl md:rounded-3xl bg-card border border-border hover:border-accent-primary/50 transition-all">
            <div className="flex items-center justify-between mb-2 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
                <MessageSquare size={20} className="md:w-6 md:h-6" />
              </div>
            </div>
            <p className="text-foreground/60 text-xs md:text-sm mb-1">Tickets Abiertos</p>
            <p className="text-2xl md:text-3xl font-black">{stats.activeTickets}</p>
          </div>

          <div className="p-4 md:p-6 rounded-2xl md:rounded-3xl bg-card border border-border hover:border-accent-primary/50 transition-all">
            <div className="flex items-center justify-between mb-2 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500">
                <DollarSign size={20} className="md:w-6 md:h-6" />
              </div>
            </div>
            <p className="text-foreground/60 text-xs md:text-sm mb-1">Ingresos Totales</p>
            <p className="text-2xl md:text-3xl font-black">{stats.totalRevenue.toFixed(2)} €</p>
          </div>

          <div className="p-4 md:p-6 rounded-2xl md:rounded-3xl bg-card border border-border hover:border-accent-primary/50 transition-all">
            <div className="flex items-center justify-between mb-2 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-accent-secondary/10 flex items-center justify-center text-accent-secondary">
                <TrendingUp size={20} className="md:w-6 md:h-6" />
              </div>
            </div>
            <p className="text-foreground/60 text-xs md:text-sm mb-1">Suscripciones Activas</p>
            <p className="text-2xl md:text-3xl font-black">{stats.activeSubscriptions}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <h2 className="text-xl md:text-2xl font-black mb-6 md:mb-8">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-12">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.id}
                href={action.href}
                className={`p-6 md:p-8 rounded-2xl md:rounded-3xl border border-border bg-card hover:-translate-y-1 md:hover:-translate-y-2 transition-all group`}
              >
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl mb-4 md:mb-6 flex items-center justify-center ${
                  action.color === 'primary'
                    ? 'bg-accent-primary/10 text-accent-primary'
                    : 'bg-accent-secondary/10 text-accent-secondary'
                }`}>
                  <Icon size={24} className="md:w-7 md:h-7" />
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-1 md:mb-2">{action.name}</h3>
                <p className="text-foreground/60 text-xs md:text-sm">
                  Gestiona {action.name.toLowerCase()}
                </p>
                <div className="mt-3 md:mt-4 text-foreground/40 group-hover:text-accent-primary transition-colors">
                  →
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}