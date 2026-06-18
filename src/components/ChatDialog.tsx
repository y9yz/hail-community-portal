import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, ImagePlus, X, ShieldAlert, Check, CheckCheck, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  otherName: string;
  readOnly?: boolean;
}

const ChatDialog = ({ open, onOpenChange, bookingId, otherName, readOnly = false }: ChatDialogProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const signedUrlsRef = useRef<Record<string, string>>({});

  const [chatRoles, setChatRoles] = useState({ clientId: "", providerId: "" });
  const [participants, setParticipants] = useState<Record<string, string>>({});
  const [bookingState, setBookingState] = useState({ status: "", providerStatus: "" });

  useEffect(() => {
    if (!bookingId || !open) return;
    const fetchBookingDetails = async () => {
      const { data } = await (supabase
        .from("bookings" as any)
        .select("client_id, provider_id, status, provider_status, client:profiles!bookings_client_id_fkey(full_name), provider:profiles!bookings_provider_id_fkey(full_name)")
        .eq("id", bookingId)
        .single() as any);

      if (data) {
        setChatRoles({ clientId: data.client_id, providerId: data.provider_id });
        setParticipants({
          [data.client_id]: data.client?.full_name || t('chat.client'),
          [data.provider_id]: data.provider?.full_name || t('chat.provider'),
        });
        setBookingState({ status: data.status, providerStatus: data.provider_status });
      }
    };
    fetchBookingDetails();
  }, [bookingId, open, t]);

  const markAsRead = useCallback(async () => {
    if (readOnly || !user || !bookingId) return;
    try {
      await (supabase.from("chat_messages" as any)
        .update({ is_read: true } as any)
        .eq("booking_id", bookingId)
        .neq("sender_id", user.id)
        .eq("is_read", false) as any);
    } catch (err) {
      console.error("Error marking messages as read:", err);
    }
  }, [bookingId, user?.id, readOnly]);

  const fetchMessages = useCallback(async () => {
    if (!bookingId) return;
    const { data } = await (supabase
      .from("chat_messages" as any)
      .select("*")
      .eq("booking_id", bookingId)
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
  }, [bookingId]);

  useEffect(() => {
    if (!open || !bookingId) return;

    fetchMessages();
    markAsRead();

    const channel = supabase
      .channel(`chat-${bookingId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `booking_id=eq.${bookingId}`,
      }, () => {
        fetchMessages();
        markAsRead();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, bookingId, fetchMessages, markAsRead]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  const handleSend = async () => {
    if (readOnly || !user) return;

    if (pendingImage && (!newMessage || newMessage.trim() === "")) {
      toast.warning('يرجى كتابة وصف أو توضيح مع الصورة قبل إرسالها 📝');
      return;
    }

    if (!newMessage.trim() && !pendingImage) return;
    setSending(true);
    try {
      let imagePath: string | null = null;
      if (pendingImage) {
        const ext = pendingImage.name.split(".").pop();
        imagePath = `chat/${bookingId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("public-assets")
          .upload(imagePath, pendingImage);
        if (upErr) throw upErr;
      }

      const { error } = await (supabase.from("chat_messages" as any).insert({
        booking_id: bookingId,
        sender_id: user.id,
        message: newMessage.trim() || null,
        image_url: imagePath,
        is_read: false,
      } as any));

      if (error) throw error;
      setNewMessage("");
      setPendingImage(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      toast.error(t('chat.send_error'));
    } finally {
      setSending(false);
    }
  };

  const isChatClosed = bookingState.status === 'completed' || bookingState.providerStatus === 'declined';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md h-[85vh] md:h-[75vh] flex flex-col rounded-[2.5rem] p-0 overflow-hidden shadow-2xl border-none"
        dir="rtl"
      >
        <DialogHeader className={`p-5 border-b shrink-0 ${readOnly ? "bg-amber-50/50" : "bg-white"}`}>
          <DialogTitle className="font-black text-xl text-primary px-2 flex items-center gap-2">
            {readOnly && <ShieldAlert className="w-5 h-5 text-amber-600" />}
            {readOnly ? t('chat.monitoring_chat') : t('chat.conversation_with', { name: otherName })}
          </DialogTitle>
          {readOnly && (
            <p className="text-[10px] font-bold text-amber-600 px-2 mt-1 italic">{t('chat.supervisor_mode')}</p>
          )}
        </DialogHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f8fafc] scrollbar-thin">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-30 gap-2">
              <MessageSquare className="w-12 h-12" />
              <p className="text-center font-black">{t('chat.start_conversation')}</p>
            </div>
          )}
          {messages.map((m) => {
            const isRightSide = readOnly ? m.sender_id === chatRoles.clientId : m.sender_id === user?.id;
            const senderName = participants[m.sender_id] || (isRightSide ? t('chat.client') : t('chat.provider'));

            return (
              <div
                key={m.id}
                className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm relative animate-in fade-in slide-in-from-bottom-1 flex flex-col ${
                  isRightSide
                    ? "bg-primary text-primary-foreground ms-auto rounded-tl-sm"
                    : "bg-white border text-foreground rounded-tr-sm"
                }`}
              >
                {readOnly && (
                  <span className={`text-[10px] font-black mb-1.5 opacity-80 flex items-center gap-1 ${isRightSide ? "text-primary-foreground" : "text-primary"}`}>
                    {senderName} {m.sender_id === chatRoles.providerId && `(${t('chat.provider')})`}
                  </span>
                )}

                {m.image_url && signedUrls[m.image_url] && (
                  <a href={signedUrls[m.image_url]} target="_blank" rel="noreferrer" className="block mb-2 overflow-hidden rounded-xl">
                    <img src={signedUrls[m.image_url]} alt={t('chat.attachment_alt')} className="w-full h-auto max-h-64 object-cover" />
                  </a>
                )}
                
                {m.message && (
                  <p className="leading-relaxed font-bold whitespace-pre-wrap">{m.message}</p>
                )}
                
                <div className="flex items-center gap-1 mt-1 justify-end opacity-70">
                  <span className="text-[9px] font-black">
                    {new Date(m.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", hour12: true })}
                  </span>
                  {(isRightSide || readOnly) && (
                    <span className="flex">
                      {m.is_read ? (
                        <CheckCheck className={`w-3.5 h-3.5 ${isRightSide ? "text-blue-300" : "text-blue-500"}`} />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="shrink-0 bg-white border-t p-4">
          {readOnly ? (
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-center">
              <p className="text-xs font-black text-amber-700">{t('chat.view_only')}</p>
            </div>
          ) : isChatClosed ? (
            <div className="bg-muted/50 p-4 rounded-xl border border-dashed text-center">
              <p className="text-sm font-black text-muted-foreground">{t('chat.closed_chat')}</p>
            </div>
          ) : (
            <>
              {pendingImage && (
                <div className="flex items-center gap-3 mb-3 p-2 bg-primary/5 rounded-2xl border border-primary/10">
                  <div className="w-12 h-12 bg-muted rounded-xl overflow-hidden border-2 border-white shadow-sm">
                    <img src={URL.createObjectURL(pendingImage)} className="w-full h-full object-cover" />
                  </div>
                  <span className="flex-1 truncate text-xs font-black text-primary italic">{pendingImage.name}</span>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-red-50 hover:text-red-500" onClick={() => setPendingImage(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <div className="flex gap-2 items-center">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => setPendingImage(e.target.files?.[0] || null)} />
                <Button size="icon" variant="outline" className="rounded-2xl shrink-0 h-12 w-12 border-2 border-muted hover:border-primary/30" onClick={() => fileInputRef.current?.click()}>
                  <ImagePlus className="w-5 h-5 text-muted-foreground" />
                </Button>
                <Input
                  placeholder={t('chat.write_reply_placeholder')}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  className="rounded-2xl h-12 border-none bg-muted/30 focus-visible:ring-primary font-bold"
                />
                <Button size="icon" onClick={handleSend} disabled={sending || (!newMessage.trim() && !pendingImage)} className="rounded-2xl shrink-0 h-12 w-12 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                  <Send className="w-5 h-5 rtl:-scale-x-100" />
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatDialog;