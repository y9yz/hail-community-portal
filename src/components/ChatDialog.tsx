import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, ImagePlus, X, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  otherName: string;
  readOnly?: boolean; // 👈 الإضافة الجديدة هنا
}

const ChatDialog = ({ open, onOpenChange, bookingId, otherName, readOnly = false }: ChatDialogProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true });
    const msgs = data || [];
    setMessages(msgs);

    const imagesToFetch = msgs.filter((m: any) => m.image_url && !signedUrls[m.image_url]);
    if (imagesToFetch.length > 0) {
      const updates: Record<string, string> = {};
      imagesToFetch.forEach((m: any) => {
        const { data: publicUrlData } = supabase.storage
          .from("public-assets")
          .getPublicUrl(m.image_url);
        
        if (publicUrlData?.publicUrl) {
          updates[m.image_url] = publicUrlData.publicUrl;
        }
      });
      setSignedUrls((prev) => ({ ...prev, ...updates }));
    }
  };

  useEffect(() => {
    if (!open || !bookingId) return;
    fetchMessages();

    const channel = supabase
      .channel(`chat-${bookingId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `booking_id=eq.${bookingId}`,
      }, () => fetchMessages())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [open, bookingId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, signedUrls]);

  const handleSend = async () => {
    if (readOnly || (!newMessage.trim() && !pendingImage) || !user) return;
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
      const { error } = await supabase.from("chat_messages").insert({
        booking_id: bookingId,
        sender_id: user.id,
        message: newMessage.trim() || null,
        image_url: imagePath,
      } as any);
      if (error) throw error;
      setNewMessage("");
      setPendingImage(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      toast.error(err.message || "تعذر إرسال الرسالة");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[70vh] flex flex-col rounded-[2rem] p-0 overflow-hidden" dir="rtl">
        <DialogHeader className={`p-4 border-b ${readOnly ? 'bg-amber-50/50' : 'bg-muted/30'}`}>
          <DialogTitle className="font-black text-lg text-primary px-2 flex items-center gap-2">
            {readOnly && <ShieldAlert className="w-5 h-5 text-amber-600" />}
            {readOnly ? "مراقبة المحادثة" : `محادثة مع ${otherName}`}
          </DialogTitle>
          {readOnly && <p className="text-xs font-bold text-amber-600 px-2 mt-1">بين {otherName}</p>}
        </DialogHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-50">
              <p className="text-center text-muted-foreground text-sm font-bold">لا توجد رسائل بعد</p>
            </div>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[80%] p-3 rounded-2xl text-sm space-y-2 shadow-sm ${
                m.sender_id === user?.id && !readOnly
                  ? "bg-primary text-primary-foreground ms-auto rounded-tl-sm"
                  : "bg-background border text-foreground rounded-tr-sm"
              }`}
            >
              {m.image_url && signedUrls[m.image_url] && (
                <a href={signedUrls[m.image_url]} target="_blank" rel="noreferrer">
                  <img
                    src={signedUrls[m.image_url]}
                    alt="مرفق"
                    className="rounded-xl max-h-48 w-full object-cover border border-primary/10"
                  />
                </a>
              )}
              {m.message && <p className="leading-relaxed font-medium">{m.message}</p>}
              <p className={`text-[9px] font-mono opacity-70 ${m.sender_id === user?.id && !readOnly ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                {new Date(m.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          ))}
        </div>

        {/* 👈 الشرط الجديد: إذا القراءة فقط، نلغي أزرار الإرسال */}
        {readOnly ? (
          <div className="p-4 bg-muted/30 border-t text-center">
             <p className="text-sm font-bold text-muted-foreground">وضع المراقبة فقط (لا يمكنك إرسال رسائل)</p>
          </div>
        ) : (
          <>
            {pendingImage && (
              <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border-t border-amber-100 text-xs">
                <span className="flex-1 truncate font-bold text-amber-900">صورة جاهزة للإرسال: {pendingImage.name}</span>
                <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-amber-200 text-amber-700 rounded-full" onClick={() => setPendingImage(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
            <div className="flex gap-2 p-3 border-t bg-background">
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
                title="إرفاق صورة"
              >
                <ImagePlus className="w-5 h-5 text-muted-foreground" />
              </Button>
              <Input
                placeholder="اكتب رسالتك هنا..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                dir="rtl"
                className="rounded-2xl h-12 border-2 focus-visible:ring-primary bg-muted/20 font-medium"
              />
              <Button 
                size="icon" 
                onClick={handleSend} 
                disabled={sending || (!newMessage.trim() && !pendingImage)} 
                className="rounded-2xl shrink-0 h-12 w-12 shadow-md shadow-primary/20"
              >
                <Send className="w-5 h-5 rtl:-scale-x-100" />
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ChatDialog;