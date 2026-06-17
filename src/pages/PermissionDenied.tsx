import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

/**
 * مكون صفحة "الوصول غير المصرح به" (Permission Denied)
 * تظهر هذه الصفحة عندما يحاول المستخدم الدخول إلى مسار لا يملك صلاحيات كافية للوصول إليه.
 */
const PermissionDenied = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
      
      {/* أيقونة حالة الحظر/الخطأ */}
      <ShieldX className="w-16 h-16 text-destructive mb-4" />
      
      {/* عنوان الخطأ الرئيسي */}
      <h1 className="text-2xl font-extrabold text-foreground mb-2">
        {t('permissionDenied.title')}
      </h1>
      
      {/* الوصف التوضيحي للخطأ */}
      <p className="text-muted-foreground mb-6">
        {t('permissionDenied.description')}
      </p>
      
      {/* زر إعادة التوجيه إلى الصفحة الرئيسية */}
      <Button onClick={() => navigate("/")} className="rounded-xl">
        {t('permissionDenied.back_home')}
      </Button>
      
    </div>
  );
};

export default PermissionDenied;
