import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { Check, CreditCard, Gift } from "lucide-react";

const SubscriptionPage = () => {
  /* جلب بيانات المستخدم الحالي من الـ Context */
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  /* الاستعلام عن سجل الاشتراك الخاص بالمزود */
  const fetchSubscription = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("provider_subscriptions" as any)
        .select("*")
        .eq('provider_id', user.id)
        .maybeSingle(); // استخدام maybeSingle لتجنب الخطأ في حال عدم وجود سجل سابق
      
      if (!error) setSubscription(data);
    } catch (err) {
      console.error("Error fetching subscription:", err);
    } finally {
      setLoading(false);
    }
  };

  /* تحديث البيانات عند تحميل المكون أو تغيير المستخدم */
  useEffect(() => {
    fetchSubscription();
  }, [user]);

  /* معالجة عملية الاشتراك وتحديث التاريخ لعام كامل */
  const { t } = useTranslation();
  const handleSubscribe = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("provider_subscriptions" as any)
        .upsert({
          provider_id: user.id,
          status: 'active',
          amount: 100,
          /* حساب تاريخ الانتهاء بإضافة سنة واحدة من تاريخ اليوم */
          expires_at: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
        });

      if (error) throw error;
      toast.success(t('subscription.activated'));
      fetchSubscription();
    } catch (err: any) {
      toast.error(t('subscription.failed'));
    }
  };

  if (loading) return <div className="p-10 text-center">{t('subscription.loading')}</div>;

  return (
    <div className="container py-10 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8 text-center">{t('subscription.title')}</h1>
      
      <Card className="border-primary/50 shadow-xl overflow-hidden">
        <div className="bg-primary p-4 text-white text-center">
          <p className="text-sm font-medium uppercase tracking-wider">{t('subscription.professional_plan')}</p>
        </div>
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-4xl font-extrabold text-primary">
            100 ريال <span className="text-lg text-muted-foreground font-normal">/ سنة</span>
          </CardTitle>
          <p className="text-muted-foreground">{t('subscription.trial_offer')}</p>
        </CardHeader>
        
        <CardContent className="space-y-4 py-6">
          <div className="flex items-center gap-3">
            <Check className="text-primary w-5 h-5" />
            <span>{t('subscription.benefits.unlimited_services')}</span>
          </div>
          <div className="flex items-center gap-3">
            <Check className="text-primary w-5 h-5" />
            <span>{t('subscription.benefits.verified_badge')}</span>
          </div>
          <div className="flex items-center gap-3">
            <Check className="text-primary w-5 h-5" />
            <span>{t('subscription.benefits.direct_chat')}</span>
          </div>
          <div className="flex items-center gap-3">
            <Gift className="text-primary w-5 h-5" />
            <span>{t('subscription.benefits.free_trial')}</span>
          </div>
        </CardContent>

        <CardFooter>
          {/* تعطيل الزر في حال كان الاشتراك نشطاً لمنع التكرار */}
          <Button 
            className="w-full h-12 text-lg rounded-xl" 
            onClick={handleSubscribe}
            disabled={subscription?.status === 'active'}
          >
            <CreditCard className="ml-2 w-5 h-5" />
            {subscription?.status === 'active' ? t('subscription.active_subscription') : t('subscription.subscribe_now')}
          </Button>
        </CardFooter>
      </Card>

      {/* عرض تفاصيل تاريخ الانتهاء إذا وجد اشتراك */}
      {subscription && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t('subscription.status_label')} {subscription.status === 'trial' ? t('subscription.status_trial') : t('subscription.status_active')} | 
          {t('subscription.expires_at', { date: new Date(subscription.expires_at || subscription.trial_ends_at).toLocaleDateString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit' }) })}
        </p>
      )}
    </div>
  );
};

export default SubscriptionPage;