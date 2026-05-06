import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2, XCircle, Clock, MessageSquare, Plus, Package, Inbox, Upload,
  Image, FileText, Edit, Phone, MessageCircle, CheckCheck, TrendingUp, BarChart3, Download, Star, MapPin, Wallet, AlertTriangle, ArrowLeft, LifeBuoy, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import ChatDialog from "@/components/ChatDialog";
import SupportTicketDialog from "@/components/SupportTicketDialog";
import { toast } from "sonner";
import { categories } from "@/data/categories";
import type { Service } from "@/types/service";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#10b981", "#f59e0b", "#3b82f6", "#ef4444"];

const ProviderDashboard = () => {
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [providerStats, setProviderStats] = useState({
    total: 0, accepted: 0, pending: 0, completed: 0, declined: 0, avgRating: 0
  });
  
  const [recentReviews, setRecentReviews] = useState<{rating: number, comment: string, serviceTitle: string}[]>([]);

  const [chatBooking, setChatBooking] = useState<any>(null);
  const [supportOpen, setSupportOpen] = useState(false);

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

  // ✅ ref يمنع إعادة جلب البيانات عند تغيير مرجع الـ user object
  const fetchedForUserId = useRef<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || role !== "provider") { navigate("/"); return; }

    // ✅ لا تجلب البيانات إذا سبق جلبها لنفس المستخدم
    if (fetchedForUserId.current === user.id) return;

    fetchedForUserId.current = user.id;
    fetchData();
  }, [user?.id, role, authLoading]); // ✅ user.id بدل user كاملاً

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [
        { data: svc }, 
        { data: bk }, 
        { data: reviewData }, 
        { data: sub }
      ] = await Promise.all([
        supabase.from("services").select("*").eq("provider_id", user.id).order("created_at", { ascending: false }),
        supabase.from("bookings").select("*, client:profiles!bookings_client_id_fkey(full_name, phone)").eq("provider_id", user.id).order("created_at", { ascending: false }),
        supabase.from("reviews").select("rating, comment, service_id").order("created_at", { ascending: false }),
        supabase.from("subscriptions" as any).select("*").eq("provider_id", user.id).maybeSingle(),
      ]);

      setServices((svc as any) || []);
      const allBks = bk || [];
      setBookings(allBks);
      setSubscription(sub || null);

      const myReviews = (reviewData || []).filter((r: any) => (svc || []).map(s => s.id).includes(r.service_id));
      const avg = myReviews.length > 0 ? myReviews.reduce((s: number, r: any) => s + r.rating, 0) / myReviews.length : 0;
      
      const commentsWithTitles = myReviews
        .filter((r: any) => r.comment && r.comment.trim() !== '')
        .map((r: any) => ({
          rating: r.rating,
          comment: r.comment,
          serviceTitle: (svc as any)?.find((s: any) => s.id === r.service_id)?.title || "خدمة"
        }));
      setRecentReviews(commentsWithTitles);

      setProviderStats({
        total: allBks.length,
        accepted: allBks.filter((b: any) => b.provider_status === "accepted").length,
        pending: allBks.filter((b: any) => b.provider_status === "pending").length,
        completed: allBks.filter((b: any) => b.status === "completed").length,
        declined: allBks.filter((b: any) => b.provider_status === "declined").length,
        avgRating: Math.round(avg * 10) / 10
      });
    } catch (err: any) {
      toast.error("حدث خطأ أثناء جلب البيانات");
    } finally {
      setLoading(false);
    }
  };

  // ✅ fetchData اليدوي (زر التحديث) يسمح بإعادة الجلب
  const handleManualRefresh = () => {
    fetchedForUserId.current = null;
    fetchData();
  };

  const isFormValid = title && category && description && neighborhood && mapsLink && serviceImage && licenseFile;

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
      toast.success("تم نشر الخدمة بنجاح وهي تحت المراجعة");
      handleManualRefresh();
      setTitle(""); setCategory(""); setDescription(""); setNeighborhood(""); setMapsLink(""); setServiceImage(null); setLicenseFile(null);
    } catch (err: any) { toast.error(err.message); }
    finally { setAddingService(false); }
  };

  const isSubscribed = subscription && subscription.status === 'active';
  
  const calculateTrialDays = () => {
    const creationDate = user?.created_at;
    if (!creationDate) return 30; 
    const createdTime = new Date(creationDate).getTime();
    const currentTime = Date.now();
    const daysPassed = Math.floor((currentTime - createdTime) / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - daysPassed);
  };

  const trialDaysLeft = calculateTrialDays();
  const chartData = [
    { name: 'مكتملة', value: providerStats.completed },
    { name: 'معلقة', value: providerStats.pending },
    { name: 'مرفوضة', value: providerStats.declined },
  ];

  if (loading) return <div className="p-20 text-center font-bold">جاري تحميل لوحة التحكم...</div>;

  return (
    <div className="min-h-screen bg-background pb-10 text-right" dir="rtl">
      <Navbar />
      <div className="container py-8 max-w-6xl space-y-8">
        
        {!isSubscribed && (
          <Card className={`rounded-[2rem] border-2 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm transition-all ${trialDaysLeft > 0 ? 'border-primary/20 bg-primary/5' : 'border-destructive/30 bg-destructive/5'}`}>
             <div className="space-y-2 text-center md:text-right">
                <h3 className={`text-xl font-black flex items-center gap-2 justify-center md:justify-start ${trialDaysLeft > 0 ? 'text-primary' : 'text-destructive'}`}>
                  {trialDaysLeft > 0 ? (
                    <><Clock className="w-6 h-6" /> الفترة التجريبية (متبقي {trialDaysLeft} يوماً)</>
                  ) : (
                    <><AlertTriangle className="w-6 h-6" /> انتهت الفترة التجريبية !</>
                  )}
                </h3>
                <p className="text-sm font-bold text-muted-foreground">
                  {trialDaysLeft > 0 
                    ? "استمتع بتجربة المنصة بكل مميزاتها. يمكنك تفعيل اشتراكك السنوي في أي وقت لضمان استمرار خدماتك."
                    : "لقد انتهت فترة الـ 30 يوم المجانية. يرجى تفعيل اشتراكك لتتمكن من الاستمرار في استقبال الطلبات وإدارتها."}
                </p>
             </div>
             <Button onClick={() => navigate("/payment")} className={`rounded-2xl h-14 px-8 font-black shadow-lg hover:scale-105 transition-transform text-lg w-full md:w-auto ${trialDaysLeft === 0 ? 'bg-destructive hover:bg-destructive/90 text-white' : ''}`}>
                تفعيل الاشتراك (100 ⃁)
             </Button>
          </Card>
        )}

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-2">
          <h1 className="text-4xl font-black text-primary tracking-tighter">لوحة الأعمال</h1>
          <div className="flex gap-2">
            <Button onClick={() => setSupportOpen(true)} variant="secondary" className="rounded-2xl gap-2 font-bold h-12">
              <LifeBuoy className="w-5 h-5" /> الدعم الفني
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="grid grid-cols-2 gap-4 lg:col-span-2">
            <Card className="rounded-3xl border-2"><CardContent className="p-6 text-center h-full flex flex-col justify-center">
              <p className="text-[10px] text-muted-foreground uppercase font-black mb-1">إجمالي الطلبات</p>
              <h3 className="text-3xl font-black">{providerStats.total}</h3>
            </CardContent></Card>
            <Card className="rounded-3xl border-2 border-amber-100 bg-amber-50/20"><CardContent className="p-6 text-center h-full flex flex-col justify-center">
              <p className="text-[10px] text-amber-600 uppercase font-black mb-1">قيد الانتظار</p>
              <h3 className="text-3xl font-black text-amber-600">{providerStats.pending}</h3>
            </CardContent></Card>
            <Card className="rounded-3xl border-2 border-emerald-100 bg-emerald-50/20"><CardContent className="p-6 text-center h-full flex flex-col justify-center">
              <p className="text-[10px] text-emerald-600 uppercase font-black mb-1">مكتملة</p>
              <h3 className="text-3xl font-black text-emerald-600">{providerStats.completed}</h3>
            </CardContent></Card>
            <Card className="rounded-3xl border-2"><CardContent className="p-6 text-center h-full flex flex-col justify-center">
              <p className="text-[10px] text-muted-foreground uppercase font-black mb-1">التقييم العام</p>
              <h3 className="text-3xl font-black text-primary">{providerStats.avgRating} <Star className="inline w-5 h-5 mb-1 fill-primary" /></h3>
            </CardContent></Card>
          </div>

          <Card className="rounded-3xl border-2 bg-primary/5 border-primary/10 flex flex-col overflow-hidden max-h-[260px] lg:max-h-full">
            <div className="bg-primary text-primary-foreground px-4 py-3 font-black flex items-center gap-2 shadow-sm z-10 shrink-0">
              <Star className="w-5 h-5 fill-current" /> أبرز التعليقات
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
                  <p className="text-xs font-black">لا توجد تعليقات حالياً</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <Tabs defaultValue="requests" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-16 rounded-[1.5rem] bg-muted/50 p-1.5 mb-8 shadow-inner">
            <TabsTrigger value="requests" className="rounded-xl font-black">الطلبات</TabsTrigger>
            <TabsTrigger value="services" className="rounded-xl font-black">الخدمات</TabsTrigger>
            <TabsTrigger value="add" className="rounded-xl font-black">إضافة خدمة</TabsTrigger>
            <TabsTrigger value="reports" className="rounded-xl font-black text-primary"><BarChart3 className="w-4 h-4 me-1" /> التقارير</TabsTrigger>
          </TabsList>

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
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> وقت الطلب:</span>
                        <span dir="ltr">{new Date(b.created_at).toLocaleString('ar-SA', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
                      </div>
                    </div>

                    <p className="text-sm bg-muted/30 p-4 rounded-2xl italic leading-relaxed">"{b.problem_description}"</p>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant="secondary" className="px-3 py-1 font-bold">العميل: {b.client?.full_name}</Badge>
                      <Badge variant="outline" className="px-3 py-1 font-bold font-mono">{b.client?.phone}</Badge>
                      <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-xl border border-primary/20 shadow-sm">
                        <Calendar className="w-4 h-4" />
                        <span className="text-xs font-black">الموعد المطلوب: {b.scheduled_date || "قريباً"} | {b.scheduled_time || "--:--"}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 min-w-[160px] justify-center border-t md:border-t-0 md:border-r pt-4 md:pt-0 md:pr-6 border-dashed">
                    {b.provider_status === 'pending' ? (
                      <>
                        <Button onClick={async () => {
                          const { error } = await supabase.from('bookings').update({provider_status:'accepted'}).eq('id', b.id);
                          if (!error) {
                            // إشعار للعميل بقبول الطلب
                            await supabase.from("notifications").insert({
                              recipient_id: b.client_id,
                              sender_id: user?.id,
                              booking_id: b.id,
                              content: `تم قبول طلبك لخدمة: ${b.service_title}`,
                            });
                            handleManualRefresh();
                          }
                        }} className="rounded-2xl h-12 font-black bg-blue-500 hover:bg-blue-600">قبول الطلب</Button>
                        <Button onClick={async () => {
                          const { error } = await supabase.from('bookings').update({provider_status:'declined'}).eq('id', b.id);
                          if (!error) {
                            // إشعار للعميل برفض الطلب
                            await supabase.from("notifications").insert({
                              recipient_id: b.client_id,
                              sender_id: user?.id,
                              booking_id: b.id,
                              content: `تم رفض طلبك لخدمة: ${b.service_title}`,
                            });
                            handleManualRefresh();
                          }
                        }} variant="outline" className="rounded-2xl h-12 font-black text-destructive border-destructive hover:bg-destructive/10">رفض الطلب</Button>
                      </>
                    ) : b.provider_status === 'declined' ? (
                       <Badge className="bg-destructive/10 text-destructive py-3 justify-center border-none font-black rounded-2xl text-sm">تم الرفض</Badge>
                    ) : b.status !== 'completed' ? (
                      <Button onClick={async () => {
                        const { error } = await supabase.from('bookings').update({status:'completed'}).eq('id', b.id);
                        if (!error) {
                          // إشعار للعميل بإكمال الخدمة
                          await supabase.from("notifications").insert({
                            recipient_id: b.client_id,
                            sender_id: user?.id,
                            booking_id: b.id,
                            content: `تم إكمال خدمة: ${b.service_title} بنجاح`,
                          });
                          handleManualRefresh();
                        }
                      }} className="rounded-2xl h-12 bg-emerald-500 hover:bg-emerald-600 font-black shadow-lg shadow-emerald-500/20">إكمال الخدمة</Button>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-700 py-3 justify-center border-none font-black rounded-2xl text-sm">مكتمل بنجاح</Badge>
                    )}
                    
                    {b.status !== 'completed' && b.provider_status !== 'declined' && (
                      <Button variant="ghost" onClick={() => setChatBooking(b)} className="rounded-2xl h-12 font-bold mt-2 bg-muted/50 hover:bg-primary/10 hover:text-primary">
                        <MessageCircle className="w-5 h-5 me-2" /> تواصل مع العميل
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
            {bookings.length === 0 && <div className="text-center py-20 opacity-30 font-black text-xl">لا توجد طلبات حالياً</div>}
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <Card className="rounded-[2rem] border-2 p-6">
                    <h3 className="font-black text-lg mb-6 text-center">توزيع حالات الطلبات</h3>
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
                    <h3 className="font-black text-lg mb-6 text-center">إحصائيات الأداء</h3>
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

          <TabsContent value="services" className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map(s => (
              <Card key={s.id} className="rounded-[2rem] overflow-hidden border-2 flex flex-col group bg-card">
                <img src={s.image_url || ''} className="h-48 object-cover group-hover:scale-105 transition-transform" />
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-black text-xl line-clamp-1">{s.title}</h3>
                    <Badge className={`font-bold ${s.admin_status === 'approved' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                      {s.admin_status === 'approved' ? 'موثق' : 'بانتظار المراجعة'}
                    </Badge>
                  </div>
                  <div className="mt-auto pt-4 border-t border-dashed">
                    <Button onClick={() => navigate(`/provider/service/${s.id}`)} variant="outline" className="w-full rounded-2xl h-12 font-black border-primary text-primary hover:bg-primary hover:text-white">
                      <Edit className="w-4 h-4 me-2" /> تعديل بيانات الخدمة
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="add">
            <Card className="rounded-[2.5rem] border-2 shadow-sm">
              <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-5">
                    <div className="space-y-2"><Label className="font-black text-sm">عنوان الخدمة *</Label><Input placeholder="مثال: كهربائي منازل" value={title} onChange={e => setTitle(e.target.value)} className="rounded-2xl h-14 bg-muted/20 border-2" /></div>
                    <div className="space-y-2">
                      <Label className="font-black text-sm">التصنيف *</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="rounded-2xl h-14 bg-muted/20 border-2"><SelectValue placeholder="اختر نوع الخدمة" /></SelectTrigger>
                        <SelectContent>{categories.filter(c=>c.id!=='all').map(c=><SelectItem key={c.id} value={c.id} className="font-bold">{c.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label className="font-black text-sm">وصف تفصيلي للخدمة *</Label><Textarea placeholder="اشرح ما تقدمه بالتفصيل للعملاء..." value={description} onChange={e => setDescription(e.target.value)} className="rounded-2xl min-h-[140px] bg-muted/20 border-2 resize-none p-4" /></div>
                  </div>
                  <div className="space-y-5">
                    <div className="bg-primary/5 p-6 rounded-[2rem] space-y-5 border border-primary/10">
                      <div className="space-y-2"><Label className="font-black text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> الحي في حائل *</Label><Input placeholder="مثال: حي النقرة" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} className="rounded-2xl h-14 bg-white" /></div>
                      <div className="space-y-2"><Label className="font-black text-sm">رابط الموقع (خرائط قوقل) *</Label><Input type="url" placeholder="انسخ رابط الموقع هنا" value={mapsLink} onChange={e => setMapsLink(e.target.value)} className="rounded-2xl h-14 bg-white" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className={`p-6 border-2 border-dashed rounded-[2rem] text-center cursor-pointer transition-all ${serviceImage ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'}`} onClick={() => imageInputRef.current?.click()}>
                        <Image className={`mx-auto mb-3 w-8 h-8 ${serviceImage ? 'text-primary' : 'text-muted-foreground'}`} />
                        <p className="text-xs font-black">{serviceImage ? "تم إرفاق الصورة ✓" : "إرفاق صورة للخدمة *"}</p>
                        <input ref={imageInputRef} type="file" className="hidden" onChange={e => setServiceImage(e.target.files?.[0] || null)} />
                      </div>
                      <div className={`p-6 border-2 border-dashed rounded-[2rem] text-center cursor-pointer transition-all ${licenseFile ? 'bg-amber-50 border-amber-500' : 'hover:bg-muted/50'}`} onClick={() => licenseInputRef.current?.click()}>
                        <FileText className={`mx-auto mb-3 w-8 h-8 ${licenseFile ? 'text-amber-600' : 'text-muted-foreground'}`} />
                        <p className="text-xs font-black">{licenseFile ? "تم إرفاق الرخصة ✓" : "إرفاق رخصة المحل *"}</p>
                        <input ref={licenseInputRef} type="file" className="hidden" onChange={e => setLicenseFile(e.target.files?.[0] || null)} />
                      </div>
                    </div>
                  </div>
                </div>
                <Button onClick={handleSubmitService} disabled={addingService || !isFormValid} className="w-full h-16 rounded-[1.5rem] text-xl font-black shadow-xl shadow-primary/20">
                  {addingService ? "جاري المعالجة والرفع..." : "تأكيد ونشر الخدمة "}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <SupportTicketDialog open={supportOpen} onOpenChange={supportOpen => setSupportOpen(supportOpen)} />
      
      {chatBooking && (
        <ChatDialog open={!!chatBooking} onOpenChange={open => !open && setChatBooking(null)} bookingId={chatBooking.id} otherName={chatBooking.client?.full_name || "العميل"} />
      )}
    </div>
  );
};

export default ProviderDashboard;