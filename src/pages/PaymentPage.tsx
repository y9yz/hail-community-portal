import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, CreditCard } from "lucide-react"; 
import Navbar from "@/components/Navbar";

const PaymentPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();

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
        alert(t('payment.error_alert', { message: error.message }));
        throw error;
      }

      toast.success(t('payment.success', { methodName }));
      
      navigate("/provider?payment_success=true"); 
      
    } catch (err: any) {
      console.error("Payment Error:", err);
      toast.error(t('payment.failed'));
    }
  };

  const paymentMethods = [
    { name: "Apple Pay" },
    { name: "مدى mada" },
    { name: "Visa / MasterCard" }
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

        <Card className="rounded-3xl border-2 border-primary/20 p-6 text-center space-y-4 shadow-lg">
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm font-bold">{t('payment.annual_fee_label')}</p>
            <h2 className="text-4xl font-black text-primary">100 ⃁</h2>
          </div>
          <p className="text-[10px] text-muted-foreground italic bg-muted py-1 rounded-full">
            {t('payment.confirm_access')}
          </p>
        </Card>

        <div className="space-y-4 mt-6">
          <p className="text-sm font-bold text-center mb-2">{t('payment.choose_method')}</p>
          {paymentMethods.map((method) => (
            <Card 
              key={method.name} 
              className="cursor-pointer hover:border-primary border-2 transition-all rounded-2xl overflow-hidden group shadow-sm active:scale-95"
              onClick={() => handlePayment(method.name)}
            >
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <CreditCard className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                <span className="text-sm font-bold">{method.name}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex items-start gap-3 mt-6">
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
