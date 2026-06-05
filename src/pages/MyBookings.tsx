// استيراد المكتبات والمكونات الأساسية المطلوبة
import { useEffect, useState, useCallback } from "react";
import i18n from "@/i18n/config";
import { useTranslation } from 'react-i18next';
import { useNavigate } from "react-router-dom";
import { ClipboardList, ArrowRight, Clock, CheckCircle2, XCircle, MessageCircle, Ban, LifeBuoy, Star, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import ChatDialog from "@/components/ChatDialog";
import RatingDialog from "@/components/RatingDialog";
import SupportTicketDialog from "@/components/SupportTicketDialog";
import { toast } from "sonner";

// دالة لتحديد حالة الطلب وإرجاع النص، اللون، والأيقونة المناسبة للعرض
const getBookingStatus = (b: any) => {
  if (b.status === "completed") return { label: i18n.t('bookings.status.completed'), color: "bg-green-500 text-white border-none", icon: CheckCheck };
  if (b.provider_status === "declined") return { label: i18n.t('bookings.status.declined'), color: "bg-destructive text-white border-none", icon: XCircle };
  if (b.provider_status === "pending") return { label: i18n.t('bookings.status.pending'), color: "bg-amber-500 text-white border-none", icon: Clock };
  if (b.provider_status === "accepted") return { label: i18n.t('bookings.status.accepted'), color: "bg-blue-500 text-white border-none", icon: CheckCircle2 };
  return { label: "—", color: "bg-secondary", icon: Clock };
};

// المكون الرئيسي لصفحة "طلباتي"
const MyBookings = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  
  // تعريف متغيرات الحالة (States)
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatBooking, setChatBooking] = useState<any>(null);
  const [ratingBooking, setRatingBooking] = useState<any>(null);
  const [supportBooking, setSupportBooking] = useState<any>(null);

  // دالة لجلب طلبات المستخدم من قاعدة البيانات مع تفاصيل مزود الخدمة
  const fetchBookings = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, provider:profiles!bookings_provider_id_fkey(full_name, phone), service:services(maps_link)")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (err: any) {
      console.error("Fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // تنفيذ جلب الطلبات وإعداد الاستماع الفوري للتحديثات عند تحميل الصفحة
  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) { navigate("/auth"); return; }
    
    fetchBookings();

    // إعداد قناة اتصال (Realtime) لتحديث القائمة فور حدوث تغيير في قاعدة البيانات
    const channelName = `realtime-bookings:${user.id}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { 
        event: "*", 
        schema: "public", 
        table: "bookings", 
        filter: `client_id=eq.${user.id}` 
      }, () => {
        fetchBookings();
      })
      .subscribe();

    // إغلاق الاتصال عند مغادرة الصفحة لتوفير الموارد
    return () => { 
      supabase.removeChannel(channel); 
    };
  }, [user?.id, authLoading, fetchBookings, navigate]);

  // دالة لمعالجة إلغاء الطلب من قبل العميل
  const handleCancel = async (booking: any) => {
    if (!window.confirm(i18n.t('bookings.cancel_confirm'))) return;
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ provider_status: "declined" } as any)
        .eq("id", booking.id);
      if (error) throw error;
      
      toast.success(t('bookings.cancelled_success'));
      fetchBookings();
    } catch (err: any) {
      toast.error(t('bookings.cancel_failed'));
    }
  };

  // واجهة التحميل التي تظهر قبل جاهزية البيانات
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16 text-center font-bold">{t('bookings.updating')}</div>
      </div>
    );
  }

  // واجهة الصفحة الرئيسية
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      
      // الشريط العلوي (الترويسة) وزر العودة للصفحة الرئيسية
      <header className="sticky top-16 z-40 bg-card/80 backdrop-blur-lg border-b">
        <div className="container flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-full hover:bg-muted">
              <ArrowRight className="w-5 h-5 text-primary" />
            </Button>
            <h1 className="text-2xl font-black text-foreground tracking-tighter">{t('bookings.title')}</h1>
          </div>
        </div>
      </header>
      
      <div className="container py-6 max-w-2xl">
        // عرض واجهة فارغة في حال لم يقم العميل بأي طلبات
        {bookings.length === 0 ? (
          <Card className="rounded-3xl border-dashed border-2 py-20 bg-muted/5">
            <CardContent className="text-center space-y-4">
              <ClipboardList className="w-12 h-12 mx-auto opacity-20 text-primary" />
              <p className="text-muted-foreground font-medium">{t('bookings.empty')}</p>
              <Button onClick={() => navigate("/")} className="rounded-2xl px-8 h-12 font-bold">{t('bookings.start_now')}</Button>
            </CardContent>
          </Card>
        ) : (
          // عرض قائمة الطلبات
          <div className="space-y-6">
            {bookings.map((b) => {
              const status = getBookingStatus(b);
              const StatusIcon = status.icon;
              
              // تحديد صلاحيات عرض الأزرار بناءً على حالة الطلب
              const canCancel = b.provider_status === "pending";
              const canChat = b.status !== "completed" && b.provider_status !== "declined";
              const canRate = b.status === "completed" && b.has_review !== true;
              
              return (
                <Card key={b.id} className="rounded-3xl border-2 hover:shadow-lg transition-all overflow-hidden border-primary/5">
                  
                  // رأس بطاقة الطلب (العنوان، رقم الطلب، وحالة الطلب)
                  <div className="p-5 border-b bg-muted/10 flex items-center justify-between">
                    <div className="space-y-1 text-right">
                      <h3 className="font-black text-lg">{b.service_title}</h3>
                      <Badge variant="outline" className="text-[10px] font-mono tracking-tighter bg-background">#{b.order_number}</Badge>
                    </div>
                    <Badge className={`${status.color} px-4 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1.5 shadow-sm`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {status.label}
                    </Badge>
                  </div>

                  // تفاصيل الطلب (الوصف، بيانات المزود، المواعيد)
                  <div className="p-5 space-y-4 text-right">
                    <div className="bg-muted/30 p-4 rounded-2xl border-r-4 border-primary/20">
                        <p className="text-sm text-muted-foreground italic leading-relaxed">"{b.problem_description}"</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="bg-secondary/30 p-3 rounded-xl">
                        <p className="text-muted-foreground mb-1">{t('bookings.provider_label')}:</p>
                        <p className="font-black text-sm">{b.provider?.full_name || "—"}</p>
                      </div>
                      <div className="bg-emerald-50/50 p-3 rounded-xl">
                        <p className="text-emerald-700/60 mb-1">{t('bookings.payment_method_label')}:</p>
                        <p className="font-black text-sm text-emerald-700">{t('bookings.payment_method_local')}</p>
                      </div>
                    </div>

                    // عرض تاريخ ووقت الموعد إن وجد
                    {b.scheduled_date && (
                      <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground bg-muted/20 p-2 rounded-lg">
                        <Clock className="w-4 h-4 text-primary" />
                        <span>{t('bookings.appointment')}: {b.scheduled_date} | {b.scheduled_time}</span>
                      </div>
                    )}

                    // أزرار الإجراءات الخاصة بالطلب
                    <div className="flex gap-2 flex-wrap pt-2">
                      {canRate && (
                        <Button className="rounded-2xl gap-2 flex-1 h-12 text-md font-black shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90" onClick={() => setRatingBooking(b)}>
                          <Star className="w-5 h-5 fill-white" /> {t('bookings.rate_now')}
                        </Button>
                      )}
                      
                      {canChat && (
                        <Button variant="outline" className="rounded-2xl gap-2 flex-1 h-12 border-2 border-primary text-primary font-bold" onClick={() => setChatBooking(b)}>
                          <MessageCircle className="w-5 h-5" /> {t('bookings.chat')}
                        </Button>
                      )}
                      
                      <Button variant="secondary" className="rounded-2xl gap-2 flex-1 h-12 font-bold" onClick={() => setSupportBooking(b)}>
                        <LifeBuoy className="w-5 h-5" /> {t('bookings.support')}
                      </Button>

                      {canCancel && (
                        <Button variant="ghost" className="rounded-2xl gap-2 flex-1 h-12 text-destructive font-bold hover:bg-destructive/5" onClick={() => handleCancel(b)}>
                          <Ban className="w-5 h-5" /> {t('bookings.cancel')}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      // النوافذ المنبثقة (Modal Dialogs) التي تظهر عند تفعيل أحد الإجراءات
      {ratingBooking && (
        <RatingDialog
          open={!!ratingBooking}
          onOpenChange={(open) => !open && setRatingBooking(null)}
          serviceId={ratingBooking.service_id}
          serviceTitle={ratingBooking.service_title}
          bookingId={ratingBooking.id}
          onSubmitted={() => {
            fetchBookings();
            setRatingBooking(null);
          }}
        />
      )}

      {chatBooking && (
        <ChatDialog open={!!chatBooking} onOpenChange={(open) => !open && setChatBooking(null)} bookingId={chatBooking.id} otherName={chatBooking.provider?.full_name || t('roles.provider')} />
      )}

      <SupportTicketDialog
        open={!!supportBooking}
        onOpenChange={(open) => !open && setSupportBooking(null)}
        booking={supportBooking ? { 
          id: supportBooking.id, 
          order_number: supportBooking.order_number, 
          service_title: supportBooking.service_title 
        } : undefined}
      />
    </div>
  );
};

export default MyBookings;