// استيراد الأيقونات والمكونات والأدوات اللازمة
import { Search, User, LogOut, ClipboardList, Moon, Sun, Edit, MessageCircle, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import useDebounce from "@/hooks/useDebounce";
import NotificationsBell from "@/components/NotificationsBell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface NavbarProps {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
}

const Navbar = ({ searchQuery = "", onSearchChange }: NavbarProps) => {
  const navigate = useNavigate();
  const { user, role, profile, signOut } = useAuth();
  const { t, i18n } = useTranslation();

  // الحالة المحلية للبحث مع تفعيل خاصية التأخير (Debounce) لتقليل عدد الطلبات
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const debouncedSearch = useDebounce(localSearch, 500);

  // حالة التحكم في الثيم (Dark/Light) ونافذة تعديل البروفايل
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [editOpen, setEditOpen] = useState(false);
  const [reqName, setReqName] = useState(profile?.full_name || "");
  const [reqPhone, setReqPhone] = useState(profile?.phone || "");
  const [submitting, setSubmitting] = useState(false);

  // تحديث بيانات النموذج عند تغير بيانات البروفايل
  useEffect(() => {
    setReqName(profile?.full_name || "");
    setReqPhone(profile?.phone || "");
  }, [profile]);

  // مزامنة البحث المحلي مع القيمة الممررة من الخارج
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // إرسال قيم البحث للخارج بعد انتهاء فترة التأخير (Debounce)
  useEffect(() => {
    if (onSearchChange && debouncedSearch !== searchQuery) {
      onSearchChange(debouncedSearch);
    }
  }, [debouncedSearch, onSearchChange, searchQuery]);

  // التبديل بين النمط الداكن والفاتح
  const toggleDark = () => {
    document.documentElement.classList.toggle("dark");
    setDark(!dark);
  };

  // تبديل لغة التطبيق
  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(nextLang);
  };

  // تسجيل الخروج
  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  // التنقل للصفحة الرئيسية بناءً على دور المستخدم
  const handleLogoClick = () => {
    if (role === "provider") navigate("/provider");
    else if (role === "admin") navigate("/admin");
    else navigate("/");
  };

  // إرسال طلب تعديل البيانات للإدارة للمراجعة
  const handleProfileEditRequest = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("profile_edit_requests").insert({
        user_id: user.id,
        requested_name: reqName.trim() || null,
        requested_phone: reqPhone.trim() || null,
      } as any);
      if (error) throw error;
      toast.success(t('edit_success'));
      setEditOpen(false);
    } catch (err: any) {
      toast.error(err.message || t('error_occurred'));
    } finally {
      setSubmitting(false);
    }
  };

  const showSearch = role === "client" && onSearchChange;

  return (
    <>
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b">
        <div className="container flex items-center justify-between h-16 gap-4">
          {/* شعار المنصة */}
          <h1
            className="text-xl font-extrabold text-primary cursor-pointer shrink-0"
            onClick={handleLogoClick}
          >
            {t("portal.name")}
          </h1>

          {/* خانة البحث تظهر فقط للعملاء */}
          {showSearch && (
            <div className="relative flex-1 max-w-md">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('search_placeholder')}
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="ps-10 rounded-xl bg-secondary border-0"
              />
            </div>
          )}

          {/* قائمة الأدوات والتحكم */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggleLanguage} title={i18n.language === 'ar' ? "English" : "العربية"}>
              <Globe className="w-5 h-5" />
            </Button>

            <Button variant="ghost" size="icon" onClick={toggleDark} title={dark ? t('light_mode') : t('dark_mode')}>
              {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>

            {/* أيقونة الإشعارات (تظهر للمستخدمين الموثقين فقط) */}
            {user && profile?.is_verified && <NotificationsBell />}

            {/* روابط سريعة (دعم، حجوزات) للمستخدمين المسجلين */}
            {user && (
              <Button variant="ghost" size="icon" onClick={() => navigate("/support")} title={t('support')}>
                <MessageCircle className="w-5 h-5" /> 
              </Button>
            )}

            {user && profile?.is_verified && role === "client" && (
              <Button variant="ghost" size="icon" onClick={() => navigate("/my-bookings")} title={t('my_bookings')}>
                <ClipboardList className="w-5 h-5" />
              </Button>
            )}

            {/* قائمة البروفايل */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" title={t('settings')}>
                    <User className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <div className="px-3 py-2">
                    <p className="font-bold text-sm">{profile?.full_name || t('user')}</p>
                    <p className="text-xs text-muted-foreground">
                      {role === "provider" ? t('roles.provider') : role === "admin" ? t('roles.admin_role') : t('roles.client_role')}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setEditOpen(true)} className="gap-2 cursor-pointer">
                    <Edit className="w-4 h-4" />
                    {t('auth.edit_profile')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="gap-2 cursor-pointer text-destructive">
                    <LogOut className="w-4 h-4" />
                    {t('auth.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="outline" className="rounded-xl px-5" onClick={() => navigate("/auth")}>
                {t('login')}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* نافذة طلب تعديل البيانات */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('edit_dialog_title')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('edit_dialog_desc')}</p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('full_name')}</Label>
              <Input value={reqName} onChange={(e) => setReqName(e.target.value)} dir={i18n.language === 'ar' ? "rtl" : "ltr"} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>{t('phone_number')}</Label>
              <Input value={reqPhone} onChange={(e) => setReqPhone(e.target.value)} dir="ltr" className="rounded-xl" />
            </div>
            <Button onClick={handleProfileEditRequest} disabled={submitting} className="w-full rounded-xl">
              {submitting ? t('sending') : t('confirm_edit')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Navbar;