/* * 📦 استيراد أدوات مكتبة React، الترجمة، وإدارة حالة المصادقة.
 * بالإضافة إلى مكونات واجهة المستخدم (UI Components) والأيقونات لبناء بطاقة الدفع.
 */
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

/* * 💳 صفحة الاشتراكات (Subscription Page):
 * هذه الصفحة تمثل "بوابة الدفع" أو جدار الدفع (Paywall) لمقدمي الخدمات.
 * تمنعهم من إدارة خدماتهم ما لم يكن لديهم اشتراك سنوي نشط.
 */
const SubscriptionPage = () => {
  /* أدوات النظام: الترجمة، بيانات المستخدم الحالي، والتوجيه المبرمج للمسارات */
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate(); 

  /* * إدارة حالات واجهة المستخدم (UI States):
   * - subscription: لتخزين بيانات الاشتراك وعرض حالة "مفعل/منتهي" في الواجهة.
   * - loading: للتحكم في ظهور "مؤشر النبض" أثناء التخاطب مع السيرفر.
   * - submitting: لمنع المستخدم من النقر المزدوج على "زر الدفع" أثناء معالجة الطلب (يعطل الزر ويغير نصه).
   */
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  /* * جلب سجل الاشتراك من قاعدة البيانات:
   * تقوم الدالة بالبحث في جدول الاشتراكات وتستخرج الاشتراك "النشط" إن وُجد لتفعيل حساب المزود.
   * استخدمنا `useCallback` لتحسين الأداء ومنع إعادة بناء الدالة مع كل تحديث للواجهة (Re-render).
   */
  const fetchSubscription = useCallback(async (mounted = true) => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("subscriptions" as any) 
        .select("*")
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false }); 
      
      if (!error && mounted && data && data.length > 0) {
        /* تصفية النتائج (Filtering): عرض الاشتراك الفعال لضمان عدم قفل الحساب لو كان هناك اشتراكات قديمة منتهية */
        const activeSub = data.find((s: any) => s.status === 'active');
        setSubscription(activeSub || data[0]);
      } else if (mounted) {
        setSubscription(null);
      }
    } catch (err) {
      console.error("Error fetching subscription:", err);
    } finally {
      /* إيقاف مؤشر التحميل فقط إذا كان المكون لا يزال معروضاً على الشاشة */
      if (mounted) setLoading(false);
    }
  }, [user?.id]);

  /* * دورة حياة المكون (Lifecycle):
   * يتم التشغيل بمجرد فتح المستخدم لصفحة الاشتراك. 
   * نستخدم صمام الأمان (mounted) لمنع تسريب الذاكرة (Memory Leak) في حال غادر المستخدم الصفحة قبل اكتمال تحميل البيانات.
   */
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

  /* * 💸 معالجة الدفع وإنشاء الاشتراك:
   * تُستدعى عند النقر على الزر الرئيسي (Call-To-Action).
   */
  const handleSubscribe = async () => {
    if (!user?.id) return;
    setSubmitting(true); /* تفعيل حالة المعالجة لتعطيل الزر مؤقتاً */
    
    try {
      /* حساب تاريخ الانتهاء (Expiration Date): إضافة عام كامل من اللحظة الحالية */
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      /* عملية Upsert: تقوم بتجديد الاشتراك الحالي إن وجد، أو إنشاء سجل جديد كلياً */
      const { error } = await supabase
        .from("subscriptions" as any) 
        .upsert({
          provider_id: user.id,
          status: 'active',
          amount: 100,
          expires_at: futureDate.toISOString(),
        } as any);

      if (error) throw error;
      
      /* إظهار إشعار انبثاقي (Toast) بنجاح العملية وتحديث البيانات محلياً */
      toast.success(t('payment.success') || 'تم الدفع بنجاح! تم تفعيل الاشتراك.');
      await fetchSubscription(true);

      /* * 🚀 توجيه تجربة المستخدم (UX Routing):
       * ننتظر ثانية واحدة ثم ننقل المزود مباشرة للوحة التحكم الخاصة به، مع إضافة متغير (payment_success) 
       * ليقرأه النظام هناك ويخفي جدار المنع تلقائياً دون الحاجة لتحديث الصفحة.
       */
      setTimeout(() => {
        navigate('/provider?payment_success=true', { replace: true });
      }, 1000);

    } catch (err: any) {
      console.error("Subscription error:", err);
      toast.error(t('payment.failed') || 'فشل الدفع. يرجى المحاولة مجدداً.');
    } finally {
      setSubmitting(false); /* إعادة تفعيل زر الدفع في حال فشل العملية ليحاول مجدداً */
    }
  };

  /* ⏳ حالة التحميل المرئية (Skeleton / Loading State):
   * تظهر كواجهة نابضة مريحة لعين المستخدم حتى نتأكد من حالة اشتراكه الحالية من السيرفر.
   */
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

  /* 🎨 الهيكل البصري الرئيسي للصفحة المكتملة التحميل */
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      
      {/* حاوية وسطية لتجميع محتوى صفحة الدفع (Layout Container) */}
      <div className="container py-10 max-w-2xl text-right">
        <h1 className="text-3xl font-black mb-8 text-center text-primary tracking-tighter">
          {t('payment.title') || t('subscription.title') || 'دفع الاشتراك'}
        </h1>
        
        {/* 💳 بطاقة عرض الخطة (Pricing Card Component) */}
        <Card className="border-2 border-primary/20 shadow-xl overflow-hidden rounded-4xl bg-card">
          
          {/* شريط تمييز علوي يعطي إيحاء بـ "الخطة الاحترافية" */}
          <div className="bg-primary p-4 text-primary-foreground text-center shadow-sm">
            <p className="text-xs font-black uppercase tracking-wider">
              {t('subscription.professional_plan') || 'الخطة الاحترافية السنوية'}
            </p>
          </div>
          
          {/* قسم التسعير البارز بصرياً */}
          <CardHeader className="text-center pb-2 mt-4">
            <CardTitle className="text-4xl font-black text-primary pt-2">
              100 ريال <span className="text-lg text-muted-foreground font-normal">/ {t('common.year') || 'سنة'}</span>
            </CardTitle>
            <p className="text-sm font-bold text-muted-foreground mt-2">
              {t('subscription.trial_offer') || 'تمتع بكافة مزايا المنصة لمقدمي الخدمات'}
            </p>
          </CardHeader>
          
          {/* قائمة المزايا (Features List): مصممة لزيادة معدل تحويل العملاء (Conversion Rate) */}
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

          {/* تذييل البطاقة ومكان اتخاذ الإجراء (Call to Action Area) */}
          <CardFooter className="p-6 bg-muted/30 border-t">
            <Button 
              className="w-full h-14 text-md font-black rounded-2xl shadow-lg shadow-primary/10 hover:scale-[1.01] transition-all" 
              onClick={handleSubscribe}
              /* يعطل الزر (Disabled) إذا كان الاشتراك مفعل سلفاً أو إذا كنا بانتظار استجابة السيرفر لمنع التكرار */
              disabled={subscription?.status === 'active' || submitting}
            >
              <CreditCard className="me-2 w-5 h-5 rtl:-scale-x-100" />
              {/* نص ديناميكي للزر بناءً على حالة المعالجة الحالية */}
              {subscription?.status === 'active' 
                ? t('subscription.active_subscription') || 'الاشتراك فعال'
                : submitting 
                  ? t('common.processing') || 'جاري معالجة الدفع...' 
                  : t('payment.confirm_access') || 'تأكيد الدفع والتفعيل'}
            </Button>
          </CardFooter>
        </Card>

        {/* * 🏷️ شريط عرض تفاصيل وتاريخ الاشتراك الحالي:
         * لا يظهر هذا الشريط أبداً إلا في حال كان لدى المزود سجل اشتراك مسجل بقاعدة البيانات.
         * يحتوي على تأثيرات الظهور التدريجي (Fade-in).
         */}
        {subscription && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs font-bold text-muted-foreground bg-white shadow-sm p-4 rounded-2xl border animate-in fade-in duration-300">
            <span className="flex items-center gap-2">الحالة: 
              {/* وسام ديناميكي (Badge) يتغير لونه حسب الحالة: نشط (أخضر) منتهي (برتقالي) */}
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
