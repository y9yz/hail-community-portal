// استيراد المكتبات والمكونات اللازمة
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2, XCircle, Clock, MessageSquare, Plus, Package, Inbox, Upload,
  Image, FileText, Edit, Phone, MessageCircle, CheckCheck, TrendingUp, BarChart3, Download, Star, MapPin, Wallet, AlertTriangle, ArrowLeft, LifeBuoy, Calendar, BellRing
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import ChatDialog from "@/components/ChatDialog";
import SupportTicketDialog from "@/components/SupportTicketDialog";
import { toast } from "sonner";
import { categories } from "@/data/categories";
import type { Service } from "@/types/service";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from "recharts";

// ألوان مخصصة للرسوم البيانية
const COLORS = ["#10b981", "#f59e0b", "#3b82f6", "#ef4444"];

const ProviderDashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, role, loading: authLoading } = useAuth();
  
  // تعريف متغيرات الحالة (State) الخاصة بالبيانات والتحميل
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  
  // متغيرات حالة الإحصائيات والتقييمات والرسوم البيانية
  const [providerStats, setProviderStats] = useState({
    total: 0, accepted: 0, pending: 0, completed: 0, declined: 0, avgRating: 0
  });
  const [recentReviews, setRecentReviews] = useState<{rating: number, comment: string, serviceTitle: string}[]>([]);
  const [timelineData, setTimelineData] = useState<{date: string, orders: number}[]>([]);

  // متغيرات حالة النوافذ المنبثقة (المحادثة والدعم الفني)
  const [chatBooking, setChatBooking] = useState<any>(null);
  const [supportOpen, setSupportOpen] = useState(false);

  // متغيرات حالة نموذج إضافة خدمة جديدة
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [mapsLink, setMapsLink] = useState("");
  const [serviceImage, setServiceImage] = useState<File | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [addingService, setAddingService] = useState(false);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const licenseInputRef = useRef<HTMLInputElement>(null);

  const fetchedForUserId = useRef<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // حساب الأيام المتبقية في الفترة التجريبية
  const calculateTrialDays = () => {
    if (subscription) {
      if (subscription.status === 'active') return 30; 
      if (subscription.status === 'expired') return 0;
      
      const endDate = subscription.expires_at || subscription.trial_ends_at;
      if (endDate) {
        const remainingTime = new Date(endDate).getTime() - Date.now();
        return Math.max(0, Math.floor(remainingTime / (1000 * 60 * 60 * 24)));
      }
    }

    const creationDate = user?.created_at;
    if (!creationDate) return 30; 
    const createdTime = new Date(creationDate).getTime();
    const currentTime = Date.now();
    const daysPassed = Math.floor((currentTime - createdTime) / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - daysPassed);
  };

  const trialDaysLeft = calculateTrialDays();
  const isSubscribed = subscription && subscription.status === 'active';

  // التأكد من تسجيل الدخول وصلاحية المستخدم كمقدم خدمة
  useEffect(() => {
    if (authLoading) return;
    if (!user || role !== "provider") { navigate("/", { replace: true }); return; }

    if (fetchedForUserId.current === user.id) return;
    fetchedForUserId.current = user.id;
    fetchData();
    setupRealtimeListener();
  }, [user?.id, role, authLoading, navigate]);

  // التحقق من حالة الدفع عبر رابط الصفحة لتحديث حالة الاشتراك فوراً
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const justPaid = params.get('payment_success');
    if (justPaid === 'true' && user?.id) {
      refetchSubscription();
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user?.id]);

  // إعداد الاستماع الفوري لقاعدة البيانات (تحديث الطلبات والاشتراكات بدون إعادة تحميل)
  const setupRealtimeListener = () => {
    if (!user?.id) return;

    const subChannel = supabase
      .channel(`subscriptions_channel:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions', filter: `provider_id=eq.${user.id}` }, () => {
        refetchSubscription();
      })
      .subscribe();

    const bookingsChannel = supabase
      .channel(`bookings_channel:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `provider_id=eq.${user.id}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          toast.success('طلب خدمة جديد وصلك الآن! 🔔', { duration: 5000, icon: <BellRing className="w-5 h-5 animate-bounce text-emerald-500" /> });
        } else if (payload.eventType === 'UPDATE') {
          toast.info('تم تحديث حالة أحد الطلبات 🔄');
        }
        fetchData(); 
      })
      .subscribe();

    unsubscribeRef.current = () => {
      supabase.removeChannel(subChannel);
      supabase.removeChannel(bookingsChannel);
    };
  };

  // جلب وتحديث بيانات الاشتراك الخاص بمقدم الخدمة
  const refetchSubscription = async () => {
    if (!user?.id) return;
    setSubscriptionLoading(true);
    try {
      const { data: subData, error: subError } = await supabase
        .from("subscriptions" as any)
        .select("*")
        .eq("provider_id", user.id)
        .order("created_at", { ascending: false });

      if (!subError && subData && subData.length > 0) {
        const activeSub = subData.find((s: any) => s.status === 'active');
        setSubscription(activeSub || subData[0]);
      } else {
        setSubscription(null);
      }
    } catch (err) {
      console.error('[RefetchSubscription] Error:', err);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  // جلب كافة البيانات الأساسية للوحة التحكم (خدمات، طلبات، تقييمات، إحصائيات)
  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const { data: subData, error: subError } = await supabase
        .from("subscriptions" as any)
        .select("*")
        .eq("provider_id", user.id)
        .order("created_at", { ascending: false });

      if (!subError && subData && subData.length > 0) {
        const activeSub = subData.find((s: any) => s.status === 'active');
        setSubscription(activeSub || subData[0]);
      } else {
        setSubscription(null);
      }
    } catch (subErr) {
      setSubscription(null);
    }

    try {
      const [resSvc, resBk, resReview] = await Promise.all([
        supabase.from("services").select("*").eq("provider_id", user.id).order("created_at", { ascending: false }),
        supabase.from("bookings").select("*, client:profiles!bookings_client_id_fkey(full_name, phone)").eq("provider_id", user.id).order("created_at", { ascending: false }),
        supabase.from("reviews").select("rating, comment, service_id").order("created_at", { ascending: false }),
      ]);

      const svc = resSvc.data || [];
      const bk = resBk.data || [];
      const reviewData = resReview.data || [];

      setServices(svc);
      setBookings(bk);

      // استخراج وتنسيق بيانات الرسم البياني الزمني للطلبات
      const timelineMap: Record<string, number> = {};
      bk.forEach((b: any) => {
        const dateStr = new Date(b.created_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
        timelineMap[dateStr] = (timelineMap[dateStr] || 0) + 1;
      });
      const tData = Object.entries(timelineMap).map(([date, orders]) => ({ date, orders })).reverse();
      setTimelineData(tData);

      // تجهيز قائمة التقييمات وحساب متوسط التقييم
      const myReviews = reviewData.filter((r: any) => svc.map(s => s.id).includes(r.service_id));
      const avg = myReviews.length > 0 ? myReviews.reduce((s: number, r: any) => s + r.rating, 0) / myReviews.length : 0;
      
      const commentsWithTitles = myReviews
        .filter((r: any) => r.comment && r.comment.trim() !== '')
        .map((r: any) => ({
          rating: r.rating,
          comment: r.comment,
          serviceTitle: svc.find((s: any) => s.id === r.service_id)?.title || t('service.default_title')
        }));
      setRecentReviews(commentsWithTitles);

      // تعيين الإحصائيات النهائية
      setProviderStats({
        total: bk.length,
        accepted: bk.filter((b: any) => b.provider_status === "accepted").length,
        pending: bk.filter((b: any) => b.provider_status === "pending").length,
        completed: bk.filter((b: any) => b.status === "completed").length,
        declined: bk.filter((b: any) => b.provider_status === "declined").length,
        avgRating: Math.round(avg * 10) / 10
      });
    } catch (err: any) {
      toast.error(t('provider.fetch_error'));
    } finally {
      setLoading(false);
    }
  };

  // توجيه المستخدم لصفحة الدفع في حال انتهاء الفترة التجريبية وعدم التجديد
  useEffect(() => {
    if (loading || authLoading) return;
    if (isSubscribed) return;
    if (trialDaysLeft > 0) return;

    toast.error(t('provider.trial_expired_alert'));
    navigate('/payment', { replace: true });
  }, [loading, authLoading, subscriptionLoading, isSubscribed, trialDaysLeft, navigate, t]);

  // إزالة الاستماع الفوري عند تفريغ المكون
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, []);

  // تحديث البيانات يدوياً
  const handleManualRefresh = () => {
    fetchedForUserId.current = null;
    fetchData();
  };

  // تصدير جدول الطلبات إلى ملف CSV (متوافق مع إكسل)
  const handleExportCSV = () => {
    if (!bookings || bookings.length === 0) {
      toast.error(t('admin.no_data_error') || 'لا توجد بيانات متاحة للتصدير.');
      return;
    }

    const headers = ['رقم الطلب', 'اسم الخدمة', 'اسم العميل', 'رقم الجوال', 'تاريخ الطلب', 'تاريخ التنفيذ', 'حالة الطلب'];
    
    const csvData = bookings.map(b => [
      b.order_number || b.id.substring(0, 8),
      b.service_title,
      b.client?.full_name || 'غير متوفر',
      b.client?.phone || 'غير متوفر',
      new Date(b.created_at).toLocaleDateString('ar-SA'),
      b.scheduled_date ? `${b.scheduled_date} ${b.scheduled_time || ''}` : 'غير محدد',
      b.status === 'completed' ? 'مكتمل بنجاح' : b.provider_status === 'declined' ? 'تم الرفض' : b.provider_status === 'accepted' ? 'مقبول وفي الانتظار' : 'قيد المراجعة'
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `تقرير_طلبات_${new Date().toLocaleDateString('en-GB').replace(/\//g,'-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('تم تصدير التقرير بنجاح!');
  };

  const isFormValid = !!(title && category && description && neighborhood && mapsLink && serviceImage && licenseFile);

  // معالجة نموذج إضافة خدمة جديدة ورفع المرفقات
  const handleSubmitService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isFormValid) return;
    setAddingService(true);
    try {
      const imagePath = `${user.id}/${Date.now()}-svc.jpg`;
      await supabase.storage.from("public-assets").upload(imagePath, serviceImage!);
      const { data: imgUrl } = supabase.storage.from("public-assets").getPublicUrl(imagePath);

      const licensePath = `${user.id}/${Date.now()}-lic.jpg`;
      await supabase.storage.from("private-documents").upload(licensePath, licenseFile!);

      const { error } = await supabase.from("services").insert({
        provider_id: user.id, title, category, description,
        image_url: imgUrl.publicUrl, license_url: licensePath,
        address_name: neighborhood, maps_link: mapsLink, 
      } as any);

      if (error) throw error;
      toast.success(t('provider.service_published'));
      handleManualRefresh();
      setTitle(""); setCategory(""); setDescription(""); setNeighborhood(""); setMapsLink(""); setServiceImage(null); setLicenseFile(null);
    } catch (err: any) { toast.error(err.message); }
    finally { setAddingService(false); }
  };

  // بيانات مخطط التوزيع الخاص بحالة الطلبات
  const chartData = [
    { name: t('provider.status.completed'), value: providerStats.completed },
    { name: t('provider.status.pending'), value: providerStats.pending },
    { name: t('provider.status.declined'), value: providerStats.declined },
  ];

  // إخفاء المحتوى إذا انتهت الفترة التجريبية
  if (!loading && !authLoading && !isSubscribed && trialDaysLeft <= 0) {
    return null; 
  }

  // شاشة التحميل الأولية
  if (loading || authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center font-bold text-muted-foreground animate-pulse">{t('provider.loading_dashboard')}</div>;
  }

  return (
    <div className="min-h-screen bg-background pb-10 text-right flex flex-col" dir="rtl">
      <Navbar />
      
      {/* الشريط العلوي الخاص بلوحة التحكم */}
      <header className="sticky top-16 z-40 bg-card/80 backdrop-blur-lg border-b shadow-sm">
        <div className="container flex flex-col md:flex-row items-start md:items-center justify-between h-auto md:h-16 gap-3 md:gap-4 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full">
            <h1 className="text-2xl font-black text-primary flex items-center gap-3">
              {t('provider.title')}
            </h1>
            {!isSubscribed && trialDaysLeft > 0 && (
              <div className="bg-amber-100 text-amber-600 border border-amber-300 font-black px-3 py-1.5 rounded-full flex items-center gap-2 text-sm shadow-sm">
                <Clock className="w-4 h-4 animate-pulse" />
                {t('provider.trial_badge', { days: trialDaysLeft })}
              </div>
            )}
            {isSubscribed && (
              <div className="bg-emerald-100 text-emerald-700 border border-emerald-300 font-black px-4 py-1.5 rounded-full flex items-center gap-2 text-sm shadow-sm">
                <CheckCircle2 className="w-4 h-4" />
                مشترك رسمي فعال ✓
              </div>
            )}
          </div>
          <Button onClick={() => setSupportOpen(true)} variant="secondary" className="rounded-xl gap-2 font-bold h-10 px-4 text-sm hidden md:inline-flex shrink-0">
            <LifeBuoy className="w-4 h-4" /> {t('support.title')}
          </Button>
        </div>
      </header>
      
      <div className="container py-4 max-w-6xl space-y-4 flex-1 overflow-auto">
        
        {/* التنبيه بضرورة تفعيل الاشتراك في حال الاعتماد على الفترة التجريبية */}
        {!isSubscribed && trialDaysLeft > 0 && (
          <Card className="rounded-[2rem] border-2 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm transition-all border-primary/20 bg-primary/5">
             <div className="space-y-2 text-center md:text-right">
                <h3 className="text-xl font-black flex items-center gap-2 justify-center md:justify-start text-primary">
                  <Clock className="w-6 h-6" /> {t('provider.trial_active', { days: trialDaysLeft })}
                </h3>
                <p className="text-sm font-bold text-muted-foreground">
                  {t('provider.trial_active_desc')}
                </p>
             </div>
             <Button onClick={() => navigate("/payment")} className="rounded-2xl h-14 px-8 font-black shadow-lg hover:scale-105 transition-transform text-lg w-full md:w-auto">
                {t('provider.activate_subscription')}
             </Button>
          </Card>
        )}

        {/* عرض بطاقات الإحصائيات والتقييمات */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="grid grid-cols-2 gap-4 lg:col-span-2">
            <Card className="rounded-3xl border-2"><CardContent className="p-6 text-center h-full flex flex-col justify-center">
              <p className="text-[10px] text-muted-foreground uppercase font-black mb-1">{t('provider.total_orders')}</p>
              <h3 className="text-3xl font-black">{providerStats.total}</h3>
            </CardContent></Card>
            <Card className="rounded-3xl border-2 border-amber-100 bg-amber-50/20"><CardContent className="p-6 text-center h-full flex flex-col justify-center">
              <p className="text-[10px] text-amber-600 uppercase font-black mb-1">{t('provider.pending')}</p>
              <h3 className="text-3xl font-black text-amber-600">{providerStats.pending}</h3>
            </CardContent></Card>
            <Card className="rounded-3xl border-2 border-emerald-100 bg-emerald-50/20"><CardContent className="p-6 text-center h-full flex flex-col justify-center">
              <p className="text-[10px] text-emerald-600 uppercase font-black mb-1">{t('provider.completed')}</p>
              <h3 className="text-3xl font-black text-emerald-600">{providerStats.completed}</h3>
            </CardContent></Card>
            <Card className="rounded-3xl border-2"><CardContent className="p-6 text-center h-full flex flex-col justify-center">
              <p className="text-[10px] text-muted-foreground uppercase font-black mb-1">{t('provider.avg_rating')}</p>
              <h3 className="text-3xl font-black text-primary">{providerStats.avgRating} <Star className="inline w-5 h-5 mb-1 fill-primary" /></h3>
            </CardContent></Card>
          </div>

          {/* قائمة أحدث تقييمات العملاء */}
          <Card className="rounded-3xl border-2 bg-primary/5 border-primary/10 flex flex-col overflow-hidden max-h-[260px] lg:max-h-full">
            <div className="bg-primary text-primary-foreground px-4 py-3 font-black flex items-center gap-2 shadow-sm z-10 shrink-0">
              <Star className="w-5 h-5 fill-current" /> {t('provider.top_reviews')}
            </div>
            <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-3">
              {recentReviews.length > 0 ? (
                recentReviews.map((r, i) => (
                  <div key={i} className="bg-background/80 backdrop-blur rounded-2xl p-3 shadow-sm border border-primary/10 shrink-0">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] font-black text-primary/70 line-clamp-1 flex-1 me-2">{r.serviceTitle}</span>
                      <span className="text-xs font-bold flex items-center gap-1 text-amber-500 shrink-0">
                        {r.rating} <Star className="w-3 h-3 fill-current" />
                      </span>
                    </div>
                    <p className="text-sm font-bold text-foreground/90 italic">"{r.comment}"</p>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-2 py-8">
                  <MessageSquare className="w-8 h-8 text-muted-foreground" />
                  <p className="text-xs font-black">{t('provider.no_reviews')}</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* التبويبات الخاصة بلوحة التحكم */}
        <Tabs defaultValue="requests" className="w-full">
          <TabsList className="flex overflow-x-auto overflow-y-hidden w-full h-auto min-h-[4rem] rounded-[1.5rem] bg-muted/50 p-1.5 mb-8 shadow-inner justify-start sm:grid sm:grid-cols-4 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] gap-1">
            <TabsTrigger value="requests" className="rounded-xl font-black whitespace-nowrap shrink-0 snap-start px-6 sm:px-3 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              {t('provider.tabs.requests')}
            </TabsTrigger>
            <TabsTrigger value="services" className="rounded-xl font-black whitespace-nowrap shrink-0 snap-start px-6 sm:px-3 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              {t('provider.tabs.services')}
            </TabsTrigger>
            <TabsTrigger value="add" className="rounded-xl font-black whitespace-nowrap shrink-0 snap-start px-6 sm:px-3 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              {t('provider.tabs.add')}
            </TabsTrigger>
            <TabsTrigger value="reports" className="rounded-xl font-black whitespace-nowrap shrink-0 snap-start px-6 sm:px-3 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm text-primary">
              <BarChart3 className="w-4 h-4 me-1 inline-block" /> {t('provider.tabs.reports')}
            </TabsTrigger>
          </TabsList>

          {/* تبويب: الطلبات */}
          <TabsContent value="requests" className="space-y-4">
            {bookings.map(b => (
              <Card key={b.id} className="rounded-3xl border-2 overflow-hidden hover:border-primary/30 transition-all bg-card">
                <div className="p-6 flex flex-col md:flex-row justify-between gap-6">
                  <div className="space-y-4 flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="font-black text-xl flex items-center gap-2">
                        {b.service_title} <Badge variant="outline" className="text-xs font-mono">#{b.order_number}</Badge>
                      </h3>
                      <div className="flex flex-col items-end gap-1 text-[11px] font-bold text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {t('provider.order_time')}:</span>
                        <span dir="ltr">{new Date(b.created_at).toLocaleString('ar-SA', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', hour12: false })}</span>
                      </div>
                    </div>

                    <p className="text-sm bg-muted/30 p-4 rounded-2xl italic leading-relaxed">"{b.problem_description}"</p>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant="secondary" className="px-3 py-1 font-bold">{t('provider.customer')}: {b.client?.full_name}</Badge>
                      <Badge variant="outline" className="px-3 py-1 font-bold font-mono">{b.client?.phone}</Badge>
                      <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-xl border border-primary/20 shadow-sm">
                        <Calendar className="w-4 h-4" />
                        <span className="text-xs font-black">{t('provider.appointment')}: {b.scheduled_date || t('provider.appointment_pending')} | {b.scheduled_time || "--:--"}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 min-w-[160px] justify-center border-t md:border-t-0 md:border-r pt-4 md:pt-0 md:pr-6 border-dashed">
                    {b.provider_status === 'pending' ? (
                      <>
                        <Button onClick={async () => {
                          const { error } = await supabase.from('bookings').update({provider_status:'accepted'}).eq('id', b.id);
                          if (!error) {
                            await supabase.from("notifications").insert({
                              recipient_id: b.client_id,
                              sender_id: user?.id,
                              booking_id: b.id,
                              content: t('provider.notification_order_accepted', { title: b.service_title }),
                            });
                            handleManualRefresh();
                          }
                        }} className="rounded-2xl h-12 font-black bg-blue-500 hover:bg-blue-600">{t('provider.accept_order')}</Button>
                        <Button onClick={async () => {
                          const { error } = await supabase.from('bookings').update({provider_status:'declined'}).eq('id', b.id);
                          if (!error) {
                            await supabase.from("notifications").insert({
                              recipient_id: b.client_id,
                              sender_id: user?.id,
                              booking_id: b.id,
                              content: t('provider.notification_order_declined', { title: b.service_title }),
                            });
                            handleManualRefresh();
                          }
                        }} variant="outline" className="rounded-2xl h-12 font-black text-destructive border-destructive hover:bg-destructive/10">{t('provider.decline_order')}</Button>
                      </>
                    ) : b.provider_status === 'declined' ? (
                       <Badge className="bg-destructive/10 text-destructive py-3 justify-center border-none font-black rounded-2xl text-sm">{t('provider.declined_badge')}</Badge>
                    ) : b.status !== 'completed' ? (
                      <Button onClick={async () => {
                        const { error } = await supabase.from('bookings').update({status:'completed'}).eq('id', b.id);
                        if (!error) {
                          await supabase.from("notifications").insert({
                            recipient_id: b.client_id,
                            sender_id: user?.id,
                            booking_id: b.id,
                            content: t('provider.notification_service_completed', { title: b.service_title }),
                          });
                          handleManualRefresh();
                        }
                      }} className="rounded-2xl h-12 bg-emerald-500 hover:bg-emerald-600 font-black shadow-lg shadow-emerald-500/20">{t('provider.complete_service')}</Button>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-700 py-3 justify-center border-none font-black rounded-2xl text-sm">{t('provider.completed_badge')}</Badge>
                    )}
                    
                    {b.status !== 'completed' && b.provider_status !== 'declined' && (
                      <Button variant="ghost" onClick={() => setChatBooking(b)} className="rounded-2xl h-12 font-bold mt-2 bg-muted/50 hover:bg-primary/10 hover:text-primary">
                        <MessageCircle className="w-5 h-5 me-2" /> {t('provider.contact_client')}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
            {bookings.length === 0 && <div className="text-center py-20 opacity-30 font-black text-xl">{t('provider.no_requests')}</div>}
          </TabsContent>

          {/* تبويب: التقارير والرسوم البيانية */}
          <TabsContent value="reports" className="space-y-6">
              <Card className="rounded-[2rem] border-2 p-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                  <h3 className="font-black text-lg text-center md:text-right">{t('provider.reports.timeline') || 'التسلسل الزمني للطلبات'}</h3>
                  <Button variant="outline" onClick={handleExportCSV} className="rounded-xl font-bold gap-2 bg-primary/5 text-primary hover:bg-primary/10 border-primary/20 w-full md:w-auto">
                    <Download className="w-4 h-4" />
                    {t('provider.export_data') || 'تصدير التقرير (Excel)'}
                  </Button>
                </div>
                <div className="h-[300px]">
                   <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timelineData}>
                         <defs>
                           <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                             <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                           </linearGradient>
                         </defs>
                         <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                         <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontWeight: 'bold', fontSize: 12 }} />
                         <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                         <Tooltip contentStyle={{ borderRadius: '1rem', fontWeight: 'bold', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                         <Area type="monotone" dataKey="orders" name="عدد الطلبات" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorOrders)" />
                      </AreaChart>
                   </ResponsiveContainer>
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <Card className="rounded-[2rem] border-2 p-6">
                    <h3 className="font-black text-lg mb-6 text-center">{t('provider.reports.order_distribution')}</h3>
                    <div className="h-[300px]">
                       <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                             <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                                {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                             </Pie>
                             <Tooltip contentStyle={{ borderRadius: '1rem', fontWeight: 'bold' }} />
                             <Legend wrapperStyle={{ fontWeight: 'bold', fontSize: '12px' }} />
                          </PieChart>
                       </ResponsiveContainer>
                    </div>
                 </Card>
                 <Card className="rounded-[2rem] border-2 p-6">
                    <h3 className="font-black text-lg mb-6 text-center">{t('provider.reports.performance_stats')}</h3>
                    <div className="h-[300px]">
                       <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                             <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                             <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontWeight: 'bold', fontSize: 12 }} />
                             <YAxis axisLine={false} tickLine={false} />
                             <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '1rem', fontWeight: 'bold' }} />
                             <Bar dataKey="value" radius={[8, 8, 8, 8]}>
                                {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                             </Bar>
                          </BarChart>
                       </ResponsiveContainer>
                    </div>
                 </Card>
              </div>
          </TabsContent>

          {/* تبويب: عرض الخدمات */}
          <TabsContent value="services" className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map(s => (
              <Card key={s.id} className="rounded-[2rem] overflow-hidden border-2 flex flex-col group bg-card">
                <img src={s.image_url || ''} className="h-48 object-cover group-hover:scale-105 transition-transform" />
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-black text-xl line-clamp-1">{s.title}</h3>
                    <Badge className={`font-bold ${s.admin_status === 'approved' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                      {s.admin_status === 'approved' ? t('provider.status_verified') : t('provider.status_pending_review')}
                    </Badge>
                  </div>
                  <div className="mt-auto pt-4 border-t border-dashed">
                    <Button onClick={() => navigate(`/provider/service/${s.id}`)} variant="outline" className="w-full rounded-2xl h-12 font-black border-primary text-primary hover:bg-primary hover:text-white">
                      <Edit className="w-4 h-4 me-2" /> {t('provider.edit_service')}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* تبويب: إضافة خدمة جديدة */}
          <TabsContent value="add">
            <Card className="rounded-[2.5rem] border-2 shadow-sm">
              <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-5">
                    <div className="space-y-2"><Label className="font-black text-sm">{t('provider.service_title_label')} *</Label><Input placeholder={t('provider.service_title_placeholder')} value={title} onChange={e => setTitle(e.target.value)} className="rounded-2xl h-14 bg-muted/20 border-2" /></div>
                    <div className="space-y-2">
                      <Label className="font-black text-sm">{t('provider.category_label')} *</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="rounded-2xl h-14 bg-muted/20 border-2"><SelectValue placeholder={t('provider.category_placeholder')} /></SelectTrigger>
                        <SelectContent>{categories.filter(c=>c.id!=='all').map(c=><SelectItem key={c.id} value={c.id} className="font-bold">{c.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label className="font-black text-sm">{t('provider.description_label')} *</Label><Textarea placeholder={t('provider.description_placeholder')} value={description} onChange={e => setDescription(e.target.value)} className="rounded-2xl min-h-[140px] bg-muted/20 border-2 resize-none p-4" /></div>
                  </div>
                  <div className="space-y-5">
                    <div className="bg-primary/5 p-6 rounded-[2rem] space-y-5 border border-primary/10">
                      <div className="space-y-2"><Label className="font-black text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> {t('provider.neighborhood_label')} *</Label><Input placeholder={t('provider.neighborhood_placeholder')} value={neighborhood} onChange={e => setNeighborhood(e.target.value)} className="rounded-2xl h-14 bg-white" /></div>
                      <div className="space-y-2"><Label className="font-black text-sm">{t('provider.map_link_label')} *</Label><Input type="url" placeholder={t('provider.map_link_placeholder')} value={mapsLink} onChange={e => setMapsLink(e.target.value)} className="rounded-2xl h-14 bg-white" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className={`p-6 border-2 border-dashed rounded-[2rem] text-center cursor-pointer transition-all ${serviceImage ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'}`} onClick={() => imageInputRef.current?.click()}>
                        <Image className={`mx-auto mb-3 w-8 h-8 ${serviceImage ? 'text-primary' : 'text-muted-foreground'}`} />
                        <p className="text-xs font-black">{serviceImage ? t('provider.image_attached') : t('provider.attach_service_image')}</p>
                        <input ref={imageInputRef} type="file" className="hidden" onChange={e => setServiceImage(e.target.files?.[0] || null)} />
                      </div>
                      <div className={`p-6 border-2 border-dashed rounded-[2rem] text-center cursor-pointer transition-all ${licenseFile ? 'bg-amber-50 border-amber-500' : 'hover:bg-muted/50'}`} onClick={() => licenseInputRef.current?.click()}>
                        <FileText className={`mx-auto mb-3 w-8 h-8 ${licenseFile ? 'text-amber-600' : 'text-muted-foreground'}`} />
                        <p className="text-xs font-black">{licenseFile ? t('provider.license_attached') : t('provider.attach_license')}</p>
                        <input ref={licenseInputRef} type="file" className="hidden" onChange={e => setLicenseFile(e.target.files?.[0] || null)} />
                      </div>
                    </div>
                  </div>
                </div>
                <Button onClick={handleSubmitService} disabled={addingService || !isFormValid} className="w-full h-16 rounded-[1.5rem] text-xl font-black shadow-xl shadow-primary/20">
                  {addingService ? t('provider.service_publishing') : t('provider.submit_service')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* النوافذ المنبثقة للدعم الفني ومحادثة العملاء */}
      <SupportTicketDialog open={supportOpen} onOpenChange={supportOpen => setSupportOpen(supportOpen)} />
      
      {chatBooking && (
        <ChatDialog open={!!chatBooking} onOpenChange={open => !open && setChatBooking(null)} bookingId={chatBooking.id} otherName={chatBooking.client?.full_name || t('roles.client')} />
      )}
    </div>
  );
};

export default ProviderDashboard;