import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2, XCircle, Users, Package, ClipboardList, Shield, UserCheck,
  Eye, FileText, TrendingUp, BarChart3, MessageSquareWarning, MessageSquare,
  Ban, Unlock, Download, CreditCard, EyeOff, MapPin, Clock, User, Calendar
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import ChatDialog from "@/components/ChatDialog";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();
  
  const [pendingServices, setPendingServices] = useState<any[]>([]);
  const [allServices, setAllServices] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [stats, setStats] = useState({ users: 0, pendingServices: 0, totalOrders: 0, pendingOrders: 0, completedOrders: 0, declinedOrders: 0, verifiedUsers: 0, activeSubs: 0, subRevenue: 0 });
  const [loading, setLoading] = useState(true);
  
  const [viewingService, setViewingService] = useState<any | null>(null);
  const [viewingTicket, setViewingTicket] = useState<any | null>(null);
  const [viewingChat, setViewingChat] = useState<any | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || role !== "admin") { navigate(user ? "/permission-denied" : "/auth"); return; }
    fetchData();
  }, [user, role, authLoading]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: svc } = await supabase.from("services").select("*, provider:profiles(full_name)").order("created_at", { ascending: false });
      const { data: profs } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      
      const { data: bks } = await supabase.from("bookings" as any).select("*, client:profiles!bookings_client_id_fkey(full_name), provider:profiles!bookings_provider_id_fkey(full_name)").order("created_at", { ascending: false }) as any;
      const { data: tix } = await supabase.from("support_tickets" as any).select("*, user:profiles(full_name, phone)").order("created_at", { ascending: false }) as any;
      
      // 👈 التعديل هنا لجلب اسم المزود في الاشتراكات
      const { data: subs } = await supabase.from("subscriptions" as any).select("*, provider:profiles(full_name)") as any;
      
      const { data: roles } = await supabase.from("user_roles" as any).select("*") as any;

      const allBks = (bks || []) as any[];
      const allTix = (tix || []) as any[];
      const allSubs = (subs || []) as any[];
      const allSvc = (svc || []) as any[];

      setAllServices(allSvc);
      setPendingServices(allSvc.filter(s => s.admin_status === 'pending_admin'));
      setBookings(allBks);
      setTickets(allTix);
      setSubscriptions(allSubs);

      if (profs) {
        const rolesMap: Record<string, string> = {};
        (roles || []).forEach((r: any) => { rolesMap[r.user_id] = r.role; });
        const mappedUsers = profs.map((u: any) => ({ ...u, role: rolesMap[u.id] || "client" })).filter((u: any) => u.role !== "admin");
        setUsersList(mappedUsers);
      }

      setStats({
        users: profs?.length || 0,
        pendingServices: allSvc.filter(s => s.admin_status === 'pending_admin').length,
        totalOrders: allBks.length,
        pendingOrders: allBks.filter(b => b.status === 'pending' || b.provider_status === 'pending').length,
        completedOrders: allBks.filter(b => b.status === 'completed').length,
        declinedOrders: allBks.filter(b => b.provider_status === 'declined').length,
        verifiedUsers: profs?.filter(u => u.is_verified).length || 0,
        activeSubs: allSubs.filter(s => s.status === 'active').length,
        subRevenue: (allSubs.filter(s => s.status === 'active').length) * 100,
      });
    } catch (err) {
      toast.error("حدث خطأ أثناء جلب البيانات");
    } finally {
      setLoading(false);
    }
  };

  const handleModerate = async (id: string, action: "approved" | "rejected") => {
    const { error } = await supabase.from("services").update({ admin_status: action } as any).eq("id", id);
    if (!error) {
      toast.success("تم التحديث بنجاح");
      fetchData();
      setViewingService(null);
    }
  };

  const handleUpdateTicketStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from("support_tickets").update({ status: newStatus } as any).eq("id", id);
    if (!error) {
      toast.success("تم تحديث حالة التذكرة بنجاح");
      fetchData();
      setViewingTicket(null);
    }
  };

  const handleToggleVerified = async (userId: string, current: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_verified: !current } as any).eq("id", userId);
    if (!error) { toast.success("تم التحديث"); fetchData(); }
  };

  const handleToggleBlock = async (userId: string, current: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_blocked: !current } as any).eq("id", userId);
    if (!error) { toast.success("تم التحديث"); fetchData(); }
  };

  const downloadCSV = () => {
    if (bookings.length === 0) { toast.error("لا توجد بيانات"); return; }
    const headers = "رقم الطلب,الخدمة,المزود,العميل,الحالة\n";
    const rows = bookings.map(b => `${b.order_number},${b.service_title},${b.provider?.full_name},${b.client?.full_name},${b.status}`).join("\n");
    const blob = new Blob(["\uFEFF" + headers + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "تقرير_العمليات.csv"; a.click();
  };

  const rolesChartData = [
    { name: 'العملاء المستفيدين', value: usersList.filter(u => u.role === 'client').length },
    { name: 'مزودي الخدمة', value: usersList.filter(u => u.role === 'provider').length },
  ];

  const ordersChartData = [
    { name: 'مكتملة', value: stats.completedOrders },
    { name: 'معلقة', value: stats.pendingOrders },
    { name: 'مرفوضة', value: stats.declinedOrders },
  ];

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-primary">جاري تحميل البيانات...</div>;

  return (
    <div className="min-h-screen bg-background text-right" dir="rtl">
      <Navbar />
      <div className="container py-6 max-w-7xl space-y-6">
        
        <div className="flex flex-col md:flex-row justify-between items-center bg-card p-8 rounded-[2rem] border shadow-sm">
          <h1 className="text-4xl font-black text-primary flex items-center gap-3">
            <Shield className="w-10 h-10" /> إدارة بوابة حائل
          </h1>
          <Button onClick={() => fetchData()} variant="outline" className="rounded-2xl gap-2 font-black mt-4 md:mt-0"><Clock className="w-5 h-5" /> تحديث البيانات</Button>
        </div>

        <Tabs defaultValue="verify" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7 h-16 rounded-[1.5rem] bg-muted/50 p-1.5 mb-10 shadow-inner">
            <TabsTrigger value="verify" className="rounded-xl font-black">التوثيق</TabsTrigger>
            <TabsTrigger value="services" className="rounded-xl font-black">الخدمات</TabsTrigger>
            <TabsTrigger value="users" className="rounded-xl font-black">المستخدمين</TabsTrigger>
            <TabsTrigger value="orders" className="rounded-xl font-black">الطلبات</TabsTrigger>
            <TabsTrigger value="subs" className="rounded-xl font-black">الاشتراكات</TabsTrigger>
            <TabsTrigger value="tickets" className="rounded-xl font-black">الدعم</TabsTrigger>
            <TabsTrigger value="reports" className="rounded-xl font-black text-primary"><BarChart3 className="w-4 h-4 me-1" /> التقارير</TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="space-y-6">
            <div className="flex justify-end">
               <Button onClick={downloadCSV} className="rounded-2xl h-12 px-8 font-black"><Download className="w-5 h-5 me-2" /> تصدير كل البيانات (Excel)</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <Card className="rounded-[2rem] border-2 p-6 shadow-sm">
                  <h3 className="font-black text-xl mb-6 flex items-center justify-center gap-2"><Users className="w-6 h-6 text-primary" /> توزع المستخدمين في المنصة</h3>
                  <div className="h-[300px]">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                           <Pie data={rolesChartData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={5} dataKey="value">
                              {rolesChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                           </Pie>
                           <Tooltip contentStyle={{ borderRadius: '1rem', fontWeight: 'bold' }} />
                           <Legend wrapperStyle={{ fontWeight: 'bold', fontSize: '14px' }} />
                        </PieChart>
                     </ResponsiveContainer>
                  </div>
               </Card>
               <Card className="rounded-[2rem] border-2 p-6 shadow-sm">
                  <h3 className="font-black text-xl mb-6 flex items-center justify-center gap-2"><Package className="w-6 h-6 text-emerald-600" /> إحصائيات الطلبات</h3>
                  <div className="h-[300px]">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ordersChartData}>
                           <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontWeight: 'bold', fontSize: 14 }} />
                           <YAxis axisLine={false} tickLine={false} />
                           <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '1rem', fontWeight: 'bold' }} />
                           <Bar dataKey="value" radius={[8, 8, 8, 8]}>
                              {ordersChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />)}
                           </Bar>
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-10">
            <div className="space-y-4">
               <h2 className="text-2xl font-black flex items-center gap-2 text-emerald-600">
                 <Shield className="w-6 h-6" /> مزودو الخدمة ({usersList.filter(u => u.role === 'provider').length})
               </h2>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {usersList.filter(u => u.role === 'provider').map(u => (
                    <Card key={u.id} className="rounded-2xl border-2 border-emerald-100 bg-emerald-50/10 p-5">
                       <div className="flex justify-between items-start mb-4">
                         <div className="space-y-1">
                           <p className="font-black text-lg">{u.full_name}</p>
                           <p className="text-xs font-bold text-emerald-700">{u.phone}</p>
                         </div>
                         <div className="bg-emerald-500 p-2 rounded-full text-white"><Shield className="w-4 h-4" /></div>
                       </div>
                       <div className="flex gap-2">
                        <Button size="sm" className="flex-1 rounded-xl h-9 font-bold" variant={u.is_verified ? "outline" : "default"} onClick={() => handleToggleVerified(u.id, u.is_verified)}>
                          {u.is_verified ? "إلغاء التوثيق" : "توثيق الحساب"}
                        </Button>
                        <Button size="sm" className="px-3 rounded-xl h-9" variant={u.is_blocked ? "default" : "destructive"} onClick={() => handleToggleBlock(u.id, u.is_blocked)}>
                          {u.is_blocked ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        </Button>
                      </div>
                    </Card>
                  ))}
               </div>
            </div>

            <div className="space-y-4">
               <h2 className="text-2xl font-black flex items-center gap-2 text-blue-600">
                 <User className="w-6 h-6" /> العملاء المستفيدون ({usersList.filter(u => u.role === 'client').length})
               </h2>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {usersList.filter(u => u.role === 'client').map(u => (
                    <Card key={u.id} className="rounded-2xl border-2 border-blue-100 bg-blue-50/10 p-5">
                       <div className="flex justify-between items-start mb-4">
                         <div className="space-y-1">
                           <p className="font-black text-lg">{u.full_name}</p>
                           <p className="text-xs font-bold text-blue-700">{u.phone}</p>
                         </div>
                         <div className="bg-blue-500 p-2 rounded-full text-white"><User className="w-4 h-4" /></div>
                       </div>
                       <div className="flex gap-2">
                        <Button size="sm" className="px-3 rounded-xl h-9 w-full font-bold" variant={u.is_blocked ? "default" : "destructive"} onClick={() => handleToggleBlock(u.id, u.is_blocked)}>
                          {u.is_blocked ? <Unlock className="w-4 h-4 me-2" /> : <Ban className="w-4 h-4 me-2" />}
                          {u.is_blocked ? "فك الحظر عن العميل" : "حظر العميل مؤقتاً"}
                        </Button>
                      </div>
                    </Card>
                  ))}
               </div>
            </div>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            {bookings.map(b => (
              <Card key={b.id} className="rounded-2xl p-4 border-2 hover:border-primary transition-all bg-card">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="bg-muted px-3 py-1 font-mono text-sm">#{b.order_number}</Badge>
                    <div>
                      <p className="font-black text-lg">{b.service_title}</p>
                      <p className="text-xs text-muted-foreground font-bold mt-1">المزود: {b.provider?.full_name} | العميل: {b.client?.full_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="rounded-xl gap-2 border-primary text-primary font-bold h-10 px-4"
                      onClick={() => setViewingChat(b)}
                    >
                      <MessageSquare className="w-4 h-4" /> استعراض المحادثة
                    </Button>
                    <Badge className={`px-4 py-1.5 rounded-xl font-bold border-none ${b.status === 'completed' ? "bg-emerald-500 text-white" : "bg-blue-500 text-white"}`}>
                      {b.status === 'completed' ? 'مكتمل' : 'تحت المعالجة'}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
            {bookings.length === 0 && <div className="text-center py-20 font-black opacity-30">لا توجد طلبات في النظام</div>}
          </TabsContent>

          <TabsContent value="services" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allServices.filter(s => s.admin_status !== 'pending_admin').map(s => (
                <Card key={s.id} className={`rounded-3xl border-2 transition-all ${s.admin_status === 'rejected' ? 'opacity-60 grayscale bg-muted/20' : 'border-emerald-100'}`}>
                  <div className="p-4 flex items-center gap-4">
                    <img src={s.image_url} className="w-20 h-20 rounded-2xl object-cover" />
                    <div className="flex-1">
                      <p className="font-black line-clamp-1">{s.title}</p>
                      <Badge className={`mt-2 border-none text-[9px] ${s.admin_status === 'approved' ? 'bg-emerald-500' : 'bg-destructive'}`}>
                        {s.admin_status === 'approved' ? 'معروض للجميع' : 'مخفي من العرض'}
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button size="sm" variant="outline" className="rounded-xl gap-1 border-primary text-primary" onClick={() => setViewingService(s)}>
                        <Eye className="w-4 h-4" /> التفاصيل
                      </Button>
                      {s.admin_status === 'approved' ? (
                        <Button size="sm" variant="outline" className="rounded-xl gap-1 text-destructive border-destructive" onClick={() => handleModerate(s.id, 'rejected')}>
                          <EyeOff className="w-4 h-4" /> إخفاء
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="rounded-xl gap-1 text-emerald-600 border-emerald-600" onClick={() => handleModerate(s.id, 'approved')}>
                          <Eye className="w-4 h-4" /> إظهار
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
          </TabsContent>

          <TabsContent value="tickets" className="space-y-4">
            {tickets.map(t => (
              <Card key={t.id} className="rounded-3xl p-5 border-2 bg-card cursor-pointer hover:border-primary/50 transition-all" onClick={() => setViewingTicket(t)}>
                 <div className="flex justify-between items-start">
                   <div className="space-y-1">
                     <h3 className="font-black text-lg">{t.subject}</h3>
                     <p className="text-sm italic text-muted-foreground mt-2">"{t.message}"</p>
                     <p className="text-xs font-bold text-primary mt-3">المرسل: {t.user?.full_name}</p>
                   </div>
                   <Badge className={`px-4 py-1.5 rounded-full font-black border-none text-white ${
                     t.status === 'open' ? 'bg-amber-500' : 
                     t.status === 'in_progress' ? 'bg-blue-500' : 'bg-emerald-500'
                   }`}>
                     {t.status === 'open' ? 'تنتظر الرد' : t.status === 'in_progress' ? 'قيد المعالجة' : 'مكتملة'}
                   </Badge>
                 </div>
              </Card>
            ))}
            {tickets.length === 0 && <div className="text-center py-20 opacity-30 font-black">لا يوجد بلاغات</div>}
          </TabsContent>

          <TabsContent value="verify" className="space-y-4">
             {pendingServices.map(s => (
               <Card key={s.id} className="rounded-3xl border-2 p-5 flex flex-col md:flex-row gap-6 items-center bg-amber-50/5">
                  <img src={s.image_url} className="w-32 h-32 rounded-[1.5rem] object-cover" />
                  <div className="flex-1 text-center md:text-right">
                    <h3 className="font-black text-xl">{s.title}</h3>
                    <Button onClick={() => setViewingService(s)} className="rounded-2xl h-12 px-6 font-black mt-4">مراجعة والتوثيق</Button>
                  </div>
               </Card>
            ))}
          </TabsContent>

          {/* 👈 التعديل الجديد على تبويب الاشتراكات */}
          <TabsContent value="subs" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {subscriptions.map(s => {
                const daysLeft = s.expires_at ? Math.max(0, Math.ceil((new Date(s.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
                return (
                  <Card key={s.id} className="rounded-3xl border-2 p-6 shadow-sm space-y-4">
                     <div className="flex justify-between items-start">
                       <div>
                         <p className="font-black text-lg text-primary">{s.provider?.full_name || 'مزود غير معروف'}</p>
                         <p className="text-xs text-muted-foreground font-bold mt-1 flex items-center gap-1">
                           <Calendar className="w-3 h-3" /> بدأ: {new Date(s.created_at).toLocaleDateString('ar-SA')}
                         </p>
                       </div>
                       <Badge className={s.status === 'active' && daysLeft > 0 ? "bg-emerald-500 text-white" : "bg-destructive text-white"}>
                         {s.status === 'active' && daysLeft > 0 ? "نشط" : "منتهي"}
                       </Badge>
                     </div>
                     <div className="bg-muted/40 p-3 rounded-2xl flex justify-between items-center border">
                       <span className="text-sm font-bold text-muted-foreground">الأيام المتبقية:</span>
                       <span className={`font-black text-lg ${daysLeft <= 30 ? 'text-amber-600' : 'text-emerald-600'}`}>{daysLeft} يوم</span>
                     </div>
                  </Card>
                );
             })}
             {subscriptions.length === 0 && <div className="col-span-full text-center py-20 font-black opacity-30">لا توجد اشتراكات حالياً</div>}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!viewingService} onOpenChange={() => setViewingService(null)}>
        <DialogContent className="rounded-[2.5rem] text-right max-w-2xl" dir="rtl">
           <DialogHeader><DialogTitle className="text-2xl font-black">معلومات الخدمة: {viewingService?.title}</DialogTitle></DialogHeader>
           <div className="space-y-4 py-4">
             <img src={viewingService?.image_url} className="w-full h-48 object-cover rounded-[1.5rem] border shadow-inner" />
             <div className="bg-muted/50 p-4 rounded-2xl">
               <p className="text-sm font-bold text-muted-foreground mb-1">وصف الخدمة:</p>
               <p className="text-sm italic">"{viewingService?.description}"</p>
             </div>
             <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center gap-2">
               <MapPin className="w-5 h-5 text-emerald-600" />
               <p className="text-sm font-bold text-emerald-800">الموقع: {viewingService?.address_name}</p>
             </div>
             <Button className="w-full h-12 rounded-2xl gap-2 font-bold bg-secondary text-secondary-foreground hover:bg-secondary/80" onClick={() => window.open(supabase.storage.from('private-documents').getPublicUrl(viewingService?.license_url).data.publicUrl, '_blank')}>
                <FileText className="w-4 h-4" /> فتح مستند التوثيق (الرخصة)
             </Button>

             {viewingService?.admin_status === 'pending_admin' ? (
               <div className="flex gap-2 pt-2">
                 <Button className="flex-1 bg-emerald-500 h-14 rounded-2xl font-black text-lg hover:bg-emerald-600" onClick={() => handleModerate(viewingService?.id, 'approved')}>اعتماد وتوثيق</Button>
                 <Button variant="destructive" className="flex-1 h-14 rounded-2xl font-black text-lg" onClick={() => handleModerate(viewingService?.id, 'rejected')}>رفض</Button>
               </div>
             ) : (
               <Button className="w-full h-14 rounded-2xl font-black text-lg" onClick={() => setViewingService(null)}>إغلاق النافذة</Button>
             )}
           </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingTicket} onOpenChange={() => setViewingTicket(null)}>
        <DialogContent className="rounded-[2.5rem] text-right" dir="rtl">
           <DialogHeader><DialogTitle className="text-2xl font-black">إدارة البلاغ</DialogTitle></DialogHeader>
           <div className="space-y-6 py-4">
              <div className="bg-muted p-5 rounded-2xl border-l-4 border-l-primary">
                 <h4 className="font-bold text-lg mb-2">{viewingTicket?.subject}</h4>
                 <p className="text-sm italic leading-relaxed">"{viewingTicket?.message}"</p>
              </div>
              <div className="space-y-3">
                 <Label className="font-bold text-muted-foreground">تحديث حالة البلاغ:</Label>
                 <div className="grid grid-cols-2 gap-2">
                   <Button variant="outline" className="rounded-2xl h-14 font-black border-blue-500 text-blue-600 hover:bg-blue-50" onClick={() => handleUpdateTicketStatus(viewingTicket?.id, 'in_progress')}>
                     <Clock className="w-4 h-4 me-2" /> قيد المعالجة
                   </Button>
                   <Button className="rounded-2xl h-14 font-black bg-emerald-500 hover:bg-emerald-600" onClick={() => handleUpdateTicketStatus(viewingTicket?.id, 'closed')}>
                     <CheckCircle2 className="w-4 h-4 me-2" /> مكتمل / مغلق
                   </Button>
                 </div>
              </div>
           </div>
        </DialogContent>
      </Dialog>

      {/* 👈 تمرير readOnly=true عشان ما يقدر يكتب */}
      {viewingChat && (
        <ChatDialog 
          open={!!viewingChat} 
          onOpenChange={(open) => !open && setViewingChat(null)} 
          bookingId={viewingChat.id} 
          otherName={`${viewingChat.client?.full_name} ↔ ${viewingChat.provider?.full_name}`} 
          readOnly={true} 
        />
      )}
    </div>
  );
};

export default AdminDashboard;