import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Send, MessageCircle, ArrowRight, User as UserIcon, LifeBuoy } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useNavigate } from "react-router-dom";

const SupportTickets = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    if (!user) return;
    try {
      // تم التعديل لاستخدام booking_id ليتوافق مع تحديث الداتابيس الأخير
      let query = supabase
        .from("support_tickets" as any)
        .select("*, user:profiles(full_name, phone)")
        .order('created_at', { ascending: false });

      if (role !== 'admin') {
        query = query.eq('user_id', user.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      setTickets(data || []);
    } catch (err: any) {
      console.error("Error fetching tickets:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (ticketId: string) => {
    const { data } = await supabase
      .from("support_messages" as any)
      .select("*")
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  useEffect(() => {
    fetchTickets();
  }, [user, role]);

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id);
      
      const channel = supabase
        .channel(`chat-${selectedTicket.id}`)
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${selectedTicket.id}` }, 
          (payload: any) => {
            setMessages(prev => [...prev, payload.new]);
          }
        ).subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [selectedTicket]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket || !user) return;
    const { error } = await supabase.from("support_messages" as any).insert({
      ticket_id: selectedTicket.id,
      sender_id: user.id,
      message: newMessage
    });
    if (!error) setNewMessage("");
    else toast.error("فشل إرسال الرسالة");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="container py-6 flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-100px)]">
        
        {/* قائمة البلاغات الجانبية */}
        <Card className="md:col-span-1 flex flex-col rounded-3xl border-2 overflow-hidden shadow-sm">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="flex items-center gap-2 text-primary font-black">
              <LifeBuoy className="w-6 h-6" /> 
              {role === 'admin' ? "إدارة البلاغات" : "تذاكر الدعم الفني"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto flex-1">
            {loading ? (
              <p className="p-10 text-center text-xs animate-pulse">جاري جلب البيانات...</p>
            ) : tickets.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <MessageCircle className="w-10 h-10 mx-auto opacity-10" />
                <p className="text-sm text-muted-foreground">لا توجد بلاغات حالياً</p>
              </div>
            ) : (
              tickets.map(ticket => (
                <div 
                  key={ticket.id} 
                  onClick={() => setSelectedTicket(ticket)}
                  className={`p-5 border-b cursor-pointer transition-all hover:bg-primary/5 ${selectedTicket?.id === ticket.id ? 'bg-primary/10 border-r-4 border-r-primary' : ''}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold text-sm line-clamp-1">{ticket.subject}</p>
                    <Badge className={`border-none text-[10px] ${ticket.status === 'open' ? "bg-amber-500 text-white" : "bg-green-500 text-white"}`}>
                      {ticket.status === 'open' ? 'نشطة' : 'مغلقة'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
                      {ticket.booking_id ? "بلاغ مرتبط بطلب" : "بلاغ عام"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(ticket.created_at).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* منطقة المحادثة */}
        <Card className="md:col-span-2 flex flex-col rounded-3xl border-2 overflow-hidden shadow-md">
          {selectedTicket ? (
            <>
              <CardHeader className="border-b bg-card py-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-full"><UserIcon className="w-5 h-5 text-primary" /></div>
                    <div>
                      <CardTitle className="text-lg font-black">{selectedTicket.subject}</CardTitle>
                      <p className="text-[10px] text-muted-foreground">
                        {role === 'admin' ? `المرسل: ${selectedTicket.user?.full_name}` : "فريق الدعم الفني متصل"}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedTicket(null)} className="md:hidden"><ArrowRight /></Button>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 overflow-y-auto p-6 space-y-4 bg-muted/5">
                {/* رسالة البلاغ الأصلية في الأعلى كبداية للمحادثة */}
                <div className="flex justify-start mb-6">
                  <div className="max-w-[85%] p-4 rounded-2xl bg-amber-50 border border-amber-100 text-amber-900 shadow-sm">
                    <p className="text-xs font-black mb-1">نص البلاغ الأصلي:</p>
                    <p className="text-sm italic">"{selectedTicket.message}"</p>
                  </div>
                </div>

                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${
                      msg.sender_id === user?.id 
                      ? 'bg-primary text-white rounded-br-none' 
                      : 'bg-white text-foreground rounded-bl-none border border-border'
                    }`}>
                      <p className="text-sm leading-relaxed">{msg.message}</p>
                      <p className={`text-[9px] mt-2 block opacity-60 ${msg.sender_id === user?.id ? 'text-left' : 'text-right'}`}>
                        {new Date(msg.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>

              <div className="p-4 border-t bg-card flex gap-2 items-center">
                <Input 
                  placeholder="اكتب ردك هنا..." 
                  value={newMessage} 
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  className="rounded-2xl h-12 border-2 focus-visible:ring-primary"
                />
                <Button onClick={sendMessage} className="rounded-2xl w-14 h-12 p-0 shadow-lg shadow-primary/20">
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-10 space-y-4">
              <div className="bg-primary/5 p-6 rounded-full">
                <MessageCircle className="w-16 h-16 text-primary/20" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-muted-foreground tracking-tight">بوابة الدعم الفني</h3>
                <p className="text-sm text-muted-foreground/60">اختر إحدى التذاكر من القائمة الجانبية لبدء المحادثة مع الإدارة</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default SupportTickets;