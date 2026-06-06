'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { User, Mail, Lock, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import type { AuthError, PostgrestError } from '@supabase/supabase-js';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role?: string;
  created_at: string;
  updated_at: string;
}

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (!profileError && profileData) {
        setProfile(profileData);
        setFullName(profileData.full_name);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
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
      fetchProfile();
    }
  }, [user, authLoading, router, fetchProfile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setLoading(true);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      // Log activity
      await supabase.from('activity_log').insert([
        {
          user_id: user?.id,
          action: 'update_profile',
          details: 'Updated profile information'
        }
      ]);

      setMessage('Perfil actualizado con éxito!');
    } catch (err) {
      const error = err as PostgrestError;
      setError(error.message || 'Error al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      // Log activity
      await supabase.from('activity_log').insert([
        {
          user_id: user?.id,
          action: 'update_password',
          details: 'Updated password'
        }
      ]);

      setMessage('Contraseña actualizada con éxito!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const error = err as AuthError;
      setError(error.message || 'Error al actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

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
        activePage="settings"
        userRole={profile?.role || 'user'}
        userInitials={profile ? getInitials(profile.full_name) : 'U'}
        userEmail={user?.email || ''}
        userName={profile?.full_name || 'Usuario'}
      />

      <main className="flex-1 p-6 md:p-12 max-w-4xl mx-auto overflow-y-auto">
        <header className="mb-12">
          <h1 className="text-3xl font-black mb-2">Ajustes de Cuenta</h1>
          <p className="text-foreground/60">Gestiona tus datos y preferencias</p>
        </header>

        {message && (
          <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500 text-green-500 flex items-center gap-3">
            <CheckCircle2 size={20} />
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500 text-red-500 flex items-center gap-3">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profile Settings */}
          <div className="p-8 rounded-3xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-accent-primary/10 flex items-center justify-center text-accent-primary">
                <User size={24} />
              </div>
              <h2 className="text-xl font-black">Datos Personales</h2>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-2 text-foreground/70">
                  Nombre Completo
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl pl-12 pr-4 py-3 text-foreground focus:outline-none focus:border-accent-primary transition-all"
                    placeholder="Tu nombre completo"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-foreground/70">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full bg-background/50 border border-border rounded-xl pl-12 pr-4 py-3 text-foreground/50 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-foreground/40 mt-2">
                  Contacta con soporte para cambiar tu email
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-accent-primary text-black font-bold py-3 rounded-xl hover:bg-accent-primary/80 transition-all disabled:opacity-50"
              >
                <Save size={18} />
                {loading ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </form>
          </div>

          {/* Password Settings */}
          <div className="p-8 rounded-3xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-accent-secondary/10 flex items-center justify-center text-accent-secondary">
                <Lock size={24} />
              </div>
              <h2 className="text-xl font-black">Seguridad</h2>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-2 text-foreground/70">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl pl-12 pr-4 py-3 text-foreground focus:outline-none focus:border-accent-secondary transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-foreground/70">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl pl-12 pr-4 py-3 text-foreground focus:outline-none focus:border-accent-secondary transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-accent-secondary text-white font-bold py-3 rounded-xl hover:bg-accent-secondary/80 transition-all disabled:opacity-50"
              >
                <Lock size={18} />
                {loading ? 'Actualizando...' : 'Actualizar contraseña'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}