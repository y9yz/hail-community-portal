import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Send, MessageCircle, ArrowRight, User as UserIcon,
  LifeBuoy, Check, CheckCheck, ImagePlus, X, Loader2, Lock
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useNavigate, useLocation } from "react-router-dom";

const SupportTickets = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [pendingImage, setPendingImage] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const signedUrlsRef = useRef<Record<string, string>>({});

  // 🚀 تحديد ما إذا كانت المحادثة مقفلة (من الحالة أو من الـ Navigate State)
  const isReadOnly = location.state?.readOnly || selectedTicket?.status === 'closed';

  const markAsRead = useCallback(async (ticketId: string) => {
    if (!user || !ticketId || isReadOnly) return;
    try {
      await (supabase.from("support_messages" as any)
        .update({ is_read: true } as any)
        .eq("ticket_id", ticketId)
        .neq("sender_id", user.id)
        .eq("is_read", false) as any);
    } catch (err) {
      console.error("Read status update failed:", err);
    }
  }, [user?.id, isReadOnly]);

  const fetchTickets = useCallback(async () => {
    if (!user) return;
    try {
      let query = supabase
        .from("support_tickets" as any)
        .select("*, user:profiles(full_name, phone)")
        .order("created_at", { ascending: false });

      if (role !== "admin") {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTickets(data || []);
    } catch (err: any) {
      console.error("Error fetching tickets:", err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, role]);

  const fetchMessages = useCallback(async (ticketId: string) => {
    const { data } = await (supabase
      .from("support_messages" as any)
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true }) as any);

    const msgs = data || [];
    setMessages(msgs);

    const imagesToFetch = msgs.filter(
      (m: any) => m.image_url && !signedUrlsRef.current[m.image_url]
    );

    if (imagesToFetch.length > 0) {
      const updates: Record<string, string> = {};
      imagesToFetch.forEach((m: any) => {
        const { data: publicUrlData } = supabase.storage
          .from("public-assets")
          .getPublicUrl(m.image_url);
        if (publicUrlData?.publicUrl) {
          updates[m.image_url] = publicUrlData.publicUrl;
          signedUrlsRef.current[m.image_url] = publicUrlData.publicUrl;
        }
      });
      if (Object.keys(updates).length > 0) {
        setSignedUrls((prev) => ({ ...prev, ...updates }));
      }
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    if (!selectedTicket) return;

    fetchMessages(selectedTicket.id);
    markAsRead(selectedTicket.id);

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

  useEffect(() => {
    if (tickets.length > 0 && location.state?.ticketId) {
      const target = tickets.find(t => t.id === location.state.ticketId);
      if (target) {
        setSelectedTicket(target);
        window.history.replaceState({}, document.title);
      }
    }
  }, [tickets, location.state]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "auto",
      });
    }
  }, [messages]);

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

      const { error } = await (supabase.from("support_messages" as any).insert({
        ticket_id: selectedTicket.id,
        sender_id: user.id,
        message: newMessage.trim() || null,
        image_url: imagePath,
        is_read: false,
      } as any));

      if (error) throw error;
      setNewMessage("");
      setPendingImage(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // إشعار للمستخدم برد جديد من الإدارة
      if (role === "admin" && selectedTicket.user_id !== user.id) {
        await supabase.from("notifications").insert({
          recipient_id: selectedTicket.user_id,
          sender_id: user.id,
          content: `رد جديد على تذكرة الدعم: ${selectedTicket.subject}`,
        });
      }
    } catch (err: any) {
      toast.error("فشل إرسال الرد");
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-[100dvh] bg-[#f8fafc] flex flex-col overflow-hidden" dir="rtl">
      <Navbar />
      <div className="container py-4 md:py-6 flex-1 flex flex-col overflow-hidden">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-hidden">

          {/* Ticket List */}
          <Card className={`md:col-span-1 rounded-[2rem] border-none shadow-xl overflow-hidden bg-white flex-col h-full ${selectedTicket ? 'hidden md:flex' : 'flex'}`}>
            <CardHeader className="border-b bg-primary/5 p-6 shrink-0">
              <CardTitle className="flex items-center gap-2 text-primary font-black text-xl">
                <LifeBuoy className="w-7 h-7" />
                {role === "admin" ? "إدارة البلاغات" : "تذاكر الدعم الفني"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto flex-1 scrollbar-thin">
              {loading ? (
                <div className="p-10 text-center space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  <p className="text-xs font-bold opacity-50 text-center">جاري تحميل البلاغات...</p>
                </div>
              ) : tickets.length === 0 ? (
                <div className="p-10 text-center space-y-4 opacity-20">
                  <MessageCircle className="w-16 h-16 mx-auto" />
                  <p className="text-sm font-black">لا توجد بلاغات حالياً</p>
                </div>
              ) : (
                tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`p-5 border-b cursor-pointer transition-all hover:bg-primary/5 ${
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
                        {ticket.status === "open" ? "نشطة" : "مغلقة"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center mt-3">
                      <p className="text-[9px] text-muted-foreground font-black bg-muted/50 px-2 py-1 rounded-lg">
                        {ticket.booking_id ? "بلاغ مرتبط بطلب" : "استفسار عام"}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium">
                        {new Date(ticket.created_at).toLocaleDateString("ar-SA")}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className={`md:col-span-2 rounded-[2rem] border-none shadow-2xl overflow-hidden bg-white flex-col h-full ${selectedTicket ? 'flex' : 'hidden md:flex'}`}>
            {selectedTicket ? (
              <>
                <CardHeader className="border-b bg-white py-4 px-6 shrink-0">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedTicket(null)}
                        className="md:hidden rounded-full shrink-0"
                      >
                        <ArrowRight />
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
                            ? `المرسل: ${selectedTicket.user?.full_name}`
                            : "فريق الدعم الفني - بوابة مجتمع حائل"}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-[#f1f5f9] scrollbar-thin"
                >
                  <div className="flex justify-center mb-8">
                    <div className="max-w-[90%] w-full p-5 rounded-[1.5rem] bg-white border-2 border-dashed border-amber-200 text-amber-900 shadow-sm relative">
                      <div className="absolute -top-3 right-6 bg-amber-500 text-white px-3 py-1 rounded-full text-[9px] font-black">
                        محتوى البلاغ الأصلي
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
                              alt="مرفق دعم"
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
                              hour12: true,
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

                {/* ✅ تحديث صندوق الإدخال: يختفي إذا كانت التذكرة مغلقة */}
                <div className="p-3 md:p-4 border-t bg-white shrink-0">
                  {isReadOnly ? (
                    <div className="bg-muted/50 p-4 rounded-2xl border border-dashed text-center flex flex-col items-center gap-2">
                       <Lock className="w-5 h-5 text-muted-foreground" />
                       <p className="text-sm font-black text-muted-foreground">تم حل هذا البلاغ وإغلاق المحادثة.</p>
                    </div>
                  ) : (
                    <>
                      {pendingImage && (
                        <div className="flex items-center gap-3 mb-3 p-2 bg-primary/5 rounded-2xl border border-primary/10">
                          <img
                            src={URL.createObjectURL(pendingImage)}
                            className="w-10 h-10 rounded-lg object-cover border-2 border-white shadow"
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
                          placeholder="اكتب ردك هنا..."
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
                  <h3 className="text-2xl font-black text-primary">بوابة مجتمع حائل للدعم</h3>
                  <p className="text-sm font-bold text-muted-foreground/60 max-w-xs mx-auto">
                    يسعدنا خدمتك! اختر إحدى التذاكر من القائمة لبدء المحادثة مع فريقنا
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