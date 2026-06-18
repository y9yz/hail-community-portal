import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from 'react-i18next';

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

import {
  Send, MessageCircle, ArrowRight, User as UserIcon,
  LifeBuoy, Check, CheckCheck, ImagePlus, X, Loader2, Lock
} from "lucide-react";

interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: 'open' | 'closed';
  booking_id?: string | null;
  created_at: string;
  user?: {
    full_name: string;
    phone: string | null;
  } | null;
}

interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string | null;
  image_url: string | null;
  is_read: boolean;
  created_at: string;
}

const SupportTickets = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role } = useAuth();
  const { t } = useTranslation();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [pendingImage, setPendingImage] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const signedUrlsRef = useRef<Record<string, string>>({});

  /* check if the ticket is read-only */
  const isReadOnly = location.state?.readOnly || selectedTicket?.status === 'closed';

  /* read messages */
  const markAsRead = useCallback(async (ticketId: string) => {
    if (!user?.id || !ticketId || isReadOnly) return;
    try {
      await (supabase.from as any)("support_messages")
        .update({ is_read: true })
        .eq("ticket_id", ticketId)
        .neq("sender_id", user.id)
        .eq("is_read", false);
    } catch (err) {
      console.error("Read status update failed:", err);
    }
  }, [user?.id, isReadOnly]);

  /* fetch tickets by user ID */
  const fetchTickets = useCallback(async () => {
    if (!user?.id) return;
    try {
      let query = supabase
        .from("support_tickets")
        .select("*, user:profiles(full_name, phone)")
        .order("created_at", { ascending: false });

      if (role !== "admin") {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTickets((data as unknown as SupportTicket[]) || []);
    } catch (err) {
      const error = err as Error;
      console.error("Error fetching tickets:", error.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, role]);

  /*get messages*/
  const fetchMessages = useCallback(async (ticketId: string) => {
    if (!ticketId) return;
    try {
      const { data, error } = await (supabase.from as any)("support_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const msgs = (data as SupportMessage[]) || [];
      setMessages(msgs);

      const imagesToFetch = msgs.filter(
        (m) => m.image_url && !signedUrlsRef.current[m.image_url]
      );

      if (imagesToFetch.length > 0) {
        const updates: Record<string, string> = {};
        imagesToFetch.forEach((m) => {
          if (m.image_url) {
            const { data: publicUrlData } = supabase.storage
              .from("public-assets")
              .getPublicUrl(m.image_url);
            if (publicUrlData?.publicUrl) {
              updates[m.image_url] = publicUrlData.publicUrl;
              signedUrlsRef.current[m.image_url] = publicUrlData.publicUrl;
            }
          }
        });
        if (Object.keys(updates).length > 0) {
          setSignedUrls((prev) => ({ ...prev, ...updates }));
        }
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  }, []);

  /* fetch tickets when the component mounts */
  useEffect(() => {
    queueMicrotask(() => {
      fetchTickets();
    });
  }, [fetchTickets]);

  /* real-time updates */
  useEffect(() => {
    if (!selectedTicket?.id) return;

    queueMicrotask(() => {
      fetchMessages(selectedTicket.id);
      markAsRead(selectedTicket.id);
    });

    const channel = supabase
      .channel(`support-${selectedTicket.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `ticket_id=eq.${selectedTicket.id}`,
        },
        () => {
          fetchMessages(selectedTicket.id);
          markAsRead(selectedTicket.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTicket?.id, fetchMessages, markAsRead]);

  /* when a ticket is selected from the sidebar */
  useEffect(() => {
    if (tickets.length > 0 && location.state?.ticketId) {
      const target = tickets.find(t => t.id === location.state.ticketId);
      if (target) {
        queueMicrotask(() => {
          setSelectedTicket(target);
        });
        window.history.replaceState({}, document.title);
      }
    }
  }, [tickets, location.state]);

  /* auto scroll for new messages */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "auto",
      });
    }
  }, [messages]);

  /*chatbox and pics area*/
  const sendMessage = async () => {
    if (isReadOnly || (!newMessage.trim() && !pendingImage) || !selectedTicket || !user) return;
    setSending(true);
    try {
      let imagePath: string | null = null;
      if (pendingImage) {
        const ext = pendingImage.name.split(".").pop();
        imagePath = `support/${selectedTicket.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("public-assets")
          .upload(imagePath, pendingImage);
        if (upErr) throw upErr;
      }

      const { error } = await (supabase.from as any)("support_messages").insert({
        ticket_id: selectedTicket.id,
        sender_id: user.id,
        message: newMessage.trim() || null,
        image_url: imagePath,
        is_read: false,
      });

      if (error) throw error;
      
    
      setNewMessage("");
      setPendingImage(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      /* send notification from admin to customer*/
      if (role === "admin" && selectedTicket.user_id !== user.id) {
        await supabase.from("notifications").insert({
          recipient_id: selectedTicket.user_id,
          sender_id: user.id,
          content: t('support.notification_admin_reply', { subject: selectedTicket.subject }),
        });
      }
    } catch (err) {
      toast.error(t('support.send_failed'));
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-dvh bg-[#f8fafc] flex flex-col overflow-hidden" dir="rtl">
      <Navbar />
      
      {/* header */}
      <header className="sticky top-16 z-30 bg-white border-b shadow-sm">
        <div className="container py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="gap-2 rounded-xl border-border hover:bg-secondary text-muted-foreground hover:text-foreground font-bold shadow-sm"
              onClick={() => navigate(-1)}
            >
              <ArrowRight className="w-4 h-4 rtl:rotate-0 ltr:rotate-180" />
              <span className="hidden sm:inline">{t('common.back')}</span>
            </Button>

            <div className="h-6 w-0.5 bg-muted/50 hidden sm:block mx-1"></div>

            <div className="flex items-center gap-2">
              <LifeBuoy className="w-6 h-6 text-primary" />
              <h1 className="font-black text-lg text-primary">
                {role === "admin" ? t('support.title_admin') : t('support.title')}
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 container py-4 md:py-6 flex flex-col overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-hidden">

          {/* side bar */}
          <Card className={`md:col-span-1 rounded-4xl border-none shadow-xl overflow-hidden bg-white flex-col h-full ${selectedTicket ? 'hidden md:flex' : 'flex'}`}>
            <CardHeader className="border-b bg-primary/5 p-6 shrink-0">
              <CardTitle className="flex items-center gap-2 text-primary font-black text-xl">
                <LifeBuoy className="w-7 h-7" />
                {role === "admin" ? t('support.title_admin') : t('support.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto flex-1 scrollbar-thin">
                  {loading ? (
                <div className="p-10 text-center space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  <p className="text-xs font-bold opacity-50 text-center">{t('support.loading_tickets')}</p>
                </div>
              ) : tickets.length === 0 ? (
                <div className="p-10 text-center space-y-4 opacity-20">
                  <MessageCircle className="w-16 h-16 mx-auto" />
                  <p className="text-sm font-black">{t('support.no_tickets')}</p>
                </div>
              ) : (
                <div className="divide-y">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`p-5 cursor-pointer transition-all hover:bg-primary/5 ${
                        selectedTicket?.id === ticket.id
                          ? "bg-primary/10 border-r-4 border-r-primary"
                          : ""
                      } ${ticket.status === 'closed' ? 'opacity-60' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          {ticket.status === 'closed' && <Lock className="w-3 h-3 text-muted-foreground" />}
                          <p className={`font-black text-sm line-clamp-1 ${ticket.status === 'closed' ? 'text-muted-foreground' : 'text-foreground'}`}>
                            {ticket.subject}
                          </p>
                        </div>
                          <Badge
                          className={`border-none text-[9px] px-2 rounded-full font-bold shadow-sm ${
                            ticket.status === "open"
                              ? "bg-amber-500 text-white"
                              : "bg-emerald-500 text-white"
                          }`}
                        >
                          {ticket.status === "open" ? t('support.status.active') : t('support.status.closed')}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center mt-3">
                          <p className="text-[9px] text-muted-foreground font-black bg-muted/50 px-2 py-1 rounded-lg">
                          {ticket.booking_id ? t('support.linked_booking') : t('support.general_inquiry')}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-medium">
                          {new Date(ticket.created_at).toLocaleDateString("ar-SA", { year: 'numeric', month: '2-digit', day: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* reply area */}
          <Card className={`md:col-span-2 rounded-4xl border-none shadow-2xl overflow-hidden bg-white flex-col h-full ${selectedTicket ? 'flex' : 'hidden md:flex'}`}>
            {selectedTicket ? (
              <>
                <CardHeader className="border-b bg-white py-4 px-6 shrink-0 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="md:hidden shrink-0 hover:bg-muted rounded-full"
                      onClick={() => setSelectedTicket(null)}
                    >
                      <ArrowRight className="w-5 h-5 rtl:rotate-0 ltr:rotate-180" />
                    </Button>

                    <div className="bg-primary/10 p-3 rounded-2xl hidden sm:flex">
                      <UserIcon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        {isReadOnly && <Lock className="w-4 h-4 text-muted-foreground" />}
                        <CardTitle className="text-lg md:text-xl font-black line-clamp-1">{selectedTicket.subject}</CardTitle>
                      </div>
                      <p className="text-[10px] md:text-xs font-bold text-muted-foreground mt-1">
                        {role === "admin"
                          ? `${t('support.sender_label')}: ${selectedTicket.user?.full_name || '—'}`
                          : t('support.default_sender')}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-[#f1f5f9] scrollbar-thin"
                >
                  <div className="flex justify-center mb-8">
                    <div className="max-w-[90%] w-full p-5 rounded-3xl bg-white border-2 border-dashed border-amber-200 text-amber-900 shadow-sm relative">
                        <div className="absolute -top-3 right-6 bg-amber-500 text-white px-3 py-1 rounded-full text-[9px] font-black">
                        {t('support.original_message_label')}
                      </div>
                      <p className="text-sm font-bold leading-relaxed italic">
                        "{selectedTicket.message}"
                      </p>
                    </div>
                  </div>

                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.sender_id === user?.id ? "justify-start" : "justify-end"
                      } animate-in fade-in slide-in-from-bottom-2`}
                    >
                      <div
                        className={`max-w-[85%] md:max-w-[75%] p-4 rounded-2xl shadow-sm relative ${
                          msg.sender_id === user?.id
                            ? "bg-primary text-white rounded-tr-sm"
                            : "bg-white text-foreground rounded-tl-sm border border-border"
                        }`}
                      >
                        {msg.image_url && signedUrls[msg.image_url] && (
                          <a
                            href={signedUrls[msg.image_url]}
                            target="_blank"
                            rel="noreferrer"
                            className="block mb-3 rounded-xl overflow-hidden border border-black/5"
                          >
                            <img
                              src={signedUrls[msg.image_url]}
                              alt={t('support.attachment_alt')}
                              className="w-full h-auto max-h-60 object-cover"
                            />
                          </a>
                        )}
                        {msg.message && (
                          <p className="text-sm font-bold leading-relaxed whitespace-pre-wrap">
                            {msg.message}
                          </p>
                        )}
                        <div className="flex items-center gap-1 mt-2 justify-end opacity-70">
                          <span className="text-[9px] font-black">
                            {new Date(msg.created_at).toLocaleTimeString("ar-SA", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            })}
                          </span>
                          {msg.sender_id === user?.id && (
                            <span className="flex">
                              {msg.is_read ? (
                                <CheckCheck className="w-3.5 h-3.5 text-blue-200" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>

                {/* reply area */}
                <div className="p-3 md:p-4 border-t bg-white shrink-0">
                    {isReadOnly ? (
                    <div className="bg-muted/50 p-4 rounded-2xl border border-dashed text-center flex flex-col items-center gap-2">
                      <Lock className="w-5 h-5 text-muted-foreground" />
                      <p className="text-sm font-black text-muted-foreground">{t('support.closed_message')}</p>
                    </div>
                  ) : (
                    <>
                      {pendingImage && (
                        <div className="flex items-center gap-3 mb-3 p-2 bg-primary/5 rounded-2xl border border-primary/10">
                          <img
                            src={URL.createObjectURL(pendingImage)}
                            className="w-10 h-10 rounded-lg object-cover border-2 border-white shadow"
                            alt="Preview"
                          />
                          <span className="flex-1 truncate text-xs font-black text-primary italic">
                            {pendingImage.name}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-full hover:bg-red-50 text-red-500"
                            onClick={() => setPendingImage(null)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                      
                      <div className="flex gap-2 items-center">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => setPendingImage(e.target.files?.[0] || null)}
                        />
                        <Button
                          size="icon"
                          variant="outline"
                          className="rounded-2xl shrink-0 h-12 w-12 border-2 hover:bg-muted"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <ImagePlus className="w-5 h-5 text-muted-foreground" />
                        </Button>
                        <Input
                          placeholder={t('support.reply_placeholder')}
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                          className="rounded-2xl h-12 border-none bg-muted/30 focus-visible:ring-primary font-bold px-4"
                        />
                        <Button
                          onClick={sendMessage}
                          disabled={sending || (!newMessage.trim() && !pendingImage)}
                          className="rounded-2xl shrink-0 h-12 w-12 p-0 shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                        >
                          <Send className="w-5 h-5 rtl:-scale-x-100" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-10 space-y-6">
                <div className="bg-primary/5 p-8 rounded-full animate-bounce">
                  <MessageCircle className="w-20 h-20 text-primary/20" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-primary">{t('support.portal_name')}</h3>
                  <p className="text-sm font-bold text-muted-foreground/60 max-w-xs mx-auto">
                    {t('support.select_ticket_prompt')}
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SupportTickets;
