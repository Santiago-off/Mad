'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Download, CreditCard, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

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
  description: string;
  invoice_date: string;
  paypal_address?: string;
  payment_subject?: string;
}

export default function BillingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (profileData) setProfile(profileData);

      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user?.id)
        .order('invoice_date', { ascending: false });

      if (invoiceData) setInvoices(invoiceData);
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
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row h-screen">
      <Sidebar
        activePage="billing"
        userRole={profile?.role || 'user'}
        userInitials={profile ? getInitials(profile.full_name) : 'U'}
        userEmail={user?.email || ''}
        userName={profile?.full_name || 'Usuario'}
      />

      <main className="flex-1 p-6 md:p-12 max-w-6xl mx-auto overflow-y-auto">
        <header className="mb-12">
          <h1 className="text-3xl font-black mb-2">Facturación y Pagos</h1>
          <p className="text-foreground/60">Historial de facturas y métodos de pago</p>
        </header>

        <div>
          {/* Invoices List */}
          <div className="p-8 rounded-3xl bg-card border border-border">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-accent-primary/10 flex items-center justify-center text-accent-primary">
                  <FileText size={24} />
                </div>
                <h2 className="text-xl font-black">Tus Facturas</h2>
              </div>
              <span className="text-sm text-foreground/50">{invoices.length} facturas</span>
            </div>

            {invoices.length > 0 ? (
              <div className="space-y-4">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="p-6 bg-foreground/5 rounded-xl hover:bg-foreground/10 transition-all border border-foreground/10 hover:border-accent-primary/30"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold">{invoice.invoice_number}</h3>
                        <p className="text-foreground/60 text-sm">
                          {invoice.description || 'Pago de suscripción'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black">
                          {invoice.amount.toFixed(2)} {invoice.currency || '€'}
                        </p>
                        <p className="text-foreground/50 text-sm">{formatDate(invoice.invoice_date)}</p>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-foreground/10">
                      {invoice.status === 'unpaid' && invoice.paypal_address && (
                        <div className="p-4 rounded-xl bg-accent-primary/5 border border-accent-primary/20">
                          <h4 className="font-bold mb-2 text-accent-primary">Realiza el pago por PayPal:</h4>
                          <p className="text-sm text-foreground/70 mb-1"><strong>Dirección PayPal:</strong> {invoice.paypal_address}</p>
                          {invoice.payment_subject && (
                            <p className="text-sm text-foreground/70"><strong>Asunto:</strong> {invoice.payment_subject}</p>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          invoice.status === 'paid' ? 'bg-green-500/10 text-green-500' :
                          invoice.status === 'unpaid' ? 'bg-yellow-500/10 text-yellow-500' :
                          'bg-gray-500/10 text-gray-500'
                        }`}>
                          {invoice.status === 'paid' ? 'Pagada' :
                           invoice.status === 'unpaid' ? 'Pendiente de aprobación' : 'Cancelada'}
                        </span>
                        <button
                          className="flex items-center gap-2 text-accent-primary text-sm font-bold hover:underline"
                        >
                          <Download size={16} /> Descargar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-foreground/20 mb-4">
                  <FileText size={64} />
                </div>
                <h3 className="text-xl font-bold mb-2 text-foreground/60">No hay facturas aún</h3>
                <p className="text-foreground/40">Tus facturas aparecerán aquí</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}