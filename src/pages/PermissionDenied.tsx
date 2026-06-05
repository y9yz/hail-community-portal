// استيراد الأيقونة والمكونات الأساسية وأدوات التنقل والترجمة
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

// تعريف مكون صفحة "الوصول المرفوض" التي تظهر عندما لا يملك المستخدم صلاحية الدخول
const PermissionDenied = () => {
  // تجهيز أداة التنقل للرجوع أو الانتقال لصفحات أخرى
  const navigate = useNavigate();
  // تجهيز أداة الترجمة لعرض النصوص باللغة المناسبة
  const { t } = useTranslation();

  return (
    // الحاوية الرئيسية: تغطي الشاشة بالكامل وتوسط المحتوى بالطول والعرض
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
      
      // عرض أيقونة الحظر بحجم كبير ولون أحمر (للتعبير عن الخطأ)
      <ShieldX className="w-16 h-16 text-destructive mb-4" />
      
      // عنوان الصفحة الرئيسي (مثال: عذراً، لا تملك الصلاحية)
      <h1 className="text-2xl font-extrabold text-foreground mb-2">
        {t('permissionDenied.title')}
      </h1>
      
      // نص توضيحي يشرح للمستخدم سبب منعه من الدخول
      <p className="text-muted-foreground mb-6">
        {t('permissionDenied.description')}
      </p>
      
      // زر العودة: عند الضغط عليه ينقل المستخدم إلى الصفحة الرئيسية مباشرة
      <Button onClick={() => navigate("/")} className="rounded-xl">
        {t('permissionDenied.back_home')}
      </Button>
      
    </div>
  );
};

export default PermissionDenied;