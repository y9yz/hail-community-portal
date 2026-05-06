import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Mail, Lock, User, Phone, ShieldAlert, KeyRound, CheckCircle2 } from "lucide-react";
import { useAuth, translateError } from "@/hooks/useAuth"; 
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const navigate = useNavigate();
  const { 
    signIn, signUp, verifyOtp, resetPasswordEmail, updatePassword, 
    user, profile, role: userRole, loading: authLoading 
  } = useAuth();
  
  const [view, setView] = useState<"login" | "signup" | "verify-otp" | "forgot-password" | "reset-password">("login");
  const [role, setRole] = useState<"client" | "provider">("client");
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // ✅ التوجيه التلقائي بناءً على الدور (Role)
  useEffect(() => {
    if (authLoading) return;
    if (user && userRole) {
      const dest = userRole === "admin" ? "/admin" : userRole === "provider" ? "/provider" : "/";
      navigate(dest, { replace: true });
    }
  }, [authLoading, user, userRole, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err: any) {
      toast.error(translateError(err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    setLoading(true);
    try {
      // الفحص الاستباقي للإيميل المكرر
      const { data: checkEmail } = await (supabase.from("profiles") as any)
        .select("id")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();

      if (checkEmail) {
        toast.error("هذا البريد الإلكتروني مسجل مسبقاً، يرجى تسجيل الدخول.");
        setLoading(false);
        return;
      }

      await signUp(email, password, name, phone, role);
      toast.success("تم إرسال رمز التحقق إلى بريدك الإلكتروني");
      setView("verify-otp");
      
    } catch (err: any) {
      if (err.message?.includes("User already registered")) {
        toast.error("هذا البريد الإلكتروني مسجل مسبقاً، يرجى تسجيل الدخول.");
      } else {
        toast.error(translateError(err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  // 🚀 الدالة المحدثة: توثيق تلقائي عند إدخال الـ OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. تفعيل الحساب في Supabase Auth
      await verifyOtp(email, otpCode, 'signup');
      
      // 2. جلب بيانات المستخدم الحالي للحصول على الـ ID
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        // 3. تحديث جدول البروفايلات ليصبح "موثقاً" تلقائياً
        await (supabase
          .from("profiles")
          .update({ is_verified: true } as any)
          .eq("id", authUser.id));
      }

      toast.success("تم تفعيل وتوثيق حسابك بنجاح!");
      // الـ useEffect بالأعلى سيتكفل بنقله للصفحة المناسبة فوراً
    } catch (err: any) {
      toast.error(translateError(err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await resetPasswordEmail(email);
      toast.success("تم إرسال رمز استعادة كلمة المرور لبريدك الإلكتروني");
      setView("reset-password");
    } catch (err: any) {
      toast.error(translateError(err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyOtp(email, otpCode, 'recovery');
      await updatePassword(newPassword);
      toast.success("تم تحديث كلمة المرور بنجاح");
      setView("login");
    } catch (err: any) {
      toast.error(translateError(err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-primary tracking-tighter">بوابة مجتمع حائل</h1>
          <p className="text-muted-foreground mt-2">نظام الخدمات الذكي لمنطقة حائل</p>
        </div>

        <Card className="rounded-[2rem] shadow-xl overflow-hidden border-none bg-white/80 backdrop-blur-sm">
          <CardContent className="p-0">
            {(view === "login" || view === "signup") && (
              <Tabs value={view} onValueChange={(v) => setView(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 rounded-none h-14 bg-muted/10 p-1">
                  <TabsTrigger value="login" className="text-base font-bold data-[state=active]:bg-white data-[state=active]:text-primary rounded-xl transition-all">تسجيل الدخول</TabsTrigger>
                  <TabsTrigger value="signup" className="text-base font-bold data-[state=active]:bg-white data-[state=active]:text-primary rounded-xl transition-all">حساب جديد</TabsTrigger>
                </TabsList>

                <div className="p-6">
                  <TabsContent value="login" className="mt-0 space-y-4">
                    <form className="space-y-4" onSubmit={handleLogin}>
                      <div className="space-y-2">
                        <Label className="font-bold">البريد الإلكتروني</Label>
                        <div className="relative">
                          <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input type="email" placeholder="أدخل بريدك الإلكتروني" className="ps-10 h-11 rounded-xl" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold">كلمة المرور</Label>
                        <div className="relative">
                          <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input type="password" placeholder="••••••••" className="ps-10 h-11 rounded-xl" dir="ltr" value={password} onChange={e => setPassword(e.target.value)} required />
                        </div>
                      </div>
                      <div className="flex justify-start">
                        <Button type="button" variant="link" className="px-0 h-auto text-primary text-xs font-bold" onClick={() => setView("forgot-password")}>
                          هل نسيت كلمة المرور؟
                        </Button>
                      </div>
                      <Button className="w-full h-12 text-base font-black rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20" type="submit" disabled={loading}>
                        {loading ? "جاري التحقق..." : "تسجيل الدخول"}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup" className="mt-0 space-y-4">
                    <form className="space-y-4" onSubmit={handleSignup}>
                      <div className="space-y-2">
                        <Label className="font-bold">نوع الحساب</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Button type="button" variant={role === "client" ? "default" : "outline"} className="rounded-xl h-10 font-bold" onClick={() => setRole("client")}>عميل</Button>
                          <Button type="button" variant={role === "provider" ? "default" : "outline"} className="rounded-xl h-10 font-bold" onClick={() => setRole("provider")}>مقدم خدمة</Button>
                        </div>
                        {role === "provider" && (
                          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mt-2 flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-xs font-bold text-amber-800 leading-relaxed">
                              سياسة الاشتراك: 100 ريال سنوياً مع <span className="text-primary font-black">شهر تجريبي مجاني</span> عند التسجيل.
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold">الاسم الكامل</Label>
                        <div className="relative">
                          <User className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input placeholder="الاسم ثلاثي" className="ps-10 h-11 rounded-xl" value={name} onChange={e => setName(e.target.value)} required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold">رقم الجوال</Label>
                        <div className="relative">
                          <Phone className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input type="tel" placeholder="05XXXXXXXX" className="ps-10 h-11 rounded-xl" dir="ltr" value={phone} onChange={e => setPhone(e.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold">البريد الإلكتروني</Label>
                        <div className="relative">
                          <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input type="email" placeholder="example@mail.com" className="ps-10 h-11 rounded-xl" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold">كلمة المرور</Label>
                        <div className="relative">
                          <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input type="password" placeholder="••••••••" className="ps-10 h-11 rounded-xl" dir="ltr" value={password} onChange={e => setPassword(e.target.value)} required />
                        </div>
                      </div>
                      <Button className="w-full h-12 text-base font-black rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20" type="submit" disabled={loading}>
                        {loading ? "جاري معالجة الطلب..." : "إنشاء حساب جديد"}
                      </Button>
                    </form>
                  </TabsContent>
                </div>
              </Tabs>
            )}

            {view === "verify-otp" && (
              <div className="p-8 text-center space-y-6">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10 text-primary" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black">تأكيد الحساب</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    أدخل رمز التحقق المكون من <span className="font-bold text-primary">6 أرقام</span> المرسل إلى بريدك الإلكتروني
                  </p>
                </div>
                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <Input 
                    placeholder="0 0 0 0 0 0" 
                    className="text-center text-3xl tracking-[15px] font-black h-16 bg-muted/30 border-2 focus:border-primary transition-all rounded-2xl" 
                    maxLength={6}
                    inputMode="numeric"
                    dir="ltr"
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    required
                  />
                  <Button className="w-full h-12 font-black rounded-xl text-lg shadow-lg shadow-primary/20" type="submit" disabled={loading}>
                    تفعيل الحساب
                  </Button>
                  <Button type="button" variant="ghost" className="text-sm font-bold text-muted-foreground hover:text-primary" onClick={() => setView("signup")}>
                    العودة لتعديل البيانات
                  </Button>
                </form>
              </div>
            )}

            {/* باقي الواجهات (نسيت كلمة المرور / تعيين كلمة جديدة) تبقى كما هي */}
            {view === "forgot-password" && (
              <div className="p-8 space-y-6">
                <div className="text-center space-y-2">
                  <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                    <KeyRound className="w-10 h-10 text-primary" />
                  </div>
                  <h2 className="text-2xl font-black">استعادة كلمة المرور</h2>
                  <p className="text-sm text-muted-foreground">أدخل بريدك الإلكتروني لنرسل لك رمز الأمان</p>
                </div>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <Input type="email" placeholder="example@mail.com" className="h-12 text-center text-lg rounded-xl" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} required />
                  <Button className="w-full h-12 font-black rounded-xl shadow-lg shadow-primary/20" type="submit" disabled={loading}>إرسال الرمز</Button>
                  <Button type="button" variant="ghost" className="w-full font-bold" onClick={() => setView("login")}>العودة للدخول</Button>
                </form>
              </div>
            )}

            {view === "reset-password" && (
              <div className="p-8 space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-black text-primary">تعيين كلمة جديدة</h2>
                  <p className="text-sm text-muted-foreground">أدخل الرمز المكون من 6 أرقام وكلمتك الجديدة</p>
                </div>
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <Label className="text-xs font-bold text-muted-foreground">رمز التحقق (6 أرقام)</Label>
                  <Input 
                    maxLength={6} 
                    placeholder="000000"
                    className="text-center font-black tracking-[10px] h-12 text-xl bg-muted/20 rounded-xl" 
                    dir="ltr" 
                    value={otpCode} 
                    inputMode="numeric"
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ""))} 
                    required 
                  />
                  <Label className="text-xs font-bold text-muted-foreground">كلمة المرور الجديدة</Label>
                  <Input type="password" placeholder="••••••••" className="h-12 rounded-xl" dir="ltr" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                  <Button className="w-full h-12 font-black rounded-xl mt-2 shadow-lg shadow-primary/20" type="submit" disabled={loading}>تحديث كلمة المرور</Button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>

        <Button variant="ghost" className="w-full mt-6 text-muted-foreground font-bold hover:text-primary transition-colors" onClick={() => navigate("/")}>
          <ArrowRight className="w-4 h-4 ms-2" />
          العودة للرئيسية
        </Button>
      </div>
    </div>
  );
};

export default Auth;