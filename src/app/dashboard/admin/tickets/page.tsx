'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Send, XCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
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
}

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  category: string;
  priority: string;
  created_at: string;
  user_id: string;
  profiles?: {
    id: string;
    email: string;
    full_name: string;
  };
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

export default function AdminTicketsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchData = useCallback(async () => {
    try {
      setError(null);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (profileError) {
        setError(`Error al cargar el perfil: ${profileError.message}`);
        console.error('Profile error:', profileError);
        return;
      }

      if (!profileData || profileData.role !== 'admin') {
        router.push('/dashboard');
        return;
      }

      setProfile(profileData);

      // Obtener tickets sin JOIN primero
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (ticketError) {
        setError(`Error al cargar tickets: ${ticketError.message}`);
        console.error('Tickets error:', ticketError);
        if (ticketData) setTickets(ticketData);
        return;
      }

      if (ticketData) {
        // Obtener perfiles separadamente
        const userIds = [...new Set(ticketData.map(t => t.user_id).filter(Boolean))];
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .in('id', userIds);
          
          if (profilesData) {
            const profileMap = new Map(profilesData.map(p => [p.id, p]));
            const joinedData = ticketData.map(ticket => ({
              ...ticket,
              profiles: profileMap.get(ticket.user_id)
            }));
            setTickets(joinedData);
          } else {
            setTickets(ticketData);
          }
        } else {
          setTickets(ticketData);
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(`Error inesperado: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [user, router]);

  const fetchMessages = useCallback(async (ticketId: string) => {
    try {
      const { data: messageData } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (messageData) setMessages(messageData);
      scrollToBottom();
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchData();
    }
  }, [user, authLoading, router, fetchData]);

  const handleSelectTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    fetchMessages(ticket.id);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTicket || !user) return;

    try {
      await supabase.from('ticket_messages').insert([
        {
          ticket_id: selectedTicket.id,
          user_id: user.id,
          message: newMessage.trim(),
          is_admin: true
        }
      ]);

      // Si el ticket está abierto, lo ponemos en proceso
      if (selectedTicket.status === 'open') {
        await supabase.from('tickets').update({ status: 'in_progress' }).eq('id', selectedTicket.id);
      }

      setNewMessage('');
      await fetchData(); // Actualizar la lista de tickets
      await fetchMessages(selectedTicket.id); // Actualizar mensajes
    } catch (err) {
      console.error('Error sending message:', err as PostgrestError);
    }
  };

  const handleChangeStatus = async (ticketId: string, newStatus: string) => {
    try {
      await supabase.from('tickets').update({ status: newStatus }).eq('id', ticketId);
      await fetchData();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      console.error('Error changing status:', err as PostgrestError);
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const categoryLabels: Record<string, string> = {
    'technical': 'Técnico',
    'billing': 'Facturación',
    'account': 'Cuenta',
    'other': 'Otros'
  };

  const statusLabels: Record<string, string> = {
    'open': 'Abierto',
    'in_progress': 'En proceso',
    'resolved': 'Resuelto',
    'closed': 'Cerrado'
  };

  const openTickets = tickets.filter(t => t.status === 'open');
  const inProgressTickets = tickets.filter(t => t.status === 'in_progress');
  const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed');

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row h-screen">
      <Sidebar
        activePage="admin-tickets"
        userRole={profile?.role || 'user'}
        userInitials={profile ? getInitials(profile.full_name) : 'U'}
        userEmail={user?.email || ''}
        userName={profile?.full_name || 'Usuario'}
      />

      <main className="flex-1 flex flex-col h-screen overflow-hidden pt-16 md:pt-0">
        <header className="p-4 md:p-6 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-500">
              <MessageSquare size={24} className="md:w-7 md:h-7" />
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-black">Gestión de Tickets</h1>
              <p className="text-foreground/60 text-xs md:text-sm">Gestiona todos los tickets de soporte</p>
            </div>
          </div>
        </header>

        {error && (
          <div className="p-4 m-4 md:m-6 rounded-xl bg-red-500/10 border border-red-500 text-red-500 flex items-center gap-3">
            <XCircle size={20} />
            <div>
              <p className="font-bold text-sm md:text-base">Error</p>
              <p className="text-xs md:text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row h-full overflow-hidden">
          {/* Tickets List - Hide when ticket selected on mobile */}
          <div className={`${selectedTicket ? 'hidden md:flex' : 'flex'} w-full md:w-96 border-r border-border bg-card overflow-y-auto`}>
            <div className="w-full">
              <div className="p-4 md:p-6 border-b border-border">
                <h2 className="text-lg md:text-xl font-black mb-4">Todos los Tickets</h2>
                
                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="p-2 rounded-xl bg-red-500/10 text-center">
                    <p className="text-xs text-foreground/60">Abierto</p>
                    <p className="text-lg font-black text-red-500">{openTickets.length}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-yellow-500/10 text-center">
                    <p className="text-xs text-foreground/60">Proceso</p>
                    <p className="text-lg font-black text-yellow-500">{inProgressTickets.length}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-green-500/10 text-center">
                    <p className="text-xs text-foreground/60">Resuelto</p>
                    <p className="text-lg font-black text-green-500">{resolvedTickets.length}</p>
                  </div>
                </div>
              </div>

              <div className="p-3 md:p-4 space-y-2">
                {tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => handleSelectTicket(ticket)}
                    className={`w-full text-left p-3 md:p-4 rounded-xl transition-all ${
                      selectedTicket?.id === ticket.id 
                        ? 'bg-accent-primary/20 border border-accent-primary' 
                        : 'bg-foreground/5 hover:bg-foreground/10 border border-transparent hover:border-foreground/10'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-bold text-sm md:text-base truncate flex-1 mr-2">{ticket.subject}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase shrink-0 ${
                        ticket.status === 'open' ? 'bg-red-500/10 text-red-500' :
                        ticket.status === 'in_progress' ? 'bg-yellow-500/10 text-yellow-500' :
                        ticket.status === 'resolved' ? 'bg-green-500/10 text-green-500' :
                        'bg-gray-500/10 text-gray-500'
                      }`}>
                        {statusLabels[ticket.status]}
                      </span>
                    </div>
                    <div className="text-xs md:text-sm text-foreground/50 mb-1">
                      {ticket.profiles?.full_name || 'Usuario desconocido'}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>{ticket.ticket_number}</span>
                      <span className="text-foreground/40">{formatDate(ticket.created_at)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Chat Interface - Only show when ticket selected on mobile */}
          <div className={`${!selectedTicket ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-card overflow-hidden`}>
            {selectedTicket ? (
              <>
                {/* Chat Header */}
                <div className="p-4 md:p-6 border-b border-border bg-card">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {/* Back button for mobile */}
                      <button
                        onClick={() => setSelectedTicket(null)}
                        className="md:hidden p-2 hover:bg-foreground/10 rounded-xl transition-all"
                      >
                        <ArrowLeft size={20} />
                      </button>
                      <div>
                        <h2 className="text-lg md:text-xl font-bold truncate">{selectedTicket.subject}</h2>
                        <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-1">
                          <span className="text-foreground/50 text-xs md:text-sm">{selectedTicket.ticket_number}</span>
                          <span className="text-foreground/50 text-xs md:text-sm">
                            {selectedTicket.profiles?.full_name || 'Usuario desconocido'}
                          </span>
                          <span className="text-foreground/40 text-xs md:text-sm">{categoryLabels[selectedTicket.category]}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                        <button
                          onClick={() => handleChangeStatus(selectedTicket.id, 'resolved')}
                          className="flex items-center gap-1 px-2 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-lg transition-all text-xs md:text-sm font-bold"
                        >
                          <CheckCircle2 size={14} className="md:w-4 md:h-4" /> Resolver
                        </button>
                      )}
                      {selectedTicket.status !== 'closed' && (
                        <button
                          onClick={() => handleChangeStatus(selectedTicket.id, 'closed')}
                          className="flex items-center gap-1 px-2 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all text-xs md:text-sm font-bold"
                        >
                          <XCircle size={14} className="md:w-4 md:h-4" /> Cerrar
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 bg-background/50">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.is_admin ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[90%] md:max-w-[70%] p-3 md:p-4 rounded-2xl ${
                        message.is_admin
                          ? 'bg-accent-secondary/20 border border-accent-secondary/30 text-foreground'
                          : 'bg-foreground/5 border border-foreground/10 text-foreground'
                      }`}>
                        <div className="flex items-center gap-2 mb-1 md:mb-2">
                          <span className={`text-[10px] md:text-xs font-bold uppercase ${
                            message.is_admin ? 'text-accent-secondary' : 'text-accent-primary'
                          }`}>
                            {message.is_admin ? 'Administrador' : (
                              selectedTicket.profiles?.full_name || 'Usuario'
                            )}
                          </span>
                        </div>
                        <p className="mb-1 md:mb-2 text-sm md:text-base">{message.message}</p>
                        <p className="text-[10px] md:text-xs text-foreground/40">{formatDate(message.created_at)}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 md:p-6 border-t border-border bg-card">
                  <form onSubmit={handleSendMessage} className="flex gap-2 md:gap-4">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1 bg-background border border-border rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-foreground focus:outline-none focus:border-accent-primary transition-all text-sm md:text-base"
                      placeholder="Escribe tu mensaje..."
                      disabled={selectedTicket.status === 'closed'}
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || selectedTicket.status === 'closed'}
                      className="bg-accent-primary text-black p-2.5 md:p-3 rounded-xl hover:bg-accent-primary/80 transition-all disabled:opacity-50"
                    >
                      <Send size={18} className="md:w-5 md:h-5" />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-8 text-center">
                <div className="text-foreground/20 mb-6">
                  <MessageSquare size={60} className="md:w-20 md:h-20" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold mb-2 text-foreground/60">Gestión de Tickets</h2>
                <p className="text-foreground/40 mb-8 max-w-sm md:max-w-md text-sm md:text-base">
                  Selecciona un ticket para ver su conversación y responder como administrador
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
