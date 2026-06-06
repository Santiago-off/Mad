'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Check, X, Zap, Clock, AlertCircle } from 'lucide-react';
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
  banned?: boolean;
}

interface Subscription {
  id: string;
  plan_type: string;
  status: string;
  start_date: string;
  next_renewal: string;
  amount?: number;
}

const plans = [
  {
    id: 'prueba',
    name: 'Plan de Prueba',
    price: 'Gratuito',
    description: 'Empieza a crecer sin compromiso.',
    features: [
      'Visibilidad',
      'Pequeña estrategia para implementar tu impacto en redes'
    ],
    accent: 'primary',
    priceValue: 0
  },
  {
    id: 'basico',
    name: 'Plan Básico',
    price: '10€/mes',
    description: 'Para perfiles que están empezando a crecer.',
    features: [
      'Visibilidad en redes',
      'Gestión de ofertas',
      'Búsqueda de organización',
      'Estrategia básica para implementar tu impacto en redes'
    ],
    accent: 'primary',
    popular: true,
    priceValue: 10
  },
  {
    id: 'plus',
    name: 'Plan Plus',
    price: '20€/mes',
    description: 'Para perfiles en crecimiento que quieren más.',
    features: [
      'Visibilidad en redes',
      'Gestión de ofertas',
      'Búsqueda de organización',
      'Estrategia más avanzada para implementar tu impacto en redes',
      'Conexiones con marcas y colaboraciones'
    ],
    accent: 'secondary',
    priceValue: 20
  },
  {
    id: 'pro',
    name: 'Plan Pro',
    price: '35€/mes',
    description: 'Para quienes quieren llegar al siguiente nivel.',
    features: [
      'Visibilidad en redes',
      'Gestión de ofertas',
      'Búsqueda de organización',
      'Estrategia completa para implementar tu impacto en redes',
      'Conexiones con marcas y colaboraciones',
      '1 video editado',
      '1 miniatura'
    ],
    accent: 'secondary',
    priceValue: 35
  }
];

export default function SubscriptionPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, subRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user?.id).single(),
        supabase.from('subscriptions').select('*').eq('user_id', user?.id).order('created_at', { ascending: false }).limit(1).single()
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data);
        if (profileRes.data.banned) {
          router.push('/');
          return;
        }
      }
      if (subRes.data) setSubscription(subRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
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

  const handleSelectPlan = async (planId: string) => {
    if (!user) return;
    
    // If there's already a pending subscription, don't let user select another
    if (subscription?.status === 'pending_approval') {
      setMessage({ 
        text: 'Ya tienes una solicitud de plan pendiente de aprobación. Por favor espera a que sea revisada.', 
        type: 'info' 
      });
      return;
    }

    // Helper function to generate invoice number (pure inside async function, not during render)
    const generateInvoiceNumber = () => {
      return `INV-${Date.now()}`;
    };

    setLoading(true);
    setMessage(null);

    try {
      const planPrices: Record<string, number> = {
        'prueba': 0,
        'basico': 10,
        'plus': 20,
        'pro': 35
      };
      
      const planNames: Record<string, string> = {
        'prueba': 'Plan de Prueba',
        'basico': 'Plan Básico',
        'plus': 'Plan Plus',
        'pro': 'Plan Pro'
      };

      const nextRenewal = new Date();
      nextRenewal.setMonth(nextRenewal.getMonth() + 1);

      // Cancel any active subscription first
      if (subscription) {
        await supabase
          .from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('id', subscription.id);
      }

      // Insert new subscription
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert([
          {
            user_id: user.id,
            plan_type: planId,
            status: planId === 'prueba' ? 'active' : 'pending_approval',
            start_date: new Date().toISOString(),
            next_renewal: nextRenewal.toISOString(),
            amount: planPrices[planId]
          }
        ])
        .select();

      if (subscriptionError) throw subscriptionError;

      // If not a free plan, create invoice and redirect to billing
      if (planId !== 'prueba' && subscriptionData && subscriptionData.length > 0) {
        const newSubscription = subscriptionData[0];
        const invoiceNumber = generateInvoiceNumber();
        const paymentSubject = `Pago ${planNames[planId]} - ${user.email || user.id}`;
        
        console.log('Creating invoice...');
        const { error: invoiceError } = await supabase
          .from('invoices')
          .insert([
            {
              user_id: user.id,
              subscription_id: newSubscription.id,
              invoice_number: invoiceNumber,
              amount: planPrices[planId],
              currency: 'EUR',
              status: 'unpaid',
              description: `Solicitud de Suscripción ${planNames[planId]} - Pendiente de Aprobación`,
              invoice_date: new Date().toISOString(),
              due_date: nextRenewal.toISOString(),
              paypal_address: 'pagos@madagency.com',
              payment_subject: paymentSubject
            }
          ]);
          
        if (invoiceError) {
          console.error('Invoice error:', invoiceError);
          throw invoiceError;
        }

        // Log activity
        console.log('Logging activity...');
        await supabase.from('activity_log').insert([
          {
            user_id: user.id,
            action: 'plan_request',
            details: `Requested ${planNames[planId]} plan`
          }
        ]);

        console.log('Redirecting to billing...');
        router.push('/dashboard/billing');
        return; // Exit early to avoid finally setting loading to false before redirect
      } else {
        // Free plan - activate immediately
        await supabase.from('activity_log').insert([
          {
            user_id: user.id,
            action: 'change_plan',
            details: `Changed to ${planNames[planId]} plan`
          }
        ]);

        setMessage({ text: `Plan ${planNames[planId]} activado con éxito!`, type: 'success' });
        fetchData();
      }
    } catch (err) {
      const error = err as PostgrestError;
      console.error('Error:', err);
      setMessage({ text: error.message || 'Error al seleccionar el plan', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary"></div>
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

  const currentPlan = subscription?.plan_type || null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row h-screen">
      <Sidebar
        activePage="subscription"
        userRole={profile?.role || 'user'}
        userInitials={profile ? getInitials(profile.full_name) : 'U'}
        userEmail={user?.email || ''}
        userName={profile?.full_name || 'Usuario'}
      />

      <main className="flex-1 p-4 md:p-12 max-w-6xl mx-auto overflow-y-auto pt-20 md:pt-12">
        <header className="mb-8 md:mb-12">
          <h1 className="text-2xl md:text-3xl font-black mb-2">Gestionar Suscripción</h1>
          <p className="text-foreground/60 text-sm md:text-base">Cambia o actualiza tu plan</p>
        </header>

        {message && (
          <div className={`mb-6 md:mb-8 p-3 md:p-4 rounded-xl flex items-center gap-2 md:gap-3 ${
            message.type === 'success' ? 'bg-green-500/10 border border-green-500 text-green-500' :
            message.type === 'error' ? 'bg-red-500/10 border border-red-500 text-red-500' :
            'bg-blue-500/10 border border-blue-500 text-blue-500'
          }`}>
            {message.type === 'info' && <AlertCircle size={18} className="md:w-5 md:h-5" />}
            {message.type === 'success' && <Check size={18} className="md:w-5 md:h-5" />}
            {message.type === 'error' && <X size={18} className="md:w-5 md:h-5" />}
            <span className="text-sm md:text-base">{message.text}</span>
          </div>
        )}

        {/* Current Subscription */}
        {subscription && (
          <div className="p-6 md:p-8 rounded-2xl md:rounded-3xl bg-card border border-border mb-8 md:mb-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 md:p-4 opacity-10">
              <Zap size={80} className="md:w-30 md:h-30" />
            </div>
            <h2 className="text-lg md:text-xl font-black mb-4 md:mb-6">Tu Plan Actual</h2>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6">
              <div>
                <div className="flex items-baseline gap-2 md:gap-4">
                  <span className="text-2xl md:text-3xl font-black">
                    {plans.find(p => p.id === subscription.plan_type)?.name}
                  </span>
                  <span className="text-lg md:text-xl text-accent-primary font-bold">
                    {plans.find(p => p.id === subscription.plan_type)?.price}
                  </span>
                </div>
                <p className="text-foreground/60 mt-1 md:mt-2 text-sm md:text-base">
                  Estado: {
                    subscription.status === 'active' ? 'Activo' :
                    subscription.status === 'pending_approval' ? 'Pendiente de Aprobación' :
                    subscription.status === 'cancelled' ? 'Cancelado' :
                    'Desconocido'
                  }
                </p>
                <p className="text-foreground/60 mt-1 text-sm md:text-base">
                  Desde {formatDate(subscription.start_date)}
                </p>
              </div>
              <div className="text-left md:text-right">
                <p className="text-xs md:text-sm text-foreground/60">Próxima renovación</p>
                <p className="font-bold text-sm md:text-base">{formatDate(subscription.next_renewal)}</p>
              </div>
            </div>
          </div>
        )}

        {subscription?.status === 'pending_approval' && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-3 md:p-4 mb-6 md:mb-8 flex items-start gap-3">
            <Clock className="text-yellow-500 shrink-0 w-5 h-5 md:w-6 md:h-6" size={20} />
            <div>
              <h4 className="font-bold text-yellow-500 text-sm md:text-base">Solicitud Pendiente</h4>
              <p className="text-xs md:text-sm text-yellow-500/80">Tu solicitud de plan está siendo revisada por un administrador. Recibirás una notificación cuando sea aprobada o denegada.</p>
            </div>
          </div>
        )}

        {/* Available Plans */}
        <h2 className="text-xl md:text-2xl font-black mb-6 md:mb-8">Selecciona tu Plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`relative p-6 md:p-8 rounded-2xl md:rounded-3xl border-2 transition-all hover:-translate-y-1 md:hover:-translate-y-2 ${
                subscription?.status === 'pending_approval' ? 'opacity-50 cursor-not-allowed' : ''
              } ${
                currentPlan === plan.id ? 'border-accent-primary bg-card shadow-xl md:shadow-2xl' :
                plan.popular ? 'border-accent-primary bg-card shadow-lg md:shadow-xl' :
                'border-border bg-card hover:border-accent-primary/50'
              }`}
            >
              {plan.popular && currentPlan !== plan.id && (
                <div className="absolute -top-3 md:-top-4 left-1/2 -translate-x-1/2 bg-accent-primary text-black px-3 md:px-4 py-0.5 md:py-1 rounded-full text-xs font-bold shadow-lg">
                  RECOMENDADO
                </div>
              )}
              {currentPlan === plan.id && subscription?.status === 'active' && (
                <div className="absolute -top-3 md:-top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-3 md:px-4 py-0.5 md:py-1 rounded-full text-xs font-bold shadow-lg">
                  TU PLAN ACTUAL
                </div>
              )}

              <h3 className="text-lg md:text-xl font-bold mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-4 md:mb-6">
                <span className="text-2xl md:text-3xl font-black">{plan.price}</span>
              </div>
              <p className="text-foreground/60 mb-6 md:mb-8 text-sm md:text-base">{plan.description}</p>

              <ul className="space-y-3 md:space-y-4 mb-8 md:mb-10">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 md:gap-3">
                    <Check className="w-4 h-4 md:w-5 md:h-5 shrink-0 text-accent-primary" />
                    <span className="text-foreground/80 text-sm md:text-base">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={loading || (currentPlan === plan.id && subscription?.status === 'active') || subscription?.status === 'pending_approval'}
                className={`w-full py-2.5 md:py-3 rounded-xl font-bold transition-all text-sm md:text-base ${
                  currentPlan === plan.id && subscription?.status === 'active'
                    ? 'bg-foreground/10 text-foreground/50 cursor-not-allowed'
                    : plan.accent === 'primary'
                    ? 'bg-accent-primary text-black hover:bg-accent-primary/80'
                    : 'bg-accent-secondary text-white hover:bg-accent-secondary/80'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {currentPlan === plan.id && subscription?.status === 'active' ? 'Tu plan actual' : 
                 loading ? 'Cargando...' : 
                 'Seleccionar'}
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
