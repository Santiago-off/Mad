'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { AuthError } from '@supabase/supabase-js';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      router.push('/dashboard');
    } catch (err) {
      setError((err as AuthError).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative">
      {/* Background Grid */}
      <div className="absolute inset-0" style={{
        backgroundImage: `
          linear-gradient(to right, rgba(0, 255, 0, 0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(0, 255, 0, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px'
      }} />

      <div className="max-w-sm w-full bg-card border border-border rounded-2xl p-6 shadow-2xl relative z-10">
        <div className="flex items-center justify-center gap-2 mb-5">
          <Image
            src="/logo.png"
            alt="MAD Agency"
            width={50}
            height={50}
            style={{ background: 'transparent' }}
          />
          <div className="text-xl font-black tracking-tighter">
            MAD<span className="text-accent-primary">AGENCY</span>
          </div>
        </div>

        <h1 className="text-2xl font-black text-center mb-1">Iniciar Sesión</h1>
        <p className="text-foreground/60 text-center mb-6 text-sm">Accede a tu cuenta</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-3 py-2 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-accent-primary transition-colors text-sm"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-accent-primary transition-colors text-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent-primary text-black font-black py-2.5 rounded-lg hover:bg-accent-primary/80 transition-all disabled:opacity-50 text-sm"
          >
            {loading ? 'Cargando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <p className="text-foreground/60 text-xs">
            ¿No tienes cuenta?{' '}
            <Link href="/signup" className="text-accent-primary font-bold hover:underline">
              Regístrate
            </Link>
          </p>
        </div>

        <div className="mt-3 text-center">
          <Link href="/" className="text-foreground/40 text-xs hover:underline">
            ← Volver a la página principal
          </Link>
        </div>
      </div>
    </div>
  );
}