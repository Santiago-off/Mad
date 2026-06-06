'use client';

import React, { useState, useEffect } from 'react';
import { Zap, TrendingUp, Shield, Users, Monitor, CheckCircle2 } from 'lucide-react';
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

const services = [
  {
    id: 'visibility',
    name: 'Visibilidad en Redes',
    icon: TrendingUp,
    description: 'Aumenta tu alcance y engagement en las plataformas',
    features: ['Auditoría de perfil', 'Estrategia de crecimiento', 'Optimización de contenido'],
    color: 'primary'
  },
  {
    id: 'offers',
    name: 'Gestión de Ofertas',
    icon: Zap,
    description: 'Gestionamos las colaboraciones con marcas',
    features: ['Negociación de contratos', 'Seguimiento de entregas', 'Facturación'],
    color: 'secondary'
  },
  {
    id: 'team',
    name: 'Organización de Equipo',
    icon: Users,
    description: 'Encontramos el equipo perfecto para ti',
    features: ['Reclutamiento especializado', 'Gestión de proyectos', 'Colaboraciones estratégicas'],
    color: 'primary'
  },
  {
    id: 'strategy',
    name: 'Estrategia de Contenido',
    icon: Shield,
    description: 'Creación de contenido de calidad',
    features: ['Calendario editorial', 'Tendencias actuales', 'Análisis de rendimiento'],
    color: 'secondary'
  },
  {
    id: 'video',
    name: 'Edición de Vídeo',
    icon: Monitor,
    description: 'Edición profesional para tus vídeos',
    features: ['Motion graphics', 'Color grading', 'Thumbnails personalizadas'],
    color: 'primary'
  }
];

export default function ServicesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      const fetchProfile = async () => {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileData) setProfile(profileData);
        setLoading(false);
      };
      fetchProfile();
    }
  }, [user, authLoading, router]);

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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row h-screen">
      <Sidebar
        activePage="services"
        userRole={profile?.role || 'user'}
        userInitials={profile ? getInitials(profile.full_name) : 'U'}
        userEmail={user?.email || ''}
        userName={profile?.full_name || 'Usuario'}
      />

      <main className="flex-1 p-6 md:p-12 max-w-6xl mx-auto overflow-y-auto">
        <header className="mb-12">
          <h1 className="text-3xl font-black mb-2">Nuestros Servicios</h1>
          <p className="text-foreground/60">Todo lo que necesitas para crecer</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <div
                key={service.id}
                className={`p-8 rounded-3xl bg-card border border-border hover:border-accent-primary/50 hover:-translate-y-2 transition-all group`}
              >
                <div className={`w-16 h-16 rounded-2xl mb-6 flex items-center justify-center text-foreground ${
                  service.color === 'primary'
                    ? 'bg-accent-primary/20 text-accent-primary'
                    : 'bg-accent-secondary/20 text-accent-secondary'
                }`}>
                  <Icon size={32} />
                </div>

                <h3 className="text-2xl font-black mb-4 group-hover:text-accent-primary transition-colors">{service.name}</h3>
                <p className="text-foreground/60 mb-6">{service.description}</p>

                <ul className="space-y-3 mb-8">
                  {service.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-foreground/70">
                    <CheckCircle2 size={16} className="text-accent-primary" />
                    {feature}
                  </li>
                ))}
                </ul>

                <Link
                  href="/dashboard/support"
                  className={`w-full py-3 rounded-xl font-bold transition-all text-center block ${
                    service.color === 'primary'
                      ? 'bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30'
                      : 'bg-accent-secondary/20 text-accent-secondary hover:bg-accent-secondary/30'
                  }`}
                >
                  Solicitar información
                </Link>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}