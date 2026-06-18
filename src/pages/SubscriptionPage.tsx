import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, CreditCard, Gift } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useNavigate } from "react-router-dom";


const SubscriptionPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate(); 


  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  
  const fetchSubscription = useCallback(async (mounted = true) => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("subscriptions" as any) 
        .select("*")
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false }); 
      
      if (!error && mounted && data && data.length > 0) {
        const activeSub = data.find((s: any) => s.status === 'active');
        setSubscription(activeSub || data[0]);
      } else if (mounted) {
        setSubscription(null);
      }
    } catch (err) {
      console.error("Error fetching subscription:", err);
    } finally {
      if (mounted) setLoading(false);
    }
  }, [user?.id]);

 
  useEffect(() => {
    let mounted = true;
    
    if (user?.id) {
      fetchSubscription(mounted);
    } else {
      setLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [user?.id, fetchSubscription]);

  
  const handleSubscribe = async () => {
    if (!user?.id) return;
    setSubmitting(true); 
    
    try {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const { error } = await supabase
        .from("subscriptions" as any) 
        .upsert({
          provider_id: user.id,
          status: 'active',
          amount: 100,
          expires_at: futureDate.toISOString(),
        } as any);

      if (error) throw error;
      
      toast.success(t('payment.success') || 'تم الدفع بنجاح! تم تفعيل الاشتراك.');
      await fetchSubscription(true);

      
      setTimeout(() => {
        navigate('/provider?payment_success=true', { replace: true });
      }, 1000);

    } catch (err: any) {
      console.error("Subscription error:", err);
      toast.error(t('payment.failed') || 'فشل الدفع. يرجى المحاولة مجدداً.');
    } finally {
      setSubmitting(false); 
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <Navbar />
        <div className="p-20 text-center font-bold text-muted-foreground animate-pulse">
          {t('subscription.loading') || 'جاري التحميل...'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      
      <div className="container py-10 max-w-2xl text-right">
        <h1 className="text-3xl font-black mb-8 text-center text-primary tracking-tighter">
          {t('payment.title') || t('subscription.title') || 'دفع الاشتراك'}
        </h1>
        
        <Card className="border-2 border-primary/20 shadow-xl overflow-hidden rounded-4xl bg-card">
          
          <div className="bg-primary p-4 text-primary-foreground text-center shadow-sm">
            <p className="text-xs font-black uppercase tracking-wider">
              {t('subscription.professional_plan') || 'الخطة الاحترافية السنوية'}
            </p>
          </div>
          
          <CardHeader className="text-center pb-2 mt-4">
            <CardTitle className="text-4xl font-black text-primary pt-2">
              100 ريال <span className="text-lg text-muted-foreground font-normal">/ {t('common.year') || 'سنة'}</span>
            </CardTitle>
            <p className="text-sm font-bold text-muted-foreground mt-2">
              {t('subscription.trial_offer') || 'تمتع بكافة مزايا المنصة لمقدمي الخدمات'}
            </p>
          </CardHeader>
          
          <CardContent className="space-y-4 py-8 font-semibold text-sm text-foreground/95 px-8">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 p-1.5 rounded-full"><Check className="text-emerald-600 w-4 h-4 shrink-0" /></div>
              <span>{t('subscription.benefits.unlimited_services') || 'استقبال وإدارة طلبات غير محدودة'}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 p-1.5 rounded-full"><Check className="text-emerald-600 w-4 h-4 shrink-0" /></div>
              <span>{t('subscription.benefits.verified_badge') || 'الحصول على علامة مزود موثق'}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 p-1.5 rounded-full"><Check className="text-emerald-600 w-4 h-4 shrink-0" /></div>
              <span>{t('subscription.benefits.direct_chat') || 'محادثة مباشرة ومفتوحة مع العملاء'}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 p-1.5 rounded-full"><Gift className="text-emerald-600 w-4 h-4 shrink-0" /></div>
              <span>{t('subscription.benefits.free_trial') || 'دعم فني ذو أولوية'}</span>
            </div>
          </CardContent>

          <CardFooter className="p-6 bg-muted/30 border-t">
            <Button 
              className="w-full h-14 text-md font-black rounded-2xl shadow-lg shadow-primary/10 hover:scale-[1.01] transition-all" 
              onClick={handleSubscribe}
              disabled={subscription?.status === 'active' || submitting}
            >
              <CreditCard className="me-2 w-5 h-5 rtl:-scale-x-100" />
              {subscription?.status === 'active' 
                ? t('subscription.active_subscription') || 'الاشتراك فعال'
                : submitting 
                  ? t('common.processing') || 'جاري معالجة الدفع...' 
                  : t('payment.confirm_access') || 'تأكيد الدفع والتفعيل'}
            </Button>
          </CardFooter>
        </Card>

        {/* status badge*/}
        {subscription && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs font-bold text-muted-foreground bg-white shadow-sm p-4 rounded-2xl border animate-in fade-in duration-300">
            <span className="flex items-center gap-2">الحالة: 
              {/*dinamic badge*/}
              <Badge variant="outline" className={subscription.status === 'active' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}>
                {subscription.status === 'trial' ? t('subscription.status_trial') || 'تجريبي' : subscription.status === 'active' ? 'نشط' : 'منتهي'}
              </Badge>
            </span>
            <span className="hidden sm:inline text-muted-foreground/30">|</span>
            <span className="flex items-center gap-2">
              ينتهي في: <span className="text-primary">{new Date(subscription.expires_at || subscription.trial_ends_at).toLocaleDateString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionPage;
