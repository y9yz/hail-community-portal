import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2, XCircle, Users, Package, ClipboardList, Shield, UserCheck,
  Eye, FileText, TrendingUp, BarChart3, MessageSquareWarning, MessageSquare,
  Ban, Unlock, Download, CreditCard, EyeOff, MapPin, Clock, User, Calendar, Loader2, LifeBuoy,
  MessageCircle, Lock
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
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  
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

  const [viewingDocUrl, setViewingDocUrl] = useState<string | null>(null);
  const [isDocLoading, setIsDocLoading] = useState(false);

  // ✅ ref يمنع إعادة جلب البيانات عند تغيير مرجع الـ user object
  const fetchedForUserId = useRef<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || role !== "admin") { navigate(user ? "/permission-denied" : "/auth"); return; }

    // ✅ لا تجلب البيانات إذا سبق جلبها لنفس المستخدم
    if (fetchedForUserId.current === user.id) return;

    fetchedForUserId.current = user.id;
    fetchData();
  }, [user?.id, role, authLoading]); // ✅ user.id بدل user كاملاً

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: svc } = await supabase.from("services").select("*, provider:profiles(full_name)").order("created_at", { ascending: false });
      const { data: profs } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      
      const { data: bks } = await supabase.from("bookings" as any).select("*, client:profiles!bookings_client_id_fkey(full_name, created_at), provider:profiles!bookings_provider_id_fkey(full_name, created_at)").order("created_at", { ascending: false }) as any;
      const { data: tix } = await supabase.from("support_tickets" as any).select("*, user:profiles(full_name, phone)").order("created_at", { ascending: false }) as any;
      const { data: subs } = await supabase.from("subscriptions" as any).select("*, provider:profiles(full_name, created_at)") as any;
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
      toast.error(t('admin.fetch_error'));
    } finally {
      setLoading(false);
    }
  };

  // ✅ التحديث اليدوي يتجاوز الـ ref
  const handleManualRefresh = () => {
    fetchedForUserId.current = null;
    fetchData();
  };

  const handleViewDocument = async (path: string) => {
    if (!path) {
      toast.error(t('admin.no_document'));
      return;
    }
    setIsDocLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from('private-documents')
        .createSignedUrl(path, 60);

      if (error) throw error;
      if (data?.signedUrl) {
        setViewingDocUrl(data.signedUrl);
      }
    } catch (error: any) {
      console.error("Error fetching doc:", error);
      toast.error(t('admin.cannot_open_doc'));
    } finally {
      setIsDocLoading(false);
    }
  };

  const handleModerate = async (id: string, action: "approved" | "rejected") => {
    const { error } = await supabase.from("services").update({ admin_status: action } as any).eq("id", id);
    if (!error) {
      // إشعار للمزود بقرار المراجعة
      const { data: service } = await supabase.from("services").select("provider_id, title").eq("id", id).single();
      if (service) {
        await supabase.from("notifications").insert({
          recipient_id: service.provider_id,
          sender_id: user?.id,
          content: t('admin.notification_service_action', { action: action === 'approved' ? t('admin.approved') : t('admin.rejected'), title: service.title }),
        });
      }
      toast.success(t('admin.updated'));
      handleManualRefresh();
      setViewingService(null);
    }
  };

  const handleUpdateTicketStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from("support_tickets").update({ status: newStatus } as any).eq("id", id);
    if (!error) {
      toast.success(t('admin.ticket_status_updated'));
      handleManualRefresh();
      setViewingTicket(null);
    }
  };

  const handleToggleVerified = async (userId: string, current: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_verified: !current } as any).eq("id", userId);
    if (!error) {
      // إشعار للمستخدم بتغيير حالة التوثيق
      await supabase.from("notifications").insert({
        recipient_id: userId,
        sender_id: user?.id,
        content: t('admin.notification_verify_action', { action: !current ? t('admin.verified') : t('admin.unverified') }),
      });
      toast.success(t('admin.updated'));
      handleManualRefresh();
    }
  };

  const handleToggleBlock = async (userId: string, current: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_blocked: !current } as any).eq("id", userId);
    if (!error) { toast.success(t('admin.updated')); handleManualRefresh(); }
  };

  const downloadCSV = () => {
    if (bookings.length === 0) { toast.error(t('admin.no_data_error')); return; }
    const headers = t('admin.csv_headers') + "\n";
    const rows = bookings.map(b => `${b.order_number},${b.service_title},${b.provider?.full_name},${b.client?.full_name},${b.status}`).join("\n");
    const blob = new Blob(["\uFEFF" + headers + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = t('admin.csv_file_name'); a.click();
  };

  const rolesChartData = [
    { name: t('admin.users_chart_client'), value: usersList.filter(u => u.role === 'client').length },
    { name: t('admin.users_chart_provider'), value: usersList.filter(u => u.role === 'provider').length },
  ];

  const ordersChartData = [
    { name: t('admin.orders_chart_completed'), value: stats.completedOrders },
    { name: t('admin.orders_chart_pending'), value: stats.pendingOrders },
    { name: t('admin.orders_chart_declined'), value: stats.declinedOrders },
  ];

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-primary">{t('admin.loading_data')}</div>;

  return (
    <div className="min-h-screen bg-background text-right" dir="rtl">
      <Navbar />
      <div className="container py-6 max-w-7xl space-y-6">
        
        <div className="flex flex-col md:flex-row justify-between items-center bg-card p-8 rounded-[2rem] border shadow-sm">
          <h1 className="text-4xl font-black text-primary flex items-center gap-3">
            <Shield className="w-10 h-10" /> {t('admin.dashboard_title')}
          </h1>
          <Button onClick={handleManualRefresh} variant="outline" className="rounded-2xl gap-2 font-black mt-4 md:mt-0"><Clock className="w-5 h-5" /> {t('admin.refresh_data')}</Button>
        </div>

        <Tabs defaultValue="verify" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7 h-16 rounded-[1.5rem] bg-muted/50 p-1.5 mb-10 shadow-inner">
            <TabsTrigger value="verify" className="rounded-xl font-black">{t('admin.tab_verify')}</TabsTrigger>
            <TabsTrigger value="services" className="rounded-xl font-black">{t('admin.tab_services')}</TabsTrigger>
            <TabsTrigger value="users" className="rounded-xl font-black">{t('admin.tab_users')}</TabsTrigger>
            <TabsTrigger value="orders" className="rounded-xl font-black">{t('admin.tab_orders')}</TabsTrigger>
            <TabsTrigger value="subs" className="rounded-xl font-black">{t('admin.tab_subscriptions')}</TabsTrigger>
            <TabsTrigger value="tickets" className="rounded-xl font-black">{t('admin.tab_support')}</TabsTrigger>
            <TabsTrigger value="reports" className="rounded-xl font-black text-primary"><BarChart3 className="w-4 h-4 me-1" /> {t('admin.tab_reports')}</TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="space-y-6">
            <div className="flex justify-end">
               <Button onClick={downloadCSV} className="rounded-2xl h-12 px-8 font-black"><Download className="w-5 h-5 me-2" /> {t('admin.export_data')}</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <Card className="rounded-[2rem] border-2 p-6 shadow-sm">
                  <h3 className="font-black text-xl mb-6 flex items-center justify-center gap-2"><Users className="w-6 h-6 text-primary" /> {t('admin.users_distribution_title')}</h3>
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
                  <h3 className="font-black text-xl mb-6 flex items-center justify-center gap-2"><Package className="w-6 h-6 text-emerald-600" /> {t('admin.orders_statistics_title')}</h3>
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
                 <Shield className="w-6 h-6" /> {t('admin.provider_users_count', { count: usersList.filter(u => u.role === 'provider').length })}
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
                          {u.is_verified ? t('admin.unverify') : t('admin.verify_account')}
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
                 <User className="w-6 h-6" /> {t('admin.client_users_count', { count: usersList.filter(u => u.role === 'client').length })}
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
                          {u.is_blocked ? t('admin.unblock_client') : t('admin.block_client')}
                        </Button>
                      </div>
                    </Card>
                  ))}
               </div>
            </div>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            {bookings.map(b => {
              const linkedTicket = tickets.find(t => t.booking_id === b.id);
              return (
                <Card key={b.id} className="rounded-[2rem] p-6 border-2 hover:border-primary transition-all bg-card shadow-sm">
                  <div className="flex flex-col space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="bg-muted px-3 py-1 font-mono text-sm shrink-0">#{b.order_number}</Badge>
                        <h3 className="font-black text-xl text-primary">{b.service_title}</h3>
                      </div>
                      <Badge className={`px-4 py-1.5 rounded-full font-black border-none text-white shadow-sm ${b.status === 'completed' ? "bg-emerald-500" : "bg-blue-500"}`}>
                        {b.status === 'completed' ? t('admin.order_status_completed') : t('admin.order_status_pending')}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-2xl border border-dashed">
                       <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {t('admin.order_received_time')}</span>
                          <span className="text-sm font-bold" dir="ltr">{new Date(b.created_at).toLocaleString('ar-SA', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                       </div>
                       <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black text-primary flex items-center gap-1"><Calendar className="w-3 h-3" /> {t('admin.scheduled_execution')}</span>
                          <span className="text-sm font-black text-primary">{b.scheduled_date || t('admin.not_defined')} | {b.scheduled_time || t('admin.undefined_time')}</span>
                       </div>
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-t pt-4">
                      <div className="text-xs font-bold text-muted-foreground">
                        {t('admin.order_participants', { provider: b.provider?.full_name, client: b.client?.full_name })}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 justify-end w-full md:w-auto">
                        {linkedTicket && (
                          <Button variant="secondary" size="sm" className="rounded-xl gap-2 h-10 px-4 font-black bg-amber-100 text-amber-700 hover:bg-amber-200" onClick={() => setViewingTicket(linkedTicket)}>
                            <LifeBuoy className="w-4 h-4" /> {t('admin.view_ticket')}
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="rounded-xl gap-2 border-primary text-primary font-black h-10 px-4 hover:bg-primary/5" onClick={() => setViewingChat(b)}>
                          <MessageSquare className="w-4 h-4" /> {t('admin.monitor_chat')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="tickets" className="space-y-4">
            {tickets.map(ticket => {
              const isClosed = ticket.status === 'closed';
              return (
                <Card key={ticket.id} className={`rounded-3xl p-5 border-2 transition-all ${isClosed ? 'bg-muted/30 opacity-80 border-dashed' : 'bg-card cursor-pointer hover:border-primary/50'}`} onClick={() => !isClosed && setViewingTicket(ticket)}>
                   <div className="flex justify-between items-start">
                     <div className="space-y-1">
                       <div className="flex items-center gap-2">
                          {isClosed && <Lock className="w-4 h-4 text-muted-foreground" />}
                          <h3 className={`font-black text-lg ${isClosed ? 'text-muted-foreground' : ''}`}>{ticket.subject}</h3>
                       </div>
                       <p className="text-sm italic text-muted-foreground mt-2">"{ticket.message}"</p>
                       <p className="text-xs font-bold text-primary mt-3">{t('admin.sender_label', { sender: ticket.user?.full_name })}</p>
                     </div>
                     <div className="flex items-center gap-3">
                       <Button variant="outline" size="sm" className="rounded-xl font-bold border-primary/20 hover:bg-primary/5 h-10 px-4 gap-2 hidden md:flex"
                         onClick={(e) => { e.stopPropagation(); navigate("/support", { state: { ticketId: ticket.id, readOnly: isClosed } }); }}>
                         {isClosed ? <Eye className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                         {isClosed ? t('admin.view') : t('admin.reply')}
                       </Button>
                       <Badge className={`px-4 py-1.5 rounded-full font-black border-none text-white shadow-sm ${ticket.status === 'open' ? 'bg-amber-500' : ticket.status === 'in_progress' ? 'bg-blue-500' : 'bg-emerald-500'}`}>
                         {ticket.status === 'open' ? t('admin.ticket_status_waiting') : ticket.status === 'in_progress' ? t('admin.ticket_status_processing') : t('admin.ticket_status_closed')}
                       </Badge>
                     </div>
                   </div>
                </Card>
              );
            })}
            {tickets.length === 0 && <div className="text-center py-20 opacity-30 font-black">{t('admin.no_tickets')}</div>}
          </TabsContent>

          <TabsContent value="services" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allServices.filter(s => s.admin_status !== 'pending_admin').map(s => (
                <Card key={s.id} className={`rounded-3xl border-2 transition-all ${s.admin_status === 'rejected' ? 'opacity-60 grayscale bg-muted/20' : 'border-emerald-100'}`}>
                  <div className="p-4 flex items-center gap-4">
                    <img src={s.image_url} className="w-20 h-20 rounded-2xl object-cover" />
                    <div className="flex-1">
                      <p className="font-black line-clamp-1">{s.title}</p>
                      <Badge className={`mt-2 border-none text-[9px] ${s.admin_status === 'approved' ? 'bg-emerald-500' : 'bg-destructive'}`}>
                        {s.admin_status === 'approved' ? t('admin.service_status_visible') : t('admin.service_status_hidden')}
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button size="sm" variant="outline" className="rounded-xl gap-1 border-primary text-primary" onClick={() => setViewingService(s)}>
                        <Eye className="w-4 h-4" /> {t('admin.details')}
                      </Button>
                      {s.admin_status === 'approved' ? (
                        <Button size="sm" variant="outline" className="rounded-xl gap-1 text-destructive border-destructive" onClick={() => handleModerate(s.id, 'rejected')}>
                          <EyeOff className="w-4 h-4" /> {t('admin.hide')}
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="rounded-xl gap-1 text-emerald-600 border-emerald-600" onClick={() => handleModerate(s.id, 'approved')}>
                          <Eye className="w-4 h-4" /> {t('admin.show')}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
          </TabsContent>

          <TabsContent value="verify" className="space-y-4">
              {pendingServices.map(s => (
                <Card key={s.id} className="rounded-3xl border-2 p-5 flex flex-col md:flex-row gap-6 items-center bg-amber-50/5">
                   <img src={s.image_url} className="w-32 h-32 rounded-[1.5rem] object-cover" />
                   <div className="flex-1 text-center md:text-right">
                     <h3 className="font-black text-xl">{s.title}</h3>
                     <Button onClick={() => setViewingService(s)} className="rounded-2xl h-12 px-6 font-black mt-4">{t('admin.review_and_verify')}</Button>
                   </div>
                </Card>
             ))}
          </TabsContent>

          <TabsContent value="subs" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subscriptions.map(s => {
              const now = new Date().getTime();
              const expiryDate = s.expires_at ? new Date(s.expires_at) : (s.trial_ends_at ? new Date(s.trial_ends_at) : null);
              const targetTime = expiryDate ? expiryDate.getTime() : 0;
              const daysLeft = targetTime > now ? Math.ceil((targetTime - now) / (1000 * 60 * 60 * 24)) : 0;
              const isExpired = daysLeft === 0;
              const isTrial = !s.expires_at && !isExpired;
              return (
                <Card key={s.id} className="rounded-3xl border-2 p-6 shadow-sm space-y-4 bg-white">
                   <div className="flex justify-between items-start">
                     <div>
                       <p className="font-black text-lg text-primary">{s.provider?.full_name || t('admin.unknown_provider')}</p>
                       <p className="text-xs text-muted-foreground font-bold mt-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> {t('admin.joined_on', { date: new Date(s.provider?.created_at || s.created_at).toLocaleDateString('ar-SA') })}</p>
                     </div>
                     <Badge className={`px-3 py-1 rounded-xl font-bold border-none text-white ${isExpired ? "bg-destructive" : isTrial ? "bg-orange-500" : "bg-emerald-500"}`}>
                       {isExpired ? t('admin.subscription_expired') : isTrial ? t('admin.subscription_trial') : t('admin.subscription_active')}
                     </Badge>
                   </div>
                   <div className={`p-4 rounded-2xl flex justify-between items-center border ${isTrial ? 'bg-orange-50/50 border-orange-100' : 'bg-muted/40 border-slate-100'}`}>
                     <span className="text-sm font-bold text-muted-foreground">{t('admin.days_remaining')}</span>
                     <div className="text-left">
                       <span className={`font-black text-2xl ${isExpired ? 'text-red-500' : isTrial ? 'text-orange-600' : 'text-emerald-600'}`}>{daysLeft}</span>
                       <span className="text-[10px] font-bold text-slate-400 mr-1">{t('admin.day_unit')}</span>
                     </div>
                   </div>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!viewingService} onOpenChange={() => setViewingService(null)}>
        <DialogContent className="rounded-[2.5rem] text-right max-w-2xl" dir="rtl">
            <DialogHeader><DialogTitle className="text-2xl font-black text-center">{t('admin.service_info_title', { title: viewingService?.title })}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <img src={viewingService?.image_url} className="w-full h-48 object-cover rounded-[1.5rem] border shadow-inner" />
              <div className="bg-muted/50 p-4 rounded-2xl">
                <p className="text-sm font-bold text-muted-foreground mb-1">{t('admin.service_description_label')}</p>
                <p className="text-sm italic">"{viewingService?.description}"</p>
              </div>
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                <p className="text-sm font-bold text-emerald-800">{t('admin.service_location_label', { location: viewingService?.address_name })}</p>
              </div>
              <Button className="w-full h-12 rounded-2xl gap-2 font-black bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm" onClick={() => handleViewDocument(viewingService?.license_url)} disabled={isDocLoading}>
                 {isDocLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                 {isDocLoading ? t('admin.loading_document') : t('admin.view_license_doc')}
              </Button>
              {viewingService?.admin_status === 'pending_admin' ? (
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1 bg-emerald-500 h-14 rounded-2xl font-black text-lg hover:bg-emerald-600 shadow-md" onClick={() => handleModerate(viewingService?.id, 'approved')}>{t('admin.approve_and_verify')}</Button>
                  <Button variant="destructive" className="flex-1 h-14 rounded-2xl font-black text-lg shadow-md" onClick={() => handleModerate(viewingService?.id, 'rejected')}>{t('admin.reject')}</Button>
                </div>
              ) : (
                <Button className="w-full h-14 rounded-2xl font-black text-lg" onClick={() => setViewingService(null)}>{t('admin.close_window')}</Button>
              )}
            </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingDocUrl} onOpenChange={() => setViewingDocUrl(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-[2.5rem] border-none bg-transparent shadow-none" dir="rtl">
           <div className="relative bg-white/95 backdrop-blur-xl p-6 rounded-[2.5rem] flex flex-col items-center border shadow-2xl">
              <div className="w-full flex justify-between items-center mb-6 px-4">
                 <h3 className="font-black text-primary flex items-center gap-2 text-xl"><Shield className="w-6 h-6" /> {t('admin.preview_license_title')}</h3>
                 <Button variant="ghost" className="rounded-full hover:bg-red-50 group" onClick={() => setViewingDocUrl(null)}>
                    <XCircle className="w-8 h-8 text-muted-foreground group-hover:text-red-500 transition-colors" />
                 </Button>
              </div>
              <div className="w-full bg-muted/20 rounded-2xl overflow-hidden border-2 border-dashed border-primary/10 flex justify-center items-center">
                <img src={viewingDocUrl || ""} className="w-full h-auto max-h-[70vh] object-contain shadow-sm" />
              </div>
              <div className="mt-8 w-full px-10">
                 <Button className="w-full h-14 rounded-2xl font-black text-lg shadow-lg hover:shadow-xl transition-all" onClick={() => setViewingDocUrl(null)}>{t('admin.close_preview_window')}</Button>
              </div>
           </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingTicket} onOpenChange={() => setViewingTicket(null)}>
        <DialogContent className="rounded-[2.5rem] text-right" dir="rtl">
            <DialogHeader><DialogTitle className="text-2xl font-black text-center">{t('admin.manage_ticket_title')}</DialogTitle></DialogHeader>
            <div className="space-y-6 py-4">
               <div className="bg-muted p-5 rounded-2xl border-l-4 border-l-primary shadow-inner">
                  <h4 className="font-bold text-lg mb-2">{viewingTicket?.subject}</h4>
                  <p className="text-sm italic leading-relaxed">"{viewingTicket?.message}"</p>
               </div>
               <div className="space-y-3">
                  <Label className="font-bold text-muted-foreground">{t('admin.update_ticket_status_label')}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="rounded-2xl h-14 font-black border-blue-500 text-blue-600 hover:bg-blue-50" onClick={() => handleUpdateTicketStatus(viewingTicket?.id, 'in_progress')}>
                      <Clock className="w-4 h-4 me-2" /> {t('admin.ticket_action_in_progress')}
                    </Button>
                    <Button className="rounded-2xl h-14 font-black bg-emerald-500 hover:bg-emerald-600" onClick={() => handleUpdateTicketStatus(viewingTicket?.id, 'closed')}>
                      <CheckCircle2 className="w-4 h-4 me-2" /> {t('admin.ticket_action_resolved')}
                    </Button>
                  </div>
               </div>
            </div>
        </DialogContent>
      </Dialog>

      {viewingChat && (
        <ChatDialog open={!!viewingChat} onOpenChange={(open) => !open && setViewingChat(null)} bookingId={viewingChat.id} otherName={`${viewingChat.client?.full_name} ↔ ${viewingChat.provider?.full_name}`} readOnly={true} />
      )}
    </div>
  );
};

export default AdminDashboard;