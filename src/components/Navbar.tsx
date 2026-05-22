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
import { useTranslation } from "react-i18next"; // 🌍 استدعاء مكتبة الترجمة

interface NavbarProps {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
}

const Navbar = ({ searchQuery = "", onSearchChange }: NavbarProps) => {
  const navigate = useNavigate();
  const { user, role, profile, signOut } = useAuth();
  const { t, i18n } = useTranslation(); // 🌍 استخدام الترجمة واللغة الحالية

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const debouncedSearch = useDebounce(localSearch, 500);

  /* شيك على الثيم.. ليل ولا نهار */
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [editOpen, setEditOpen] = useState(false);
  const [reqName, setReqName] = useState(profile?.full_name || "");
  const [reqPhone, setReqPhone] = useState(profile?.phone || "");
  const [submitting, setSubmitting] = useState(false);

  /* إذا تغير البروفايل.. حدث البيانات اللي بالخانات */
  useEffect(() => {
    setReqName(profile?.full_name || "");
    setReqPhone(profile?.phone || "");
  }, [profile]);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (onSearchChange && debouncedSearch !== searchQuery) {
      onSearchChange(debouncedSearch);
    }
  }, [debouncedSearch, onSearchChange, searchQuery]);

  /* اقلب اللمبة.. فاتح ولا داكن */
  const toggleDark = () => {
    document.documentElement.classList.toggle("dark");
    setDark(!dark);
  };

  /* 🌍 تبديل اللغة بين عربي وإنجليزي */
  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(nextLang);
  };

  /* تسجيل الخروج.. ودعناهم */
  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  /* ضغطة الشعار.. يوديك لمكانك حسب رتبتك */
  const handleLogoClick = () => {
    if (role === "provider") navigate("/provider");
    else if (role === "admin") navigate("/admin");
    else navigate("/");
  };

  /* يرسل طلب تعديل بياناتك للإدارة.. مراجعة وتدقيق */
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
      toast.success(t('edit_success')); // 🌍 رسالة مترجمة
      setEditOpen(false);
    } catch (err: any) {
      toast.error(err.message || t('error_occurred')); // 🌍 رسالة مترجمة
    } finally {
      setSubmitting(false);
    }
  };

  /* البحث ما يظهر إلا للعملاء الدوارة */
  const showSearch = role === "client" && onSearchChange;

  return (
    <>
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b">
        <div className="container flex items-center justify-between h-16 gap-4">
          {/* شعار البوابة.. ضغطة وحدة ترجعك لبيتك */}
          <h1
            className="text-xl font-extrabold text-primary cursor-pointer shrink-0"
            onClick={handleLogoClick}
          >
            {t("portal.name")}
          </h1>

          {/* خانة البحث.. دور لك على خدمة */}
          {showSearch && (
            <div className="relative flex-1 max-w-md">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('search_placeholder')} // 🌍
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="ps-10 rounded-xl bg-secondary border-0"
              />
            </div>
          )}

          {/* أزرار التحكم والبروفايل */}
          <div className="flex items-center gap-1">
            
            {/* 🌍 زر تبديل اللغة */}
            <Button variant="ghost" size="icon" onClick={toggleLanguage} title={i18n.language === 'ar' ? "English" : "العربية"}>
              <Globe className="w-5 h-5" />
            </Button>

            <Button variant="ghost" size="icon" onClick={toggleDark} title={dark ? t('light_mode') : t('dark_mode')}>
              {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>

            {user && profile?.is_verified && <NotificationsBell />}

            {/* الدعم الفني.. تواصل معهم بأي وقت */}
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

            {user ? (
              /* قائمة المستخدم.. إعدادات وخروج */
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
                      {role === "provider" ? t('verified_provider') : role === "admin" ? t('admin_role') : t('client_role')}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setEditOpen(true)} className="gap-2 cursor-pointer">
                    <Edit className="w-4 h-4" />
                    {t('edit_profile')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="gap-2 cursor-pointer text-destructive">
                    <LogOut className="w-4 h-4" />
                    {t('logout')}
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

      {/* نافذة تعديل البيانات.. ترسل الطلب وتنتظر المراجعة */}
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