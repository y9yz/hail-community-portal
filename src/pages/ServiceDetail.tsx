import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { ArrowRight, MapPin, CalendarIcon, Send, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { categories, timeSlots } from "@/data/categories";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Service } from "@/types/service";
import ReviewSection from "@/components/ReviewSection";

const ServiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, role, loading: authLoading } = useAuth();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const [problemDescription, setProblemDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [isCheckingTimes, setIsCheckingTimes] = useState(false);

  /* حماية المسار: منع الإدارة والمزودين من الوصول لصفحة الحجز وتوجيههم لصفحاتهم */
  useEffect(() => {
    if (authLoading) return;
    if (role === "admin") { navigate("/admin", { replace: true }); return; }
    if (role === "provider") { navigate("/provider", { replace: true }); return; }
  }, [role, authLoading, navigate]);

  /* جلب تفاصيل الخدمة مع بيانات الملف الشخصي للمزود المرتبط بها */
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("services")
        .select("*, provider:profiles!services_provider_id_fkey(full_name)")
        .eq("id", id as string)
        .single();
      setService(data as any);
      setLoading(false);
    };
    if (id) fetch();
  }, [id]);

  /* التحقق من المواعيد المحجوزة مسبقاً لنفس اليوم لمنع التضارب في الحجوزات */
  useEffect(() => {
    const fetchBookedTimes = async () => {
      if (!selectedDate || !service?.provider_id) return;
      
      setIsCheckingTimes(true);
      try {
        const formattedDate = selectedDate.toISOString().split("T")[0];
        
        const { data, error } = await supabase
          .from("bookings")
          .select("scheduled_time")
          .eq("provider_id", service.provider_id)
          .eq("scheduled_date", formattedDate)
          /* استثناء المواعيد المرفوضة من الحظر لتوفيرها للعملاء مرة أخرى */
          .neq("provider_status", "declined");

        if (error) throw error;

        if (data) {
          const times = data.map((b: any) => b.scheduled_time);
          setBookedTimes(times);
        }
      } catch (err) {
        console.error("خطأ في فحص المواعيد:", err);
      } finally {
        setIsCheckingTimes(false);
      }
    };

    if (selectedDate) {
      fetchBookedTimes();
      setSelectedTime(undefined); 
    }
  }, [selectedDate, service?.provider_id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground font-black">{t('serviceDetail.loading')}</div>;
  if (!service) return <div className="min-h-screen flex items-center justify-center text-muted-foreground font-black">{t('serviceDetail.not_found')}</div>;

  const categoryLabel = categories.find((c) => c.id === service.category)?.label ?? "";
  const canProceed = selectedDate && selectedTime && problemDescription.trim().length > 0;

  /* التحقق من ما إذا كان الوقت المختار في الماضي */
  const isTimePast = (time: string): boolean => {
    if (!selectedDate) return false;
    
    const today = new Date();
    const isToday = selectedDate.toDateString() === today.toDateString();
    
    if (!isToday) return false;
    
    const [hours, minutes] = time.split(":").map(Number);
    const selectedDateTime = new Date(today);
    selectedDateTime.setHours(hours, minutes, 0, 0);
    
    return selectedDateTime < today;
  };

  /* معالجة إنشاء طلب حجز جديد وإرسال إشعار فوري للمزود المعني */
  const handleSubmitRequest = async () => {
    if (!user) { toast.error(t('serviceDetail.login_required')); navigate("/auth"); return; }
    if (role !== "client") { toast.error(t('serviceDetail.clients_only')); return; }

    setSubmitting(true);
    try {
      /* إدراج سجل الطلب في جدول الحجوزات */
      const { data: booking, error } = await supabase.from("bookings").insert({
        client_id: user.id,
        provider_id: service.provider_id,
        service_id: service.id,
        service_title: service.title,
        problem_description: problemDescription,
        fee: 0,
        provider_status: "pending" as any,
        scheduled_date: selectedDate?.toISOString().split("T")[0],
        scheduled_time: selectedTime,
      }).select().single();

      if (error) throw error;

      /* توليد إشعار للمزود بوجود طلب جديد للخدمة */
      await supabase.from("notifications").insert({
        recipient_id: service.provider_id,
        sender_id: user.id,
        booking_id: booking.id,
        content: t('serviceDetail.notification_new_request', { title: service.title }),
      });

      toast.success(t('serviceDetail.request_success'));
      navigate("/my-bookings");
    } catch (err: any) {
      toast.error(err.message || t('serviceDetail.request_failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b">
        <div className="container flex items-center h-16 gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full hover:bg-muted">
            <ArrowRight className="w-6 h-6 text-primary" />
          </Button>
          <h1 className="font-black text-xl text-primary tracking-tighter">{t('serviceDetail.title')}</h1>
        </div>
      </header>

      <div className="container py-6 space-y-6 max-w-3xl">
        <div className="rounded-[2rem] overflow-hidden h-56 md:h-80 border-2 shadow-sm">
          <img src={service.image_url || "/placeholder.svg"} alt={service.title} className="w-full h-full object-cover" />
        </div>

        <div className="space-y-4 px-2">
          <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1.5 rounded-full text-sm font-bold">{categoryLabel}</Badge>
          <h2 className="text-3xl font-black text-foreground">{service.title}</h2>
          <p className="text-muted-foreground leading-relaxed text-sm md:text-base font-medium">{service.description}</p>
          
          <div className="flex flex-wrap gap-4 text-sm bg-muted/30 p-4 rounded-2xl border">
            <span className="font-bold">{t('serviceDetail.provider_label')}: <span className="text-primary">{service.provider?.full_name || "—"}</span></span>
            {service.address_name && (
              <div className="flex items-center gap-1.5 font-bold text-muted-foreground">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>{service.address_name}</span>
              </div>
            )}
          </div>

          {service.maps_link && (
            <a href={service.maps_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-primary underline text-sm font-bold bg-primary/5 px-4 py-2 rounded-xl hover:bg-primary/10 transition-colors">
              <ExternalLink className="w-4 h-4" /> {t('serviceDetail.view_location')}
            </a>
          )}
          <div className="pt-2">
            <Badge variant="outline" className="text-xs px-3 py-1.5 rounded-lg border-amber-200 bg-amber-50 text-amber-700 font-bold">{t('serviceDetail.payment_badge')}</Badge>
          </div>
        </div>

        <Card className="rounded-[2rem] border-2 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <Label htmlFor="problem" className="font-black text-lg">{t('serviceDetail.request_details')}</Label>
            <Textarea
              id="problem"
              placeholder={t('serviceDetail.request_placeholder')}
              className="min-h-[140px] rounded-2xl bg-muted/20 border-2 focus-visible:ring-primary resize-none p-4"
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              dir="rtl"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground font-bold">{t('serviceDetail.char_count', { count: problemDescription.length })}</p>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-2 shadow-sm">
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <h3 className="font-black text-lg">{t('serviceDetail.choose_date')}</h3>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-start rounded-2xl h-14 border-2 font-bold", !selectedDate && "text-muted-foreground")}>
                    <CalendarIcon className="ms-0 me-3 h-5 w-5 text-primary" />
                    {selectedDate ? format(selectedDate, "PPP", { locale: ar }) : t('serviceDetail.select_date_prompt')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl border-2" align="start">
                  <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            {selectedDate && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h4 className="font-black text-sm text-foreground flex items-center gap-2">
                  {t('serviceDetail.available_times')}
                  {isCheckingTimes && <span className="text-[10px] text-muted-foreground font-normal animate-pulse">({t('serviceDetail.checking_times')})</span>}
                </h4>
                
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {timeSlots.map((time) => {
                    const isBooked = bookedTimes.includes(time);
                    const isPast = isTimePast(time);
                    
                    return (
                      <Button 
                        key={time} 
                        variant={selectedTime === time ? "default" : "outline"} 
                        /* تعطيل الأوقات المحجوزة بالفعل من الداتابيس لنفس اليوم والمزود */
                        disabled={isBooked || isCheckingTimes || isPast}
                        onClick={() => setSelectedTime(time)}
                        className={cn(
                          "rounded-xl text-sm h-12 font-bold border-2 transition-all",
                          selectedTime === time && "shadow-lg shadow-primary/20",
                          isBooked && "opacity-40 bg-muted/50 text-muted-foreground line-through cursor-not-allowed border-dashed hover:bg-muted/50",
                          isPast && "opacity-40 bg-muted/50 text-muted-foreground line-through cursor-not-allowed border-dashed hover:bg-muted/50"
                        )}
                      >
                        {time}
                      </Button>
                    );
                  })}
                </div>
                
                {bookedTimes.length > 0 && (
                   <p className="text-[10px] text-amber-600 font-bold bg-amber-50 p-2 rounded-lg inline-block">
                     * الأوقات المشطوبة تم حجزها مسبقاً من قبل عملاء آخرين أو قد مضت
                   </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Button className="w-full h-16 text-xl font-black rounded-[1.5rem] gap-2 shadow-xl shadow-primary/20 hover:scale-[1.01] transition-transform" disabled={!canProceed || submitting || isCheckingTimes} onClick={handleSubmitRequest}>
          <Send className="w-6 h-6 rtl:-scale-x-100" />
          {submitting ? t('serviceDetail.submitting') : t('serviceDetail.submit_button')}
        </Button>

        <div className="pt-8 border-t-2 border-dashed">
          <ReviewSection serviceId={service.id} />
        </div>
      </div>
    </div>
  );
};

export default ServiceDetail;