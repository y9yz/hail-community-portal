import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge"; // 🚀 تم إضافة الـ import المفقود لحل الخطأ الثاني
import { toast } from "sonner";
import { Check, CreditCard, Gift } from "lucide-react";
import Navbar from "@/components/Navbar";

const SubscriptionPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  /* 🚀 تم إعادة المسمى إلى provider_subscriptions ليتوافق تماماً مع الـ Types المحددة في مشروعك */
  const fetchSubscription = useCallback(async (mounted = true) => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("provider_subscriptions") 
        .select("*")
        .eq('provider_id', user.id)
        .maybeSingle(); 
      
      if (!error && mounted) {
        setSubscription(data);
      }
    } catch (err) {
      console.error("Error fetching subscription:", err);
    } finally {
      if (mounted) setLoading(false);
    }
  }, [user?.id]);

  /* تحديث البيانات عند تحميل المكون مع صمام الأمان لمنع تسريب الذاكرة */
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

  /* معالجة عملية الاشتراك وتحديث التاريخ لعام كامل بطريقة حتمية */
  const handleSubscribe = async () => {
    if (!user?.id) return;
    setSubmitting(true);
    try {
      // حساب تاريخ الانتهاء الصارم محلياً بعد سنة كاملة
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const { error } = await supabase
        .from("provider_subscriptions") 
        .upsert({
          provider_id: user.id,
          status: 'active',
          amount: 100,
          expires_at: futureDate.toISOString(),
        } as any);

      if (error) throw error;
      
      toast.success(t('subscription.activated'));
      await fetchSubscription(true);
    } catch (err: any) {
      console.error("Subscription error:", err);
      toast.error(t('subscription.failed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <Navbar />
        <div className="p-20 text-center font-bold text-muted-foreground animate-pulse">
          {t('subscription.loading')}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      
      <div className="container py-10 max-w-2xl text-right">
        <h1 className="text-3xl font-black mb-8 text-center text-primary tracking-tighter">
          {t('subscription.title')}
        </h1>
        
        <Card className="border-2 border-primary/20 shadow-xl overflow-hidden rounded-[2rem] bg-card">
          <div className="bg-primary p-4 text-primary-foreground text-center shadow-sm">
            <p className="text-xs font-black uppercase tracking-wider">
              {t('subscription.professional_plan')}
            </p>
          </div>
          
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-4xl font-black text-primary pt-2">
              100 ريال <span className="text-lg text-muted-foreground font-normal">/ {t('common.year') || 'سنة'}</span>
            </CardTitle>
            <p className="text-sm font-bold text-muted-foreground mt-1">
              {t('subscription.trial_offer')}
            </p>
          </CardHeader>
          
          <CardContent className="space-y-4 py-6 font-semibold text-sm text-foreground/95 px-8">
            <div className="flex items-center gap-3">
              <Check className="text-primary w-5 h-5 shrink-0" />
              <span>{t('subscription.benefits.unlimited_services')}</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="text-primary w-5 h-5 shrink-0" />
              <span>{t('subscription.benefits.verified_badge')}</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="text-primary w-5 h-5 shrink-0" />
              <span>{t('subscription.benefits.direct_chat')}</span>
            </div>
            <div className="flex items-center gap-3">
              <Gift className="text-primary w-5 h-5 shrink-0" />
              <span>{t('subscription.benefits.free_trial')}</span>
            </div>
          </CardContent>

          <CardFooter className="p-6 pt-0">
            <Button 
              className="w-full h-14 text-md font-black rounded-2xl shadow-lg shadow-primary/10 hover:scale-[1.01] transition-all" 
              onClick={handleSubscribe}
              disabled={subscription?.status === 'active' || submitting}
            >
              <CreditCard className="me-2 w-5 h-5 rtl:-scale-x-100" />
              {subscription?.status === 'active' 
                ? t('subscription.active_subscription') 
                : submitting 
                  ? t('common.processing') || 'جاري التفعيل...' 
                  : t('subscription.subscribe_now')}
            </Button>
          </CardFooter>
        </Card>

        {/* عرض تفاصيل تاريخ الانتهاء الصريح للمزود الفعال */}
        {subscription && (
          <div className="mt-6 text-center text-xs font-bold text-muted-foreground bg-muted/40 p-4 rounded-2xl border border-dashed animate-in fade-in duration-300">
            <span>{t('subscription.status_label')} </span>
            <Badge variant="outline" className={subscription.status === 'active' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}>
              {subscription.status === 'trial' ? t('subscription.status_trial') : t('subscription.status_active')}
            </Badge>
            <span className="mx-2">|</span>
            <span>
              {t('subscription.expires_at', { 
                date: new Date(subscription.expires_at || subscription.trial_ends_at).toLocaleDateString('ar-SA', { 
                  year: 'numeric', 
                  month: '2-digit', 
                  day: '2-digit' 
                }) 
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionPage;