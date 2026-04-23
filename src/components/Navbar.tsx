import { Search, User, LogOut, ClipboardList, Moon, Sun, Edit, MessageCircle } from "lucide-react";
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
import NotificationsBell from "@/components/NotificationsBell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";

interface NavbarProps {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
}

const Navbar = ({ searchQuery = "", onSearchChange }: NavbarProps) => {
  const navigate = useNavigate();
  const { user, role, profile, signOut } = useAuth();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [editOpen, setEditOpen] = useState(false);
  const [reqName, setReqName] = useState(profile?.full_name || "");
  const [reqPhone, setReqPhone] = useState(profile?.phone || "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setReqName(profile?.full_name || "");
    setReqPhone(profile?.phone || "");
  }, [profile]);

  const toggleDark = () => {
    document.documentElement.classList.toggle("dark");
    setDark(!dark);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleLogoClick = () => {
    if (role === "provider") navigate("/provider");
    else if (role === "admin") navigate("/admin");
    else navigate("/");
  };

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
      toast.success("تم إرسال طلب تعديل البيانات للمراجعة");
      setEditOpen(false);
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  const showSearch = role === "client" && onSearchChange;

  return (
    <>
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b">
        <div className="container flex items-center justify-between h-16 gap-4">
          <h1
            className="text-xl font-extrabold text-primary cursor-pointer shrink-0"
            onClick={handleLogoClick}
          >
            بوابة حائل
          </h1>

          {showSearch && (
            <div className="relative flex-1 max-w-md">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ابحث عن خدمة..."
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="ps-10 rounded-xl bg-secondary border-0"
              />
            </div>
          )}

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggleDark} title={dark ? "الوضع الفاتح" : "الوضع الداكن"}>
              {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>

            {user && profile?.is_verified && <NotificationsBell />}

            {/* أيقونة الدعم الفني الدائرية - متاحة الآن للكل (عميل، مزود، أدمن) */}
            {user && (
              <Button variant="ghost" size="icon" onClick={() => navigate("/support")} title="الدعم الفني">
                <MessageCircle className="w-5 h-5" /> 
              </Button>
            )}

            {/* تم حذف زر الاشتراك السنوي من هنا بناءً على طلبك */}

            {user && profile?.is_verified && role === "client" && (
              <Button variant="ghost" size="icon" onClick={() => navigate("/my-bookings")} title="طلباتي">
                <ClipboardList className="w-5 h-5" />
              </Button>
            )}

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" title="الاعدادات">
                    <User className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <div className="px-3 py-2">
                    <p className="font-bold text-sm">{profile?.full_name || "مستخدم"}</p>
                    <p className="text-xs text-muted-foreground">
                      {role === "provider" ? "مقدم خدمة موثق" : role === "admin" ? "مسؤول النظام" : "عميل"}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setEditOpen(true)} className="gap-2 cursor-pointer">
                    <Edit className="w-4 h-4" />
                    تعديل البيانات
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="gap-2 cursor-pointer text-destructive">
                    <LogOut className="w-4 h-4" />
                    تسجيل الخروج
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="outline" className="rounded-xl px-5" onClick={() => navigate("/auth")}>
                تسجيل الدخول
              </Button>
            )}
          </div>
        </div>
      </header>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل البيانات</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">سيتم إرسال طلب تعديل بياناتك للإدارة للمراجعة</p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>الاسم الكامل</Label>
              <Input value={reqName} onChange={(e) => setReqName(e.target.value)} dir="rtl" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>رقم الجوال</Label>
              <Input value={reqPhone} onChange={(e) => setReqPhone(e.target.value)} dir="ltr" className="rounded-xl" />
            </div>
            <Button onClick={handleProfileEditRequest} disabled={submitting} className="w-full rounded-xl">
              {submitting ? "جاري الإرسال..." : "تأكيد التعديل"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Navbar;