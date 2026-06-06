'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, Clock, Zap, User, MessageSquare, FileText } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role?: string;
  created_at: string;
  updated_at: string;
}

interface Subscription {
  id: string;
  user_id: string;
  plan_type: string;
  status: string;
  start_date: string;
  next_renewal: string;
  amount?: number;
  created_at: string;
}

interface Invoice {
  id: string;
  amount: number;
  currency?: string;
  status: string;
  invoice_date: string;
}

interface Ticket {
  id: string;
  subject: string;
  status: string;
  created_at: string;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (!profileError) setProfile(profileData);

      // Fetch subscription
      const { data: subscriptionData, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!subError && subscriptionData && subscriptionData.length > 0) {
        setSubscription(subscriptionData[0]);
      }

      // Fetch recent invoices
      const { data: invoiceData, error: invError } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user?.id)
        .order('invoice_date', { ascending: false })
        .limit(5);

      if (!invError) setRecentInvoices(invoiceData || []);

      // Fetch recent tickets
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (!ticketError) setRecentTickets(ticketData || []);

    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchData();
    }
  }, [user, authLoading, router, fetchData]);

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
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateMonthsActive = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    return Math.ceil((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 30));
  };

  const planNames: Record<string, string> = {
    'prueba': 'Plan de Prueba',
    'basico': 'Plan Básico',
    'plus': 'Plan Plus',
    'pro': 'Plan Pro'
  };

  const planPrices: Record<string, string> = {
    'prueba': 'Gratuito',
    'basico': '10€/mes',
    'plus': '20€/mes',
    'pro': '35€/mes'
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-accent-primary text-xl font-black animate-pulse">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row h-screen">
      <Sidebar
        activePage="dashboard"
        userRole={profile?.role || 'user'}
        userInitials={profile ? getInitials(profile.full_name) : 'U'}
        userEmail={user?.email || ''}
        userName={profile?.full_name || 'Usuario'}
      />

      <main className="flex-1 p-6 md:p-12 max-w-6xl mx-auto overflow-y-auto">
        <header className="mb-12">
          <h1 className="text-3xl font-black mb-2">Hola, {profile?.full_name?.split(' ')[0]}! 👋</h1>
          <p className="text-foreground/60">Bienvenido a tu dashboard personalizado.</p>
        </header>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="p-6 rounded-3xl bg-card border border-border hover:border-accent-primary/50 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-accent-primary/10 flex items-center justify-center text-accent-primary">
                <CreditCard />
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                subscription?.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
              }`}>
                {subscription?.status === 'active' ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <h3 className="text-lg font-bold mb-1">Plan Actual</h3>
            <p className="text-2xl font-black text-accent-primary">
              {subscription ? planNames[subscription.plan_type] : 'Sin plan'}
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-card border border-border hover:border-accent-primary/50 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-accent-secondary/10 flex items-center justify-center text-accent-secondary">
                <Zap />
              </div>
              <span className="text-foreground/50 text-xs font-bold">MESES ACTIVOS</span>
            </div>
            <h3 className="text-lg font-bold mb-1">Tiempo en MAD</h3>
            <p className="text-2xl font-black text-accent-secondary">
              {profile ? calculateMonthsActive(profile.created_at) : 0}
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-card border border-border hover:border-accent-primary/50 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <MessageSquare />
              </div>
              <span className="text-foreground/50 text-xs font-bold">ABIERTOS</span>
            </div>
            <h3 className="text-lg font-bold mb-1">Tickets de Soporte</h3>
            <p className="text-2xl font-black text-blue-500">{recentTickets.length}</p>
          </div>

          <div className="p-6 rounded-3xl bg-card border border-border hover:border-accent-primary/50 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                <FileText />
              </div>
              <span className="text-foreground/50 text-xs font-bold">TOTAL</span>
            </div>
            <h3 className="text-lg font-bold mb-1">Facturas</h3>
            <p className="text-2xl font-black text-purple-500">{recentInvoices.length}</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Subscription Info */}
          <div className="lg:col-span-2 space-y-8">
            <div className="p-8 rounded-3xl bg-card border border-border relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Clock size={120} />
              </div>
              <h2 className="text-xl font-black mb-6">Mi Suscripción</h2>
              
              {subscription ? (
                <>
                  <div className="flex items-baseline gap-4 mb-6">
                    <span className="text-4xl font-black">{planNames[subscription.plan_type]}</span>
                    <span className="text-2xl text-accent-primary font-bold">{planPrices[subscription.plan_type]}</span>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground/60">Inicio del plan:</span>
                      <span className="font-bold">{formatDate(subscription.start_date)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground/60">Próxima renovación:</span>
                      <span className="font-bold">{formatDate(subscription.next_renewal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground/60">Estado:</span>
                      <span className={`font-bold px-2 py-1 rounded-full text-xs ${
                        subscription.status === 'active' ? 'bg-green-500/10 text-green-500' :
                        subscription.status === 'expired' ? 'bg-red-500/10 text-red-500' :
                        'bg-yellow-500/10 text-yellow-500'
                      }`}>
                        {subscription.status === 'active' ? 'Activo' :
                         subscription.status === 'expired' ? 'Expirado' :
                         subscription.status === 'pending' ? 'Pendiente' : 'Cancelado'}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-foreground/60 mb-4">Aún no tienes una suscripción activa.</p>
                  <Link
                    href="/#pricing"
                    className="inline-block bg-accent-primary text-black px-6 py-3 rounded-xl font-bold hover:bg-accent-primary/80 transition-all"
                  >
                    Ver planes
                  </Link>
                </div>
              )}

              <Link
                href="/dashboard/subscription"
                className="w-full block text-center py-3 bg-foreground/5 rounded-xl font-bold hover:bg-foreground/10 transition-all"
              >
                Gestionar suscripción →
              </Link>
            </div>

            {/* Recent Activity */}
            <div className="p-8 rounded-3xl bg-card border border-border">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black">Actividad Reciente</h2>
                <Link href="/dashboard/activity" className="text-accent-primary text-sm font-bold hover:underline">
                  Ver todas
                </Link>
              </div>

              <div className="space-y-4">
                {recentTickets.length > 0 ? (
                  recentTickets.map(ticket => (
                    <div key={ticket.id} className="flex items-center gap-4 p-4 bg-foreground/5 rounded-xl hover:bg-foreground/10 transition-all">
                      <div className="w-10 h-10 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary">
                        <MessageSquare size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{ticket.subject}</p>
                        <p className="text-sm text-foreground/50">{formatDate(ticket.created_at)}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        ticket.status === 'open' ? 'bg-red-500/10 text-red-500' :
                        ticket.status === 'in_progress' ? 'bg-yellow-500/10 text-yellow-500' :
                        ticket.status === 'resolved' ? 'bg-green-500/10 text-green-500' :
                        'bg-gray-500/10 text-gray-500'
                      }`}>
                        {ticket.status === 'open' ? 'Abierto' :
                         ticket.status === 'in_progress' ? 'En proceso' :
                         ticket.status === 'resolved' ? 'Resuelto' : 'Cerrado'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-foreground/50">
                    No hay actividad reciente
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions & Recent Invoices */}
          <div className="space-y-8">
            {/* Quick Actions */}
            <div className="p-6 rounded-3xl bg-card border border-border">
              <h2 className="text-xl font-black mb-6">Acciones Rápidas</h2>
              <div className="space-y-3">
                <Link
                  href="/dashboard/subscription"
                  className="flex items-center gap-4 p-4 rounded-xl hover:bg-foreground/5 transition-all group"
                >
                  <div className="w-10 h-10 rounded-2xl bg-accent-primary/10 flex items-center justify-center text-accent-primary">
                    <CreditCard size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold">Gestionar Plan</p>
                    <p className="text-sm text-foreground/60">Cambiar o actualizar tu plan</p>
                  </div>
                  <div className="text-foreground/30 group-hover:text-accent-primary transition-all">→</div>
                </Link>

                <Link
                  href="/dashboard/support"
                  className="flex items-center gap-4 p-4 rounded-xl hover:bg-foreground/5 transition-all group"
                >
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <MessageSquare size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold">Abrir Ticket</p>
                    <p className="text-sm text-foreground/60">Contactar soporte técnico</p>
                  </div>
                  <div className="text-foreground/30 group-hover:text-blue-500 transition-all">→</div>
                </Link>

                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-4 p-4 rounded-xl hover:bg-foreground/5 transition-all group"
                >
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                    <User size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold">Ajustes de Cuenta</p>
                    <p className="text-sm text-foreground/60">Cambiar datos y preferencias</p>
                  </div>
                  <div className="text-foreground/30 group-hover:text-purple-500 transition-all">→</div>
                </Link>
              </div>
            </div>

            {/* Recent Invoices */}
            <div className="p-6 rounded-3xl bg-card border border-border">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black">Últimas Facturas</h2>
                <Link href="/dashboard/billing" className="text-accent-primary text-sm font-bold hover:underline">
                  Ver todas
                </Link>
              </div>

              <div className="space-y-3">
                {recentInvoices.length > 0 ? (
                  recentInvoices.map(invoice => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 bg-foreground/5 rounded-xl">
                      <div>
                        <p className="font-bold">{invoice.amount.toFixed(2)} {invoice.currency || '€'}</p>
                        <p className="text-sm text-foreground/50">{formatDate(invoice.invoice_date)}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        invoice.status === 'paid' ? 'bg-green-500/10 text-green-500' :
                        invoice.status === 'unpaid' ? 'bg-red-500/10 text-red-500' :
                        'bg-gray-500/10 text-gray-500'
                      }`}>
                        {invoice.status === 'paid' ? 'Pagada' :
                         invoice.status === 'unpaid' ? 'Pendiente' : 'Cancelada'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-foreground/50">
                    No hay facturas aún
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}