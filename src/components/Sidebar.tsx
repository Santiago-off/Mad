'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Home, 
  CreditCard, 
  Zap, 
  Settings, 
  MessageSquare, 
  Shield, 
  TrendingUp, 
  FileText, 
  Users, 
  BarChart3,
  LogOut,
  MessageSquare as TicketIcon,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';

interface SidebarProps {
  activePage: string;
  userRole: string | null;
  userInitials: string;
  userEmail: string;
  userName: string;
}

export default function Sidebar({
  activePage,
  userRole,
  userInitials,
  userEmail,
  userName
}: SidebarProps) {
  const { signOut } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
    setMobileMenuOpen(false);
  };

  const navItems = [
    { id: 'dashboard', label: 'Inicio', icon: <Home size={20} />, href: '/dashboard' },
    { id: 'subscription', label: 'Mi Plan', icon: <CreditCard size={20} />, href: '/dashboard/subscription' },
    { id: 'billing', label: 'Pagos y Facturas', icon: <FileText size={20} />, href: '/dashboard/billing' },
    { id: 'services', label: 'Servicios', icon: <Zap size={20} />, href: '/dashboard/services' },
    { id: 'support', label: 'Soporte', icon: <MessageSquare size={20} />, href: '/dashboard/support' },
    { id: 'activity', label: 'Actividad', icon: <TrendingUp size={20} />, href: '/dashboard/activity' },
    { id: 'settings', label: 'Ajustes', icon: <Settings size={20} />, href: '/dashboard/settings' },
  ];

  const adminNavItems = [
    { id: 'admin', label: 'Panel Admin', icon: <Shield size={20} />, href: '/dashboard/admin' },
    { id: 'admin-users', label: 'Usuarios', icon: <Users size={20} />, href: '/dashboard/admin/users' },
    { id: 'admin-subscriptions', label: 'Suscripciones', icon: <CreditCard size={20} />, href: '/dashboard/admin/subscriptions' },
    { id: 'admin-tickets', label: 'Tickets', icon: <TicketIcon size={20} />, href: '/dashboard/admin/tickets' },
    { id: 'admin-finances', label: 'Finanzas', icon: <BarChart3 size={20} />, href: '/dashboard/admin/finances' },
    { id: 'admin-settings', label: 'Configuración', icon: <Settings size={20} />, href: '/dashboard/admin/settings' },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col bg-card h-full w-full md:w-72 border-r border-border">
      <div className="flex items-center justify-between p-6 border-b border-border md:border-b-0">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Image
            src="/logo.png"
            alt="MAD Agency Logo"
            width={50}
            height={50}
            priority
            style={{ background: 'transparent' }}
          />
          <div className="text-xl font-black tracking-tighter">
            MAD<span className="text-accent-primary">AGENCY</span>
          </div>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="md:hidden p-2 hover:bg-foreground/10 rounded-xl transition-all"
        >
          <X size={24} />
        </button>
      </div>

      <nav className="flex-1 space-y-2 p-4 overflow-y-auto">
        {navItems.map((item) => (
          <Link 
            key={item.id}
            href={item.href}
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activePage === item.id 
                ? 'bg-accent-primary/10 text-accent-primary font-bold' 
                : 'hover:bg-foreground/5 font-medium'
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}

        {userRole === 'admin' && (
          <div className="mt-8 pt-6 border-t border-border">
            <h3 className="text-xs font-bold uppercase text-foreground/50 mb-3 px-4">Administración</h3>
            {adminNavItems.map((item) => (
              <Link 
                key={item.id}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activePage === item.id 
                    ? 'bg-accent-primary/10 text-accent-primary font-bold' 
                    : 'hover:bg-foreground/5 font-medium'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      <div className="mt-auto pt-6 border-t border-border p-4">
        <div className="flex items-center gap-3 px-4 py-2 mb-4">
          <div className="w-10 h-10 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary font-bold">
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{userName}</p>
            <p className="text-xs text-foreground/50 truncate">{userEmail}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-500/10 rounded-xl font-medium transition-all"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Header with Hamburger */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-card border-b border-border p-4 z-50 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Image
            src="/logo.png"
            alt="MAD Agency Logo"
            width={40}
            height={40}
            priority
            style={{ background: 'transparent' }}
          />
          <div className="text-lg font-black tracking-tighter">
            MAD<span className="text-accent-primary">AGENCY</span>
          </div>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 hover:bg-foreground/10 rounded-xl transition-all"
        >
          <Menu size={28} />
        </button>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Sidebar */}
          <div className="absolute left-0 top-0 bottom-0 w-80 animate-slide-in">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}
