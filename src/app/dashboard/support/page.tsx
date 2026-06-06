'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Send, Plus, ArrowLeft } from 'lucide-react';
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
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

export default function SupportPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketCategory, setNewTicketCategory] = useState('technical');
  const [newTicketDescription, setNewTicketDescription] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchData = useCallback(async () => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (profileData) setProfile(profileData);

      const { data: ticketData } = await supabase
        .from('tickets')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (ticketData) setTickets(ticketData);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

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

  const subscribeToTickets = useCallback(() => {
    if (!user) return () => {};
    const channel = supabase
      .channel('tickets_channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tickets',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchData]);

  const subscribeToMessages = useCallback((ticketId: string) => {
    const channel = supabase
      .channel(`ticket_messages_${ticketId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ticket_messages',
        filter: `ticket_id=eq.${ticketId}`
      }, () => {
        fetchMessages(ticketId);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMessages]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchData();
      return subscribeToTickets();
    }
  }, [user, authLoading, router, fetchData, subscribeToTickets]);

  const handleSelectTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    fetchMessages(ticket.id);
    return subscribeToMessages(ticket.id);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTicket) return;

    try {
      await supabase.from('ticket_messages').insert([
        {
          ticket_id: selectedTicket.id,
          user_id: user?.id,
          message: newMessage.trim(),
          is_admin: false
        }
      ]);

      await supabase.from('tickets').update({ status: 'in_progress' }).eq('id', selectedTicket.id);

      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err as PostgrestError);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const ticketNumber = `TK-${Date.now().toString().slice(-6)}`;
      const { data } = await supabase.from('tickets').insert([
        {
          user_id: user?.id,
          ticket_number: ticketNumber,
          subject: newTicketSubject,
          category: newTicketCategory,
          status: 'open',
          priority: 'normal'
        }
      ]).select();

      if (data) {
        await supabase.from('ticket_messages').insert([
          {
            ticket_id: data[0].id,
            user_id: user?.id,
            message: newTicketDescription,
            is_admin: false
          }
        ]);

        await supabase.from('activity_log').insert([
          {
            user_id: user?.id,
            action: 'create_ticket',
            details: `Created ticket: ${ticketNumber}`
          }
        ]);

        setShowCreateTicket(false);
        setNewTicketSubject('');
        setNewTicketCategory('technical');
        setNewTicketDescription('');
        fetchData();
      }
    } catch (err) {
      console.error('Error creating ticket:', err as PostgrestError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row h-screen">
      <Sidebar
        activePage="support"
        userRole={profile?.role || 'user'}
        userInitials={profile ? getInitials(profile.full_name) : 'U'}
        userEmail={user?.email || ''}
        userName={profile?.full_name || 'Usuario'}
      />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Create Ticket Modal */}
        {showCreateTicket && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6">
            <div className="bg-card border border-border rounded-3xl max-w-lg w-full p-8 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black">Nuevo Ticket</h2>
                <button
                  onClick={() => setShowCreateTicket(false)}
                  className="p-2 hover:bg-foreground/10 rounded-xl transition-all"
                >
                  <ArrowLeft size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold mb-2 text-foreground/70">Asunto</label>
                  <input
                    type="text"
                    value={newTicketSubject}
                    onChange={(e) => setNewTicketSubject(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-accent-primary transition-all"
                    placeholder="¿En qué podemos ayudarte?"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-foreground/70">Categoría</label>
                  <select
                    value={newTicketCategory}
                    onChange={(e) => setNewTicketCategory(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-accent-primary transition-all"
                  >
                    <option value="technical">Problema técnico</option>
                    <option value="billing">Facturación</option>
                    <option value="account">Cuenta</option>
                    <option value="other">Otros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-foreground/70">Descripción</label>
                  <textarea
                    value={newTicketDescription}
                    onChange={(e) => setNewTicketDescription(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-accent-primary transition-all min-h-[200px]"
                    placeholder="Cuéntanos tu problema detalladamente..."
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-accent-primary text-black font-bold py-4 rounded-xl hover:bg-accent-primary/80 transition-all disabled:opacity-50"
                >
                  {loading ? 'Creando ticket...' : 'Crear Ticket'}
                </button>
              </form>
            </div>
          </div>
        )}

        <div className="flex h-full">
          {/* Tickets List */}
          <div className="w-full md:w-96 border-r border-border bg-card overflow-y-auto">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black">Tickets</h2>
                <button
                  onClick={() => setShowCreateTicket(true)}
                  className="flex items-center gap-2 bg-accent-primary text-black px-4 py-2 rounded-xl font-bold hover:bg-accent-primary/80 transition-all"
                >
                  <Plus size={16} /> Nuevo
                </button>
              </div>
            </div>

            <div className="p-4 space-y-2">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => handleSelectTicket(ticket)}
                  className={`w-full text-left p-4 rounded-xl transition-all ${
                    selectedTicket?.id === ticket.id
                      ? 'bg-accent-primary/20 border border-accent-primary'
                      : 'bg-foreground/5 hover:bg-foreground/10 border border-transparent hover:border-foreground/10'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-bold">{ticket.subject}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                      ticket.status === 'open' ? 'bg-red-500/10 text-red-500' :
                      ticket.status === 'in_progress' ? 'bg-yellow-500/10 text-yellow-500' :
                      ticket.status === 'resolved' ? 'bg-green-500/10 text-green-500' :
                      'bg-gray-500/10 text-gray-500'
                    }`}>
                      {statusLabels[ticket.status]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground/50">{ticket.ticket_number}</span>
                    <span className="text-foreground/40">{formatDate(ticket.created_at)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Interface */}
          <div className="flex-1 flex flex-col bg-card overflow-hidden">
            {selectedTicket ? (
              <>
                {/* Chat Header */}
                <div className="p-6 border-b border-border bg-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold">{selectedTicket.subject}</h2>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-foreground/50 text-sm">{selectedTicket.ticket_number}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          selectedTicket.status === 'open' ? 'bg-red-500/10 text-red-500' :
                          selectedTicket.status === 'in_progress' ? 'bg-yellow-500/10 text-yellow-500' :
                          selectedTicket.status === 'resolved' ? 'bg-green-500/10 text-green-500' :
                          'bg-gray-500/10 text-gray-500'
                        }`}>
                          {statusLabels[selectedTicket.status]}
                        </span>
                        <span className="text-foreground/40 text-sm">{categoryLabels[selectedTicket.category]}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-background/50">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.is_admin ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`max-w-[70%] p-4 rounded-2xl ${
                        message.is_admin
                          ? 'bg-card border border-accent-secondary/30 text-foreground'
                          : 'bg-accent-primary/20 border border-accent-primary/30 text-foreground'
                      }`}>
                        <p className="mb-2">{message.message}</p>
                        <p className="text-xs text-foreground/40">{formatDate(message.created_at)}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-6 border-t border-border bg-card">
                  <form onSubmit={handleSendMessage} className="flex gap-4">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-accent-primary transition-all"
                      placeholder="Escribe tu mensaje..."
                      disabled={selectedTicket.status === 'closed'}
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || selectedTicket.status === 'closed'}
                      className="bg-accent-primary text-black p-3 rounded-xl hover:bg-accent-primary/80 transition-all disabled:opacity-50"
                    >
                      <Send size={20} />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="text-foreground/20 mb-6">
                  <MessageSquare size={80} />
                </div>
                <h2 className="text-2xl font-bold mb-2 text-foreground/60">Soporte MAD</h2>
                <p className="text-foreground/40 mb-8 max-w-md">
                  Selecciona un ticket existente o crea uno nuevo para contactarnos
                </p>
                <button
                  onClick={() => setShowCreateTicket(true)}
                  className="flex items-center gap-2 bg-accent-primary text-black px-6 py-3 rounded-xl font-bold hover:bg-accent-primary/80 transition-all"
                >
                  <Plus size={18} /> Crear Ticket
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}