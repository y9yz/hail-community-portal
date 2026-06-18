import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const PermissionDenied = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
      
      <ShieldX className="w-16 h-16 text-destructive mb-4" />
      
      <h1 className="text-2xl font-extrabold text-foreground mb-2">
        {t('permissionDenied.title')}
      </h1>
      
      <p className="text-muted-foreground mb-6">
        {t('permissionDenied.description')}
      </p>
      
      <Button onClick={() => navigate("/")} className="rounded-xl">
        {t('permissionDenied.back_home')}
      </Button>
      
    </div>
  );
};

export default PermissionDenied;
