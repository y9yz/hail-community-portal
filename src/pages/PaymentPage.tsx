import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/Navbar";

const PaymentPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // دالة الدفع التي تربط مباشرة مع جدول subscriptions في سوبابيس
  const handlePayment = async (methodName: string) => {
    if (!user) return;

    try {
      const newExpiry = new Date();
      newExpiry.setFullYear(newExpiry.getFullYear() + 1);

      const { error } = await supabase
        .from("subscriptions" as any) 
        .upsert({ 
          provider_id: user.id,
          status: 'active', 
          expires_at: newExpiry.toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'provider_id' });

      if (error) {
        // سيظهر لك تنبيه فيه تفاصيل الخطأ التقني إذا فشل
        alert("خطأ سوبابيس: " + error.message);
        throw error;
      }

      toast.success(`تمت عملية الدفع عبر ${methodName} بنجاح!`);
      navigate("/provider"); 
      
    } catch (err: any) {
      console.error("Payment Error:", err);
      toast.error("حدث خطأ أثناء معالجة الدفع، يرجى مراجعة التنبيه");
    }
  };

  const paymentMethods = [
    { name: "Apple Pay", img: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Apple_Pay_logo.svg/1200px-Apple_Pay_logo.svg.png" },
    { name: "مدى mada", img: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Mada_Logo.svg/1200px-Mada_Logo.svg.png" },
    { name: "Visa / MasterCard", img: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-10 max-w-md space-y-8">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/provider")}><ArrowRight /></Button>
          <h1 className="text-2xl font-black">إتمام الدفع</h1>
        </div>

        <Card className="rounded-3xl border-2 border-primary/20 p-6 text-center space-y-4 shadow-lg">
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm font-bold">قيمة الاشتراك السنوي</p>
            <h2 className="text-4xl font-black text-primary">100 ⃁</h2>
          </div>
          <p className="text-[10px] text-muted-foreground italic bg-muted py-1 rounded-full">
            تفعيل فوري لجميع مميزات مقدم الخدمة
          </p>
        </Card>

        <div className="space-y-4">
          <p className="text-sm font-bold text-center mb-2">اختر وسيلة الدفع</p>
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

        <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            بمجرد اختيار وسيلة الدفع، سيتم تحديث حالة حسابك في قاعدة البيانات وتجديد صلاحية الوصول للوحة التحكم لمدة سنة كاملة.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;