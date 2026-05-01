import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

/* مكون واجهة الخطأ عند محاولة الدخول لصفحة دون امتلاك الصلاحيات المطلوبة */
const PermissionDenied = () => {
  /* تهيئة أداة التنقل للتحكم في المسارات */
  const navigate = useNavigate();

  return (
    /* حاوية الصفحة مع ضبط التوسيط العمودي والأفقي */
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
      
      /* أيقونة المنع باستخدام لون التنبيه المعتمد في الهوية */
      <ShieldX className="w-16 h-16 text-destructive mb-4" />
      
      <h1 className="text-2xl font-extrabold text-foreground mb-2">غير مصرح بالوصول</h1>
      
      <p className="text-muted-foreground mb-6">ليس لديك صلاحية للوصول إلى هذه الصفحة</p>
      
      /* زر العودة لإعادة توجيه المستخدم للمسار الرئيسي */
      <Button onClick={() => navigate("/")} className="rounded-xl">العودة للرئيسية</Button>
      
    </div>
  );
};

export default PermissionDenied;