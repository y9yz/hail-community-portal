// استيراد المكتبات الأساسية ومكونات واجهة المستخدم وأدوات المساعدة
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label"; 
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Send, LifeBuoy, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";

// تعريف واجهة الخصائص المطلوبة للمكون
interface SupportTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking?: { id: string; order_number: number; service_title: string };
}

const SupportTicketDialog = ({ open, onOpenChange, booking }: SupportTicketDialogProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // حالة النموذج الخاص بإنشاء تذكرة جديدة
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  
  // حالة التذكرة المفتوحة والمحادثة الخاصة بها
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  

  // إعادة تهيئة النموذج عند فتح النافذة
  const fetchMessages = async (ticketId: string) => {
  const { data } = await supabase
    .from("support_messages" as any)
    .select("*, sender:profiles(full_name, role)")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  setMessages(data || []);
};

const checkExistingTicket = async () => {
  if (!user || !booking) return;
  try {
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("booking_id", booking.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setActiveTicket(data);
      fetchMessages(data.id);
    }
  } catch (err) {
    console.error("Error checking ticket:", err);
  }
};

  useEffect(() => {
    if (open && user) {
      setSubject("");
      setMessage("");
      setActiveTicket(null);
      setMessages([]);
      checkExistingTicket();
    }
  }, [open, user, booking]);

  // دالة تمرير شاشة المحادثة للأسفل عند وصول رسالة جديدة
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // إعداد الاستماع اللحظي للرسائل الجديدة في حال كانت التذكرة مفتوحة
  useEffect(() => {
    if (!activeTicket || !user) return;

    const channel = supabase
      .channel(`support-messages-${activeTicket.id}`)
      .on(
        "postgres_changes" as any, 
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `ticket_id=eq.${activeTicket.id}`
        },
        (payload: any) => {
          setMessages((current) => {
            if (current.find((m) => m.id === payload.new.id)) return current;
            return [...current, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTicket, user]);

  // إنشاء تذكرة دعم فني جديدة
  const handleCreateTicket = async () => {
    if (!user || !subject.trim() || !message.trim()) {
      toast.error(t('support.fill_subject_message'));
      return;
    }

    setLoading(true);
    try {
      // إضافة التذكرة الأساسية
      const { data: newTicket, error: ticketError } = await supabase
        .from("support_tickets")
        .insert({
          user_id: user.id,
          booking_id: booking?.id || null,
          subject: subject.trim(),
          message: message.trim(),
          status: "open",
        } as any)
        .select()
        .single();

      if (ticketError) throw ticketError;

      // إضافة الرسالة الأولى للمحادثة
      const { error: msgError } = await supabase
        .from("support_messages" as any)
        .insert({
          ticket_id: newTicket.id,
          sender_id: user.id,
          message: message.trim(),
        } as any);

      if (msgError) throw msgError;

      // إشعار المدراء بوجود تذكرة جديدة
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (admins) {
        for (const admin of admins) {
          await supabase.from("notifications").insert({
            recipient_id: admin.user_id,
            sender_id: user.id,
            content: t('support.ticket_notification_new', { subject: subject.trim() }),
          });
        }
      }

      toast.success(t('support.ticket_created_success'));
      setActiveTicket(newTicket);
      fetchMessages(newTicket.id);
      
    } catch (err: any) {
      toast.error(err.message || t('support.ticket_send_error'));
    } finally {
      setLoading(false);
    }
  };

  // إرسال رد ضمن تذكرة قائمة
  const handleSendReply = async () => {
    if (!user || !activeTicket || !replyText.trim()) return;

    setSendingReply(true);
    try {
      const { error } = await supabase
        .from("support_messages" as any)
        .insert({
          ticket_id: activeTicket.id,
          sender_id: user.id,
          message: replyText.trim(),
        } as any);

      if (error) throw error;
      
      setReplyText("");
      fetchMessages(activeTicket.id); 

    } catch (err: any) {
      toast.error(t('support.reply_failed'));
    } finally {
      setSendingReply(false);
    }
  };

  // تنسيق شارة حالة التذكرة
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return <Badge className="bg-amber-500 hover:bg-amber-600 gap-1"><Clock className="w-3 h-3" /> {t('support.status.review')}</Badge>;
      case 'in_progress': return <Badge className="bg-blue-500 hover:bg-blue-600 gap-1"><AlertCircle className="w-3 h-3" /> {t('support.status.in_progress')}</Badge>;
      case 'closed': return <Badge className="bg-emerald-500 hover:bg-emerald-600 gap-1"><CheckCircle2 className="w-3 h-3" /> {t('support.status.closed')}</Badge>;
      default: return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-4xl p-0 overflow-hidden" dir="rtl">
        <DialogHeader className="p-6 bg-muted/30 border-b">
          <DialogTitle className="flex items-center gap-2 text-2xl font-black text-primary">
            <LifeBuoy className="w-6 h-6" />
            {activeTicket ? t('support.ticket_follow_up') : t('support.support_center')}
          </DialogTitle>
          {booking && !activeTicket && (
            <p className="text-sm font-bold text-muted-foreground mt-2">
              {t('support.ticket_about_order', { service: booking.service_title, order: booking.order_number })}
            </p>
          )}
        </DialogHeader>

        {!activeTicket ? (
          // واجهة إنشاء تذكرة جديدة
          <div className="p-6 space-y-6">
            <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="space-y-1 text-sm">
                <p className="font-bold text-amber-900">{t('support.instructions_title')}</p>
                <p className="text-amber-700">{t('support.instructions_description')}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-bold text-sm">{t('support.ticket_subject_label')}</Label>
                <Input 
                  placeholder={t('support.ticket_subject_placeholder')} 
                  value={subject} 
                  onChange={(e) => setSubject(e.target.value)}
                  className="h-12 rounded-xl bg-muted/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-sm">{t('support.ticket_details_label')}</Label>
                <Textarea 
                  placeholder={t('support.ticket_details_placeholder')} 
                  value={message} 
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-30 rounded-xl bg-muted/20 resize-none p-4"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" className="h-12 px-6 rounded-xl font-bold" onClick={() => onOpenChange(false)}>{t('support.cancel')}</Button>
              <Button onClick={handleCreateTicket} disabled={loading || !subject.trim() || !message.trim()} className="h-12 px-8 rounded-xl font-black shadow-lg shadow-primary/20">
                {loading ? t('support.sending') : t('support.submit_ticket')}
              </Button>
            </div>
          </div>
        ) : (
          // واجهة المحادثة في تذكرة قائمة
          <div className="flex flex-col h-125">
            <div className="p-4 border-b bg-background flex justify-between items-center shadow-sm z-10">
              <div>
                <h3 className="font-black text-lg">{activeTicket.subject}</h3>
                <p className="text-xs text-muted-foreground font-mono">{t('support.ticket_number_label', { number: activeTicket.id.split('-')[0] })}</p>
              </div>
              {getStatusBadge(activeTicket.status)}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-muted/10">
              {messages.map((msg, idx) => {
                const isMe = msg.sender_id === user?.id;
                const isAdmin = msg.sender?.role === 'admin';
                return (
                  <div key={msg.id || idx} className={`flex flex-col ${isMe ? "items-start" : "items-end"}`}>
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {isMe ? t('support.sender_you') : isAdmin ? t('support.sender_admin') : msg.sender?.full_name || t('support.sender_system')}
                      </span>
                    </div>
                    <div 
                      className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                        isMe 
                          ? "bg-primary text-primary-foreground rounded-tr-sm" 
                          : isAdmin 
                            ? "bg-blue-600 text-white rounded-tl-sm shadow-md"
                            : "bg-muted rounded-tl-sm border"
                      }`}
                    >
                      {msg.message}
                    </div>
                    <span className="text-[9px] text-muted-foreground mt-1 mx-1 font-mono">
                      {format(new Date(msg.created_at), 'hh:mm a', { locale: arSA })}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {activeTicket.status !== 'closed' ? (
              <div className="p-4 bg-background border-t mt-auto">
                <div className="flex gap-2">
                  <Input 
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendReply()}
                    placeholder={t('support.reply_placeholder')}
                    className="h-14 rounded-2xl bg-muted/30 border-2 focus-visible:ring-primary"
                  />
                  <Button 
                    onClick={handleSendReply} 
                    disabled={sendingReply || !replyText.trim()}
                    className="h-14 w-14 rounded-2xl shrink-0 shadow-lg shadow-primary/20"
                  >
                    <Send className="w-5 h-5 rtl:-scale-x-100" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-muted/50 border-t mt-auto text-center">
                <p className="text-sm font-bold text-muted-foreground">{t('support.ticket_closed_note')}</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SupportTicketDialog;
