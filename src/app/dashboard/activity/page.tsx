'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, User, Zap, MessageSquare, FileText, CreditCard, Settings } from 'lucide-react';
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

interface Activity {
  id: string;
  action: string;
  details: string;
  created_at: string;
}

const activityIcons: Record<string, any> = {
  'login': User,
  'update_profile': Settings,
  'change_plan': CreditCard,
  'create_ticket': MessageSquare,
  'update_password': Settings,
  'payment': FileText,
  'subscription': Zap
};

export default function ActivityPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (profileData) setProfile(profileData);

      const { data: activityData } = await supabase
        .from('activity_log')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (activityData) setActivities(activityData);
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityLabel = (action: string) => {
    const labels: Record<string, string> = {
      'login': 'Inicio de sesión',
      'update_profile': 'Actualización de perfil',
      'change_plan': 'Cambio de plan',
      'create_ticket': 'Ticket creado',
      'update_password': 'Contraseña actualizada',
      'payment': 'Pago realizado',
      'subscription': 'Cambio de suscripción'
    };
    return labels[action] || 'Acción';
  };

  const getActivityIcon = (action: string) => {
    return activityIcons[action] || Clock;
  };

  const getActivityColor = (action: string) => {
    const colors: Record<string, string> = {
      'login': 'text-blue-500',
      'update_profile': 'text-purple-500',
      'change_plan': 'text-accent-primary',
      'create_ticket': 'text-yellow-500',
      'update_password': 'text-accent-secondary',
      'payment': 'text-green-500',
      'subscription': 'text-pink-500'
    };
    return colors[action] || 'text-foreground/50';
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row h-screen">
      <Sidebar
        activePage="activity"
        userRole={profile?.role || 'user'}
        userInitials={profile ? getInitials(profile.full_name) : 'U'}
        userEmail={user?.email || ''}
        userName={profile?.full_name || 'Usuario'}
      />

      <main className="flex-1 p-6 md:p-12 max-w-4xl mx-auto overflow-y-auto">
        <header className="mb-12">
          <h1 className="text-3xl font-black mb-2">Actividad de la Cuenta</h1>
          <p className="text-foreground/60">Registro de todas las acciones en tu cuenta</p>
        </header>

        <div className="p-8 rounded-3xl bg-card border border-border">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-accent-primary/10 flex items-center justify-center text-accent-primary">
                <Clock size={24} />
              </div>
              <h2 className="text-xl font-black">Historial de Actividad</h2>
            </div>
            <span className="text-foreground/50">{activities.length} registros</span>
          </div>

          {activities.length > 0 ? (
            <div className="relative pl-8">
              {/* Timeline Line */}
              <div className="absolute left-3 top-0 bottom-0 w-px bg-foreground/10" />

              <div className="space-y-8">
                {activities.map((activity) => {
                  const Icon = getActivityIcon(activity.action);
                  const color = getActivityColor(activity.action);
                  return (
                    <div key={activity.id} className="relative">
                      {/* Timeline Dot */}
                      <div className={`absolute -left-8 w-6 h-6 rounded-full ${color.replace('text-', 'bg-').replace('accent-', '')} border-4 border-card flex items-center justify-center`}>
                        <div className="w-2 h-2 rounded-full bg-current" />
                      </div>

                      <div className="p-6 bg-foreground/5 rounded-xl border border-foreground/10">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${color.replace('text-', 'bg-').replace('accent-', '')} bg-opacity-10 ${color}`}>
                              <Icon size={18} />
                            </div>
                            <h3 className="font-bold">{getActivityLabel(activity.action)}</h3>
                          </div>
                          <span className="text-foreground/40 text-sm">{formatDate(activity.created_at)}</span>
                        </div>
                        {activity.details && (
                          <p className="text-foreground/60">{activity.details}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-foreground/20 mb-6">
                <Clock size={80} />
              </div>
              <h3 className="text-xl font-bold mb-2 text-foreground/60">No hay actividad registrada</h3>
              <p className="text-foreground/40">Tu actividad aparecerá aquí</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}