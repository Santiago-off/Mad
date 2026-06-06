'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { AuthError } from '@supabase/supabase-js';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Sign up with Supabase Auth (profile creation handled by database trigger)
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      });

      if (authError) throw authError;

      setSuccess(true);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (err) {
      setError((err as AuthError).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8 relative">
      {/* Background Grid */}
      <div className="absolute inset-0" style={{
        backgroundImage: `
          linear-gradient(to right, rgba(0, 255, 0, 0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(0, 255, 0, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px'
      }} />

      <div className="max-w-sm w-full bg-card border border-border rounded-2xl p-6 md:p-8 shadow-2xl relative z-10">
        <div className="flex items-center justify-center gap-2 md:gap-3 mb-6">
          <Image
            src="/logo.png"
            alt="MAD Agency"
            width={40}
            height={40}
            priority
            style={{ background: 'transparent' }}
          />
          <div className="text-lg md:text-xl font-black tracking-tighter">
            MAD<span className="text-accent-primary">AGENCY</span>
          </div>
        </div>

        <h1 className="text-xl md:text-2xl font-black text-center mb-2">Crear Cuenta</h1>
        <p className="text-foreground/60 text-center mb-6 text-xs md:text-sm">Empieza tu viaje con MAD</p>

        {success && (
          <div className="bg-green-500/10 border border-green-500 text-green-500 px-3 md:px-4 py-2 md:py-3 rounded-lg mb-4 md:mb-6 text-xs md:text-sm">
            ¡Cuenta creada con éxito! Redirigiendo...
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-3 md:px-4 py-2 md:py-3 rounded-lg mb-4 md:mb-6 text-xs md:text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4 md:space-y-5">
          <div>
            <label className="block text-xs md:text-sm font-bold mb-1 md:mb-2">Nombre Completo</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full bg-background border border-border rounded-lg px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base text-foreground focus:outline-none focus:border-accent-primary transition-colors"
              placeholder="Tu nombre"
            />
          </div>

          <div>
            <label className="block text-xs md:text-sm font-bold mb-1 md:mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-background border border-border rounded-lg px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base text-foreground focus:outline-none focus:border-accent-primary transition-colors"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="block text-xs md:text-sm font-bold mb-1 md:mb-2">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-background border border-border rounded-lg px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base text-foreground focus:outline-none focus:border-accent-primary transition-colors"
              placeholder="•••••••• (mínimo 6)"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent-primary text-black font-black py-2.5 md:py-3 rounded-lg hover:bg-accent-primary/80 transition-all disabled:opacity-50 text-sm md:text-base"
          >
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>
        </form>

        <div className="mt-5 md:mt-6 text-center">
          <p className="text-foreground/60 text-xs md:text-sm">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-accent-primary font-bold hover:underline">
              Inicia Sesión
            </Link>
          </p>
        </div>

        <div className="mt-3 md:mt-4 text-center">
          <Link href="/" className="text-foreground/40 text-xs md:text-sm hover:underline">
            ← Volver a la página principal
          </Link>
        </div>
      </div>
    </div>
  );
}
