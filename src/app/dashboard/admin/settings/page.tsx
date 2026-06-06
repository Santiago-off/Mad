'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Save, CheckCircle2 } from 'lucide-react';
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

interface Setting {
  key: string;
  value: string;
  updated_at: string;
}

export default function AdminSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [paypalAddress, setPaypalAddress] = useState('No disponible');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (profileData) setProfile(profileData);

      const { data: settingsData } = await supabase
        .from('settings')
        .select('*')
        .eq('key', 'paypal_address')
        .single();

      if (settingsData) {
        setPaypalAddress(settingsData.value);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const saveSettings = async () => {
    setSaving(true);
    setSuccessMessage('');
    
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          key: 'paypal_address',
          value: paypalAddress,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setSuccessMessage('Configuración guardada correctamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row h-screen">
      <Sidebar
        activePage="admin"
        userRole={profile?.role || 'user'}
        userInitials={profile ? getInitials(profile.full_name) : 'U'}
        userEmail={user?.email || ''}
        userName={profile?.full_name || 'Usuario'}
      />

      <main className="flex-1 p-6 md:p-12 max-w-4xl mx-auto overflow-y-auto">
        <header className="mb-12">
          <h1 className="text-3xl font-black mb-2">Configuración</h1>
          <p className="text-foreground/60">Gestiona las configuraciones globales de la plataforma</p>
        </header>

        <div className="p-6 md:p-8 rounded-3xl bg-card border border-border mb-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-accent-primary/10 flex items-center justify-center text-accent-primary">
              <Settings size={24} />
            </div>
            <h2 className="text-xl font-black">Configuración de Pagos</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-foreground mb-2">
                Dirección de PayPal
              </label>
              <input
                type="text"
                value={paypalAddress}
                onChange={(e) => setPaypalAddress(e.target.value)}
                placeholder="ej: pagos@tudominio.com o 'No disponible'"
                className="w-full px-4 py-3 rounded-xl bg-foreground/5 border border-border focus:border-accent-primary focus:outline-none transition-all"
              />
              <p className="text-xs text-foreground/50 mt-2">
                Esta dirección se mostrará a los usuarios en sus facturas pendientes
              </p>
            </div>

            <button
              onClick={saveSettings}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-accent-primary text-black font-bold hover:opacity-90 transition-all disabled:opacity-50"
            >
              {saving ? (
                'Guardando...'
              ) : (
                <>
                  <Save size={20} />
                  Guardar Configuración
                </>
              )}
            </button>

            {successMessage && (
              <div className="flex items-center gap-2 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500">
                <CheckCircle2 size={20} />
                <span className="font-bold">{successMessage}</span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
