import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { 
  Bell, Trash2, CheckCheck, BellOff, MessageCircle, 
  LifeBuoy, CheckCircle2, AlertCircle, Calendar, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const NotificationsBell = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifications(data || []);
    setUnreadCount((data || []).filter((n: any) => !n.is_read).length);
  };

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const channel = supabase
      .channel("notifications")
      .on("postgres_changes", { 
        event: "*", // استماع لجميع التغييرات (إضافة، تعديل، حذف)
        schema: "public", 
        table: "notifications", 
        filter: `recipient_id=eq.${user.id}` 
      }, () => fetchNotifications())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // دالة ذكية لتحديد الأيقونة واللون بناءً على نوع الإشعار
  const getNotifDetails = (content: string) => {
    const text = content.toLowerCase();
    if (text.includes("رسالة") || text.includes("محادثة")) 
      return { icon: <MessageCircle className="w-4 h-4 text-blue-500" />, bg: "bg-blue-50" };
    if (text.includes("تذكرة") || text.includes("بلاغ") || text.includes("الدعم")) 
      return { icon: <LifeBuoy className="w-4 h-4 text-amber-500" />, bg: "bg-amber-50" };
    if (text.includes("طلب") || text.includes("حجز")) 
      return { icon: <Calendar className="w-4 h-4 text-emerald-500" />, bg: "bg-emerald-50" };
    if (text.includes("توثيق") || text.includes("قبول") || text.includes("إكمال")) 
      return { icon: <CheckCircle2 className="w-4 h-4 text-primary" />, bg: "bg-primary/10" };
    if (text.includes("رفض"))
      return { icon: <AlertCircle className="w-4 h-4 text-destructive" />, bg: "bg-destructive/10" };
    
    return { icon: <AlertCircle className="w-4 h-4 text-muted-foreground" />, bg: "bg-muted" };
  };

  const handleNotificationClick = async (notification: any) => {
    // 1. تحديد كمقروء في القاعدة
    if (!notification.is_read) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification.id);
      fetchNotifications();
    }

    // 2. التوجيه الذكي (Navigation)
    const text = notification.content.toLowerCase();
    if (text.includes("تذكرة") || text.includes("بلاغ")) {
      navigate("/support");
    } else if (text.includes("رسالة") || text.includes("محادثة") || text.includes("طلب")) {
      // إذا كان مزود خدمة يروح لوحة الأعمال، إذا عميل يروح طلباتي
      const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user?.id).single();
      navigate(roleData?.role === 'provider' ? "/provider" : "/my-bookings");
    }
  };

  const markAllRead = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("recipient_id", user.id)
      .eq("is_read", false);
    
    if (!error) {
      toast.success(t('notifications.mark_all_read_success'));
      fetchNotifications();
    }
  };

  const clearAll = async () => {
    if (!user) return;
    if (!confirm(t('notifications.clear_confirm'))) return;
    const { error } = await supabase.from("notifications").delete().eq("recipient_id", user.id);
    if (!error) {
      toast.success(t('notifications.cleared'));
      fetchNotifications();
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-primary/10 rounded-full transition-all active:scale-95">
          <Bell className="w-5 h-5 text-foreground/80" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -end-0.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-black flex items-center justify-center border-2 border-background animate-bounce">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-[340px] p-0 rounded-3xl border-2 shadow-2xl overflow-hidden" align="end">
        
        {/* تم إضافة إغلاق الـ div هنا */}
        <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 fill-current" />
            <h4 className="font-black text-sm">{t('notifications.title')}</h4>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-lg hover:bg-white/30 transition-colors flex items-center gap-1">
              <CheckCheck className="w-3 h-3" /> {t('notifications.mark_all_read')}
            </button>
          )}
        </div>

        <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground opacity-30">
              <BellOff className="w-12 h-12 mb-3" />
              <p className="text-xs font-black">{t('notifications.empty')}</p>
            </div>
          ) : (
            <>
              <div className="p-2 bg-muted/30 flex justify-end border-b">
                 <Button variant="ghost" className="h-7 text-[10px] font-black text-destructive hover:bg-destructive/10 rounded-lg" onClick={clearAll}>
                   <Trash2 className="w-3 h-3 me-1" /> {t('notifications.clear_all')}
                 </Button>
              </div>
              
              {notifications.map((n) => {
                const { icon, bg } = getNotifDetails(n.content);
                return (
                  <div 
                    key={n.id} 
                    onClick={() => handleNotificationClick(n)}
                    className={`p-4 border-b last:border-0 cursor-pointer transition-all hover:bg-muted/50 flex gap-3 items-start ${!n.is_read ? "bg-primary/[0.03] border-r-4 border-r-primary" : "opacity-70"}`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${bg}`}>
                      {icon}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className={`text-xs leading-relaxed ${!n.is_read ? "font-black text-foreground" : "font-medium text-muted-foreground"}`}>
                        {n.content}
                      </p>
                      <div className="flex justify-between items-center">
                        <p className="text-[9px] text-muted-foreground font-bold flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          {new Date(n.created_at).toLocaleDateString("ar-SA", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {!n.is_read && <span className="text-[9px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded">{t('notifications.new')}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
        
        <div className="p-3 bg-muted/10 text-center border-t">
          <p className="text-[9px] text-muted-foreground font-black tracking-tight">{t('notifications.footer')} — {new Date().getFullYear()}</p>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsBell;