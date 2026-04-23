import { useEffect, useState } from "react";
import { Bell, Trash2, CheckCheck, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const NotificationsBell = () => {
  const { user } = useAuth();
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
        event: "INSERT", 
        schema: "public", 
        table: "notifications", 
        filter: `recipient_id=eq.${user.id}` 
      }, () => fetchNotifications())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("recipient_id", user.id)
      .eq("is_read", false);
    
    if (!error) {
      toast.success("تم تحديد الكل كمقروء");
      fetchNotifications();
    }
  };

  // وظيفة جديدة: مسح الإشعارات المقروءة فقط
  const deleteReadNotifications = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("recipient_id", user.id)
      .eq("is_read", true);

    if (!error) {
      toast.success("تم حذف الإشعارات المقروءة");
      fetchNotifications();
    }
  };

  // وظيفة جديدة: مسح جميع الإشعارات (إفراغ الصندوق)
  const clearAll = async () => {
    if (!user) return;
    if (!confirm("هل أنت متأكد من حذف جميع الإشعارات؟")) return;
    
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("recipient_id", user.id);

    if (!error) {
      toast.success("تم إفراغ صندوق الإشعارات");
      fetchNotifications();
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-primary/10 rounded-full transition-colors">
          <Bell className="w-5 h-5 text-foreground/80" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -end-0.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-black flex items-center justify-center border-2 border-background animate-pulse">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 rounded-3xl border-2 shadow-2xl overflow-hidden" align="end">
        <div className="bg-primary/5 p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <h4 className="font-black text-sm">مركز الإشعارات</h4>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-[10px] font-bold text-primary flex items-center gap-1 hover:underline">
              <CheckCheck className="w-3 h-3" /> تحديد المقروء
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground opacity-40">
              <BellOff className="w-10 h-10 mb-2" />
              <p className="text-xs font-bold">لا توجد إشعارات حالياً</p>
            </div>
          ) : (
            <>
              <div className="p-2 bg-muted/20 flex gap-2 border-b">
                 <Button variant="ghost" className="h-7 text-[9px] font-black flex-1 rounded-lg hover:bg-destructive/10 hover:text-destructive" onClick={deleteReadNotifications}>
                   <Trash2 className="w-3 h-3 me-1" /> حذف المقروء
                 </Button>
                 <Button variant="ghost" className="h-7 text-[9px] font-black flex-1 rounded-lg hover:bg-destructive/10 hover:text-destructive" onClick={clearAll}>
                   <Trash2 className="w-3 h-3 me-1" /> مسح الكل
                 </Button>
              </div>
              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={`p-4 border-b last:border-0 transition-colors ${!n.is_read ? "bg-primary/5 border-r-4 border-r-primary" : "bg-card"}`}
                >
                  <p className={`text-xs leading-relaxed ${!n.is_read ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                    {n.content}
                  </p>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-[9px] text-muted-foreground font-medium">
                      {new Date(n.created_at).toLocaleDateString("ar-SA", { day: 'numeric', month: 'long' })}
                    </p>
                    {!n.is_read && <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
        
        {notifications.length > 0 && (
          <div className="p-2 bg-muted/10 text-center">
            <p className="text-[8px] text-muted-foreground uppercase font-black tracking-widest">بوابة حائل — نظام التنبيهات الفوري</p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsBell;