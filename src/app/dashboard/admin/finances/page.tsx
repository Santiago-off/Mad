'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, DollarSign, TrendingUp, Download, FileText, Check, XCircle, Clock } from 'lucide-react';
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

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: string;
  invoice_date: string;
  subscription_id?: string;
  user_id?: string;
  paypal_address?: string;
  payment_subject?: string;
  profiles?: {
    id: string;
    email: string;
    full_name: string;
  };
}

export default function AdminFinancesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
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
        setError(`Error al cargar perfil: ${profileError.message}`);
        console.error('Profile error:', profileError);
        return;
      }

      if (!profileData || profileData.role !== 'admin') {
        router.push('/dashboard');
        return;
      }

      setProfile(profileData);

      // First, get invoices without join
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .order('invoice_date', { ascending: false });

      if (invoicesError) {
        console.error('Invoices error (full):', JSON.stringify(invoicesError, null, 2));
        setError(`Error al cargar facturas: ${JSON.stringify(invoicesError)}`);
        // Try to use partial data if available
        if (invoicesData) {
          console.log('Got invoices without user data:', invoicesData);
          setInvoices(invoicesData);
          setError(null); // Clear error since we have partial data
        }
        return;
      }

      if (invoicesData) {
        // Now get user profiles separately
        const userIds = [...new Set(invoicesData.map(i => i.user_id).filter(Boolean))];
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .in('id', userIds);
          
          if (profilesData) {
            const profileMap = new Map(profilesData.map(p => [p.id, p]));
            const joinedData = invoicesData.map(invoice => ({
              ...invoice,
              profiles: profileMap.get(invoice.user_id)
            }));
            setInvoices(joinedData);
          } else {
            setInvoices(invoicesData);
          }
        } else {
          setInvoices(invoicesData);
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(`Error inesperado: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [user, router]);

  const markInvoiceAsPaid = useCallback(async (invoice: Invoice) => {
    try {
      // Update invoice to paid
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({ status: 'paid', paid_date: new Date().toISOString() })
        .eq('id', invoice.id);
      
      if (invoiceError) throw invoiceError;

      // If invoice has a subscription, update subscription to active
      if (invoice.subscription_id) {
        const { error: subError } = await supabase
          .from('subscriptions')
          .update({ status: 'active' })
          .eq('id', invoice.subscription_id);
        
        if (subError) throw subError;
      }

      // Refresh data
      await fetchData();
    } catch (err) {
      console.error('Error marking invoice as paid:', err as PostgrestError);
    }
  }, [fetchData]);

  const denyInvoice = useCallback(async (invoice: Invoice) => {
    try {
      // Update invoice to cancelled
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({ status: 'cancelled' })
        .eq('id', invoice.id);
      
      if (invoiceError) throw invoiceError;

      // If invoice has a subscription, update subscription to cancelled too
      if (invoice.subscription_id) {
        const { error: subError } = await supabase
          .from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('id', invoice.subscription_id);
        
        if (subError) throw subError;
      }

      // Refresh data
      await fetchData();
    } catch (err) {
      console.error('Error denying invoice:', err as PostgrestError);
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

  const totalRevenue = invoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const pendingInvoices = invoices.filter(i => i.status === 'unpaid');
  const pendingAmount = pendingInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);
  const paidCount = invoices.filter(i => i.status === 'paid').length;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row h-screen">
      <Sidebar
        activePage="admin-finances"
        userRole={profile?.role || 'user'}
        userInitials={profile ? getInitials(profile.full_name) : 'U'}
        userEmail={user?.email || ''}
        userName={profile?.full_name || 'Usuario'}
      />

      <main className="flex-1 p-4 md:p-12 max-w-6xl mx-auto overflow-y-auto pt-20 md:pt-12">
        <header className="mb-8 md:mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-green-500/20 flex items-center justify-center text-green-500">
              <BarChart3 size={24} className="md:w-7 md:h-7" />
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-black">Panel de Finanzas</h1>
              <p className="text-foreground/60 text-xs md:text-sm">Datos económicos y facturación</p>
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
                <DollarSign size={20} className="md:w-6 md:h-6" />
              </div>
              <div className="flex items-center gap-1 text-green-500 text-xs md:text-sm font-bold">
                <TrendingUp size={14} className="md:w-4 md:h-4" /> +12.5%
              </div>
            </div>
            <p className="text-foreground/60 text-xs md:text-sm mb-1">Ingresos Totales</p>
            <p className="text-2xl md:text-3xl font-black">{totalRevenue.toFixed(2)} €</p>
          </div>

          <div className="p-4 md:p-8 rounded-2xl md:rounded-3xl bg-card border border-border hover:border-accent-primary/50 transition-all">
            <div className="flex items-center justify-between mb-2 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-accent-primary/10 flex items-center justify-center text-accent-primary">
                <FileText size={20} className="md:w-6 md:h-6" />
              </div>
            </div>
            <p className="text-foreground/60 text-xs md:text-sm mb-1">Facturas Pagadas</p>
            <p className="text-2xl md:text-3xl font-black">{paidCount}</p>
          </div>

          <div className="p-4 md:p-8 rounded-2xl md:rounded-3xl bg-card border border-border hover:border-yellow-500/30 transition-all">
            <div className="flex items-center justify-between mb-2 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                <FileText size={20} className="md:w-6 md:h-6" />
              </div>
            </div>
            <p className="text-foreground/60 text-xs md:text-sm mb-1">Pendientes</p>
            <p className="text-2xl md:text-3xl font-black">{pendingInvoices.length}</p>
          </div>

          <div className="p-4 md:p-8 rounded-2xl md:rounded-3xl bg-card border border-border hover:border-red-500/30 transition-all">
            <div className="flex items-center justify-between mb-2 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
                <DollarSign size={20} className="md:w-6 md:h-6" />
              </div>
            </div>
            <p className="text-foreground/60 text-xs md:text-sm mb-1">Monto Pendiente</p>
            <p className="text-2xl md:text-3xl font-black text-red-500">{pendingAmount.toFixed(2)} €</p>
          </div>
        </div>

        {/* Pending Requests */}
        {pendingInvoices.length > 0 && (
          <div className="p-4 md:p-8 rounded-2xl md:rounded-3xl bg-card border-2 border-yellow-500/30 mb-8 md:mb-12">
            <div className="flex items-center gap-3 mb-6 md:mb-8">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                <Clock size={20} className="md:w-6 md:h-6" />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-black text-yellow-500">Solicitudes Pendientes</h2>
                <p className="text-foreground/50 text-xs md:text-sm">{pendingInvoices.length} solicitudes esperando revisión</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-yellow-500/20">
                    <th className="text-left pb-4 font-bold text-foreground/60 text-xs md:text-sm"># Factura</th>
                    <th className="text-left pb-4 font-bold text-foreground/60 text-xs md:text-sm hidden sm:table-cell">Usuario</th>
                    <th className="text-left pb-4 font-bold text-foreground/60 text-xs md:text-sm">Monto</th>
                    <th className="text-left pb-4 font-bold text-foreground/60 text-xs md:text-sm hidden md:table-cell">Asunto</th>
                    <th className="text-left pb-4 font-bold text-foreground/60 text-xs md:text-sm hidden lg:table-cell">Fecha</th>
                    <th className="text-right pb-4 font-bold text-foreground/60 text-xs md:text-sm">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingInvoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-yellow-500/10 hover:bg-yellow-500/5 transition-all">
                      <td className="py-4 font-bold text-xs md:text-sm">{invoice.invoice_number}</td>
                      <td className="py-4 hidden sm:table-cell">
                        {invoice.profiles && invoice.profiles.full_name ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-xs md:text-sm">{invoice.profiles.full_name}</span>
                            <span className="text-xs text-foreground/60 truncate">{invoice.profiles.email}</span>
                          </div>
                        ) : (
                          <span className="text-foreground/50 text-xs md:text-sm">Usuario desconocido (ID: {invoice.user_id})</span>
                        )}
                      </td>
                      <td className="py-4">
                        <span className="font-bold text-xs md:text-sm">{(invoice.amount || 0).toFixed(2)}</span>
                        <span className="text-foreground/50 ml-1 text-xs md:text-sm">{invoice.currency || '€'}</span>
                      </td>
                      <td className="py-4 text-foreground/80 text-xs md:text-sm hidden md:table-cell">
                        {invoice.payment_subject || 'Sin asunto'}
                      </td>
                      <td className="py-4 text-foreground/60 text-xs md:text-sm hidden lg:table-cell">{formatDate(invoice.invoice_date)}</td>
                      <td className="py-4 text-right flex items-center justify-end gap-2">
                        <button
                          onClick={() => denyInvoice(invoice)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all"
                          title="Denegar solicitud"
                        >
                          <XCircle size={14} className="md:w-4 md:h-4" />
                        </button>
                        <button
                          onClick={() => markInvoiceAsPaid(invoice)}
                          className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-lg transition-all"
                          title="Aceptar y marcar como pagado"
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

        {/* Invoices */}
        <div className="p-4 md:p-8 rounded-2xl md:rounded-3xl bg-card border border-border">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-accent-primary/10 flex items-center justify-center text-accent-primary">
                <FileText size={20} className="md:w-6 md:h-6" />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-black">Historial de Facturas</h2>
                <p className="text-foreground/50 text-xs md:text-sm">{invoices.length} facturas</p>
              </div>
            </div>
            <button className="flex items-center gap-2 text-accent-primary font-bold hover:underline text-xs md:text-sm">
              <Download size={14} className="md:w-4 md:h-4" /> Exportar
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-foreground/10">
                  <th className="text-left pb-4 font-bold text-foreground/60 text-xs md:text-sm"># Factura</th>
                  <th className="text-left pb-4 font-bold text-foreground/60 text-xs md:text-sm hidden sm:table-cell">Usuario</th>
                  <th className="text-left pb-4 font-bold text-foreground/60 text-xs md:text-sm">Monto</th>
                  <th className="text-left pb-4 font-bold text-foreground/60 text-xs md:text-sm">Estado</th>
                  <th className="text-left pb-4 font-bold text-foreground/60 text-xs md:text-sm hidden lg:table-cell">Fecha</th>
                  <th className="text-right pb-4 font-bold text-foreground/60 text-xs md:text-sm">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {invoices.slice(0, 10).map((invoice) => (
                  <tr key={invoice.id} className="border-b border-foreground/5 hover:bg-foreground/5">
                    <td className="py-4 font-bold text-xs md:text-sm">{invoice.invoice_number}</td>
                    <td className="py-4 hidden sm:table-cell">
                      {invoice.profiles && invoice.profiles.full_name ? (
                        <div className="flex flex-col">
                          <span className="font-bold text-xs md:text-sm">{invoice.profiles.full_name}</span>
                          <span className="text-xs text-foreground/60 truncate">{invoice.profiles.email}</span>
                          {invoice.payment_subject && (
                            <span className="text-[10px] text-foreground/50 mt-1">{invoice.payment_subject}</span>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span className="text-foreground/50 text-xs md:text-sm">Usuario desconocido (ID: {invoice.user_id})</span>
                          {invoice.payment_subject && (
                            <span className="text-[10px] text-foreground/50 mt-1">{invoice.payment_subject}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-4">
                      <span className="font-bold text-xs md:text-sm">{(invoice.amount || 0).toFixed(2)}</span>
                      <span className="text-foreground/50 ml-1 text-xs md:text-sm">{invoice.currency || '€'}</span>
                    </td>
                    <td className="py-4">
                      <span className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold uppercase ${
                        invoice.status === 'paid' ? 'bg-green-500/10 text-green-500' :
                        invoice.status === 'unpaid' ? 'bg-yellow-500/10 text-yellow-500' :
                        invoice.status === 'cancelled' ? 'bg-red-500/10 text-red-500' :
                        'bg-gray-500/10 text-gray-500'
                      }`}>
                        {invoice.status === 'paid' ? 'Pagada' :
                         invoice.status === 'unpaid' ? 'Pendiente' :
                         invoice.status === 'cancelled' ? 'Cancelada' :
                         invoice.status}
                      </span>
                    </td>
                    <td className="py-4 text-foreground/60 text-xs md:text-sm hidden lg:table-cell">{formatDate(invoice.invoice_date)}</td>
                    <td className="py-4 text-right flex items-center justify-end gap-2">
                      {invoice.status === 'unpaid' && (
                        <>
                          <button
                            onClick={() => denyInvoice(invoice)}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all"
                            title="Denegar"
                          >
                            <XCircle size={14} className="md:w-4 md:h-4" />
                          </button>
                          <button
                            onClick={() => markInvoiceAsPaid(invoice)}
                            className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-lg transition-all"
                            title="Marcar como pagada"
                          >
                            <Check size={14} className="md:w-4 md:h-4" />
                          </button>
                        </>
                      )}
                      <button className="p-2 hover:bg-foreground/10 rounded-lg transition-all">
                        <Download size={14} className="md:w-4 md:h-4" />
                      </button>
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
