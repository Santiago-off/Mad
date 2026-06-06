'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Users, Search, Edit2, Ban, CheckCircle2, XCircle } from 'lucide-react';
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

interface UserData {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  banned?: boolean;
}

export default function AdminUsersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
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

      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) {
        setError(`Error al cargar usuarios: ${usersError.message}`);
        console.error('Users error:', usersError);
        return;
      }

      if (usersData) setUsers(usersData);
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

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      fetchData();
    } catch (err) {
      console.error('Error updating role:', err);
    }
  };

  const toggleBanUser = async (userId: string, currentBanned: boolean) => {
    try {
      await supabase
        .from('profiles')
        .update({ banned: !currentBanned })
        .eq('id', userId);

      fetchData();
    } catch (err) {
      console.error('Error toggling ban:', err);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = !searchTerm || 
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || u.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row h-screen">
      <Sidebar
        activePage="admin-users"
        userRole={profile?.role || 'user'}
        userInitials={profile ? getInitials(profile.full_name) : 'U'}
        userEmail={user?.email || ''}
        userName={profile?.full_name || 'Usuario'}
      />

      <main className="flex-1 p-4 md:p-12 max-w-6xl mx-auto overflow-y-auto pt-20 md:pt-12">
        <header className="mb-8 md:mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-accent-primary/20 flex items-center justify-center text-accent-primary">
              <Users size={24} className="md:w-7 md:h-7" />
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-black">Gestión de Usuarios</h1>
              <p className="text-foreground/60 text-xs md:text-sm">Administra los usuarios de la plataforma</p>
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

        {/* Filters */}
        <div className="p-4 md:p-6 rounded-2xl md:rounded-3xl bg-card border border-border mb-8 flex flex-col md:flex-wrap md:flex-row gap-4 items-center">
          <div className="flex-1 min-w-full md:min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-background border border-border rounded-xl pl-12 pr-4 py-3 text-foreground focus:outline-none focus:border-accent-primary transition-all text-sm md:text-base"
                placeholder="Buscar usuarios..."
              />
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <label className="text-xs md:text-sm text-foreground/60">Rol:</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="flex-1 md:flex-none bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-accent-primary text-sm md:text-base"
            >
              <option value="all">Todos</option>
              <option value="user">Usuario</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        {/* Users List */}
        <div className="p-4 md:p-8 rounded-2xl md:rounded-3xl bg-card border border-border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-foreground/10">
                  <th className="text-left pb-4 font-bold text-foreground/60 text-xs md:text-sm">Usuario</th>
                  <th className="text-left pb-4 font-bold text-foreground/60 text-xs md:text-sm hidden sm:table-cell">Email</th>
                  <th className="text-left pb-4 font-bold text-foreground/60 text-xs md:text-sm">Estado</th>
                  <th className="text-left pb-4 font-bold text-foreground/60 text-xs md:text-sm hidden md:table-cell">Rol</th>
                  <th className="text-left pb-4 font-bold text-foreground/60 text-xs md:text-sm hidden lg:table-cell">Registrado</th>
                  <th className="text-right pb-4 font-bold text-foreground/60 text-xs md:text-sm">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((userData) => (
                  <tr key={userData.id} className={`border-b border-foreground/5 hover:bg-foreground/5 ${userData.banned ? 'opacity-60' : ''}`}>
                    <td className="py-4">
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary font-bold text-xs md:text-sm">
                          {getInitials(userData.full_name)}
                        </div>
                        <span className="font-bold text-xs md:text-sm">{userData.full_name}</span>
                      </div>
                    </td>
                    <td className="py-4 text-foreground/60 text-xs md:text-sm hidden sm:table-cell">
                      {userData.email}
                    </td>
                    <td className="py-4">
                      <span className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold uppercase ${
                        userData.banned ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'
                      }`}>
                        {userData.banned ? 'Baneado' : 'Activo'}
                      </span>
                    </td>
                    <td className="py-4 hidden md:table-cell">
                      <div className="relative">
                        <select
                          value={userData.role}
                          onChange={(e) => updateUserRole(userData.id, e.target.value)}
                          className={`bg-transparent px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold border ${
                            userData.role === 'admin'
                              ? 'bg-accent-primary/10 text-accent-primary border-accent-primary/30'
                              : 'bg-foreground/10 text-foreground/70 border-transparent'
                          }`}
                        >
                          <option value="user">Usuario</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </td>
                    <td className="py-4 text-foreground/60 text-xs md:text-sm hidden lg:table-cell">
                      {formatDate(userData.created_at)}
                    </td>
                    <td className="py-4 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleBanUser(userData.id, !!userData.banned)}
                        className={`p-2 rounded-lg transition-all ${
                          userData.banned
                            ? 'bg-green-500/10 hover:bg-green-500/20 text-green-500'
                            : 'bg-red-500/10 hover:bg-red-500/20 text-red-500'
                        }`}
                        title={userData.banned ? 'Desbanear' : 'Banear'}
                      >
                        {userData.banned ? <CheckCircle2 size={14} className="md:w-4 md:h-4" /> : <Ban size={14} className="md:w-4 md:h-4" />}
                      </button>
                      <button className="p-2 hover:bg-foreground/10 rounded-lg transition-all">
                        <Edit2 size={14} className="md:w-4 md:h-4" />
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
