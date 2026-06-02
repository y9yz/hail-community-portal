import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/Navbar";

const PaymentPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();

  /**
   * معالجة عملية الدفع وتحديث قاعدة البيانات
   * يتم احتساب سنة كاملة من تاريخ اليوم وتحديث سجل الاشتراك بربطه بـ provider_id
   */
  const handlePayment = async (methodName: string) => {
    /* التحقق من وجود جلسة مستخدم نشطة */
    if (!user) return;

    try {
      /* احتساب تاريخ الانتهاء (سنة من اللحظة الحالية) */
      const newExpiry = new Date();
      newExpiry.setFullYear(newExpiry.getFullYear() + 1);

      /**
       * استخدام upsert لتحديث سجل الاشتراك الحالي أو إنشاء سجل جديد
       * تم تحديد onConflict لضمان عدم تكرار السجلات لنفس المزود
       */
      const { error } = await supabase
        .from("subscriptions" as any) 
        .upsert({ 
          provider_id: user.id,
          status: 'active', 
          expires_at: newExpiry.toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'provider_id' });

      if (error) {
        /* إظهار الخطأ التقني المباشر في حال فشل الاتصال بقاعدة البيانات */
        alert(t('payment.error_alert', { message: error.message }));
        throw error;
      }

      toast.success(t('payment.success', { methodName }));
      
      /* إعادة التوجيه للوحة التحكم بعد تحديث الحالة */
      navigate("/provider"); 
      
    } catch (err: any) {
      console.error("Payment Error:", err);
      toast.error(t('payment.failed'));
    }
  };

  /* قائمة ببيانات وسائل الدفع المتاحة للعرض */
  const paymentMethods = [
    { name: "Apple Pay", img: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Apple_Pay_logo.svg/1200px-Apple_Pay_logo.svg.png" },
    { name: "مدى mada", img: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Mada_Logo.svg/1200px-Mada_Logo.svg.png" },
    { name: "Visa / MasterCard", img: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <header className="sticky top-16 z-40 bg-card/80 backdrop-blur-lg border-b">
        <div className="container flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/provider")} className="rounded-full hover:bg-muted">
              <ArrowRight className="w-5 h-5 text-primary" />
            </Button>
            <h1 className="text-2xl font-black text-foreground tracking-tighter">{t('payment.title')}</h1>
          </div>
        </div>
      </header>
      <div className="container py-6 max-w-md">

        {/* عرض تفاصيل المبلغ المستحق */}
        <Card className="rounded-3xl border-2 border-primary/20 p-6 text-center space-y-4 shadow-lg">
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm font-bold">{t('payment.annual_fee_label')}</p>
            <h2 className="text-4xl font-black text-primary">100 ⃁</h2>
          </div>
          <p className="text-[10px] text-muted-foreground italic bg-muted py-1 rounded-full">
            {t('payment.confirm_access')}
          </p>
        </Card>

        {/* عرض خيارات الدفع كبطاقات تفاعلية */}
        <div className="space-y-4">
          <p className="text-sm font-bold text-center mb-2">{t('payment.choose_method')}</p>
          {paymentMethods.map((method) => (
            <Card 
              key={method.name} 
              className="cursor-pointer hover:border-primary border-2 transition-all rounded-2xl overflow-hidden group shadow-sm active:scale-95"
              onClick={() => handlePayment(method.name)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <img src={method.img} alt={method.name} className="h-8 object-contain transition-all" />
                <span className="text-sm font-bold">{method.name}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* تنبيه قانوني حول آلية التجديد الآلي وتغيير حالة الحساب */}
        <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            {t('payment.legal_notice')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;