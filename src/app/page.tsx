'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Check, ArrowRight, Zap, TrendingUp, ShieldCheck, Star, Users, Award, Trophy, User, Code } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useAuth } from '@/components/AuthProvider';

export default function LandingPage() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const plans = [
    {
      name: 'Plan de Prueba',
      price: 'Gratuito',
      description: 'Empieza a crecer sin compromiso.',
      features: [
        'Visibilidad',
        'Pequeña estrategia para implementar tu impacto en redes'
      ],
      accent: 'primary',
      fullWidth: true
    },
    {
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
      popular: true
    },
    {
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
      accent: 'secondary'
    },
    {
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
      accent: 'secondary'
    }
  ];

  const reviews = [
    {
      name: 'Alex "Nitro" G.',
      role: 'Pro Player & Streamer',
      content: 'Desde que me uní a MAD, mi visibilidad en Twitter ha subido un 200%. La gestión de ofertas es impecable.',
      stars: 5
    },
    {
      name: 'Elena "Valkyria"',
      role: 'Content Creator',
      content: 'El Plan Pro cambió mi forma de ver las redes. Ahora tengo una identidad digital sólida y patrocinios reales.',
      stars: 5
    },
    {
      name: 'Marcus K.',
      role: 'Esports Athlete',
      content: 'Increíble soporte. Me ayudaron a encontrar mi equipo actual en menos de 15 días. 100% recomendados.',
      stars: 5
    }
  ];

  const stats = [
    { label: 'Clientes Activos', value: '+500', icon: <Users className="w-6 h-6" /> },
    { label: 'Marcas Aliadas', value: '15', icon: <Award className="w-6 h-6" /> },
    { label: 'Equipos Encontrados', value: '60', icon: <Trophy className="w-6 h-6" /> },
  ];

  const team = [
    {
      name: 'Ziick',
      role: 'CEO & Manager Principal',
      icon: <User className="w-12 h-12" />
    },
    {
      name: 'White',
      role: 'CTO & Developer Web',
      icon: <Code className="w-12 h-12" />
    }
  ];

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 }
  };

  const staggerContainer = {
    initial: {},
    whileInView: { transition: { staggerChildren: 0.1 } },
    viewport: { once: true }
  };

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-background text-foreground font-sans overflow-x-hidden relative"
    >
      {/* Interactive Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Grid Lines */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0, 255, 0, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 255, 0, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
        
        {/* Mouse Follower Glow */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            left: mousePosition.x - 150,
            top: mousePosition.y - 150,
            width: 300,
            height: 300,
            background: 'radial-gradient(circle, rgba(0, 255, 0, 0.15) 0%, transparent 70%)'
          }}
          animate={{
            x: 0,
            y: 0
          }}
          transition={{
            type: 'spring',
            stiffness: 50,
            damping: 20
          }}
        />
      </div>

      {/* Navigation */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto relative z-10"
      >
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="MAD Agency Logo"
            width={70}
            height={70}
            priority
            style={{ background: 'transparent' }}
          />
          <div className="text-2xl font-black tracking-tighter">
            MAD<span className="text-accent-primary">AGENCY</span>
          </div>
        </div>
        <div className="hidden md:flex items-center space-x-6 font-medium">
          <a href="#services" className="hover:text-accent-primary transition-colors">Servicios</a>
          <a href="#pricing" className="hover:text-accent-primary transition-colors">Precios</a>
          {user ? (
            <Link href="/dashboard" className="bg-accent-primary text-black px-6 py-3 rounded-full text-sm font-bold hover:opacity-80 transition-opacity">
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className="bg-accent-primary text-black px-6 py-3 rounded-full text-sm font-bold hover:opacity-80 transition-opacity">
              Iniciar Sesión
            </Link>
          )}
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="px-6 py-20 md:py-32 max-w-7xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className="text-5xl md:text-8xl font-black tracking-tight mb-6 leading-none">
            ELEVA TU <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-primary">
              IDENTIDAD DIGITAL
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-foreground/60 max-w-2xl mx-auto mb-10">
            En MAD Agency impulsamos tu carrera digital con estrategias personalizadas y gestión profesional en el mundo gaming.
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <a href="#pricing" className="w-full md:w-auto bg-accent-primary text-black px-8 py-4 rounded-full text-lg font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all group">
                Empezar ahora <ArrowRight className="group-hover:translate-x-1 transition-transform" />
              </a>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="px-6 py-12 bg-accent-primary/5 border-y border-accent-primary/10 relative z-10">
        <motion.div 
          variants={staggerContainer}
          initial="initial"
          whileInView="whileInView"
          viewport={{ once: true }}
          className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {stats.map((stat, idx) => (
            <motion.div 
              key={idx}
              variants={fadeInUp}
              className="flex flex-col items-center justify-center text-center p-6"
            >
              <div className="mb-4 text-accent-primary">{stat.icon}</div>
              <div className="text-4xl font-black mb-1">{stat.value}</div>
              <div className="text-foreground/50 uppercase tracking-widest text-xs font-bold">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Services Section */}
      <section id="services" className="px-6 py-20 bg-foreground/5 relative z-10">
        <div className="max-w-7xl mx-auto">
          <motion.h2 
            {...fadeInUp}
            className="text-3xl md:text-5xl font-black mb-16 text-center"
          >
            LO QUE HACEMOS POR TI
          </motion.h2>
          <motion.div 
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            <ServiceCard 
              icon={<Zap className="w-8 h-8 text-accent-primary" />}
              title="Visibilidad"
              description="Aumentamos tu alcance orgánico y presencia en las plataformas más relevantes del sector gaming."
            />
            <ServiceCard 
              icon={<TrendingUp className="w-8 h-8 text-accent-primary" />}
              title="Estrategia"
              description="Creamos un plan de acción detallado para que tu marca personal destaque sobre la competencia."
            />
            <ServiceCard 
              icon={<ShieldCheck className="w-8 h-8 text-accent-primary" />}
              title="Gestión"
              description="Nos encargamos de las ofertas y la organización para que tú solo te preocupes de jugar y crear."
            />
          </motion.div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="px-6 py-20 bg-background relative z-10">
        <div className="max-w-7xl mx-auto">
          <motion.h2 
            {...fadeInUp}
            className="text-3xl md:text-5xl font-black mb-16 text-center"
          >
            LO QUE DICEN NUESTROS TALENTOS
          </motion.h2>
          <motion.div 
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {reviews.map((review, idx) => (
              <motion.div 
                key={idx}
                variants={fadeInUp}
                whileHover={{ y: -10 }}
                className="p-8 rounded-3xl bg-card border border-border shadow-sm"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(review.stars)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-accent-primary text-accent-primary" />
                  ))}
                </div>
                <p className="text-lg italic mb-6 text-foreground/80">{`"${review.content}"`}</p>
                <div>
                  <div className="font-bold">{review.name}</div>
                  <div className="text-sm text-foreground/50">{review.role}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="px-6 py-20 max-w-7xl mx-auto relative z-10">
        <motion.h2 
          {...fadeInUp}
          className="text-3xl md:text-5xl font-black mb-16 text-center"
        >
          ELIGE TU PLAN
        </motion.h2>
        
        {/* Free Plan - Full Width */}
        <motion.div 
          {...fadeInUp}
          whileHover={{ scale: 1.01 }}
          className="mb-8"
        >
          <div className={`relative p-8 rounded-3xl border-2 transition-all border-accent-primary bg-card shadow-xl`}>
            <h3 className="text-2xl font-bold mb-2">{plans[0].name}</h3>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-4xl font-black">{plans[0].price}</span>
            </div>
            <p className="text-foreground/70 mb-8">{plans[0].description}</p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
              {plans[0].features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="w-5 h-5 shrink-0 text-accent-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 rounded-xl font-bold transition-all bg-accent-primary text-black hover:bg-accent-primary/80"
            >
              Seleccionar {plans[0].name}
            </motion.button>
          </div>
        </motion.div>

        {/* Other Plans Grid */}
        <motion.div 
          variants={staggerContainer}
          initial="initial"
          whileInView="whileInView"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {plans.slice(1).map((plan) => (
            <motion.div 
              key={plan.name}
              variants={fadeInUp}
              whileHover={{ scale: 1.03, y: -10 }}
              className={`relative p-8 rounded-3xl border-2 transition-all ${
                plan.popular ? 'border-accent-primary bg-card shadow-2xl' : 'border-border bg-card'
              }`}
            >
              {plan.popular && (
                <motion.div 
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  className="absolute -top-4 left-1/2 -translate-x-1/2 bg-accent-primary text-black px-4 py-1 rounded-full text-sm font-bold shadow-lg"
                >
                  RECOMENDADO
                </motion.div>
              )}
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-black">{plan.price}</span>
              </div>
              <p className="text-foreground/70 mb-8">{plan.description}</p>
              <ul className="space-y-4 mb-10">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-5 h-5 shrink-0 text-accent-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 rounded-xl font-bold transition-all bg-accent-primary text-black hover:bg-accent-primary/80"
              >
                Seleccionar {plan.name}
              </motion.button>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Team Section */}
      <section className="px-6 py-20 bg-foreground/5 relative z-10">
        <div className="max-w-7xl mx-auto">
          <motion.h2 
            {...fadeInUp}
            className="text-3xl md:text-5xl font-black mb-16 text-center"
          >
            NUESTRO EQUIPO
          </motion.h2>
          <motion.div 
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto"
          >
            {team.map((member, idx) => (
              <motion.div 
                key={idx}
                variants={fadeInUp}
                whileHover={{ y: -10 }}
                className="p-8 rounded-3xl bg-card border border-border shadow-sm text-center"
              >
                <div className="mb-6 text-accent-primary flex justify-center">
                  {member.icon}
                </div>
                <h3 className="text-2xl font-bold mb-2">{member.name}</h3>
                <p className="text-foreground/60">{member.role}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20 text-center max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-accent-primary to-accent-secondary p-12 rounded-[3rem] text-black shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-black/10 rounded-full blur-3xl" />
          <h2 className="text-4xl md:text-6xl font-black mb-6 relative z-10">¿LISTO PARA EL SIGUIENTE NIVEL?</h2>
          <p className="text-xl opacity-90 mb-10 max-w-xl mx-auto relative z-10">
            Únete a la agencia que está cambiando las reglas del juego en el contenido digital.
          </p>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-black text-white px-10 py-5 rounded-full text-xl font-black hover:bg-opacity-90 transition-all relative z-10"
          >
            ¡HABLEMOS!
          </motion.button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 border-t border-border relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="MAD Agency Logo"
              width={55}
              height={55}
              priority
              style={{ background: 'transparent' }}
            />
            <div className="text-xl font-black tracking-tighter">
            MAD<span className="text-accent-primary">AGENCY</span>
          </div>
        </div>
        <div className="text-foreground/40 text-sm">
          © 2026 MAD AGENCY. Todos los derechos reservados.
          </div>
          <div className="flex gap-6 text-sm text-foreground/60">
            <a href="#" className="hover:text-accent-primary transition-colors">Términos</a>
            <a href="#" className="hover:text-accent-primary transition-colors">Privacidad</a>
            <a href="#" className="hover:text-accent-primary transition-colors">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ServiceCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <motion.div 
      variants={{
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 }
      }}
      whileHover={{ y: -10, transition: { duration: 0.2 } }}
      className="p-8 rounded-3xl bg-background border border-border hover:border-accent-primary/50 transition-colors shadow-sm"
    >
      <div className="mb-6">{icon}</div>
      <h3 className="text-xl font-bold mb-4">{title}</h3>
      <p className="text-foreground/60 leading-relaxed">{description}</p>
    </motion.div>
  );
}