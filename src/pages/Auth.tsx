// استيراد المكتبات الأساسية، مكونات واجهة المستخدم، وأدوات الاتصال بقاعدة البيانات
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
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  // تهيئة أدوات التنقل والترجمة والوظائف الخاصة بالمصادقة
  const navigate = useNavigate();
  const { 
    signIn, signUp, verifyOtp, resetPasswordEmail, updatePassword, 
    user, profile, role: userRole, loading: authLoading 
  } = useAuth();
  const { t } = useTranslation();
  
  // متغيرات الحالة للتحكم في الواجهة المعروضة وحالة التحميل
  const [view, setView] = useState<"login" | "signup" | "verify-otp" | "forgot-password" | "reset-password">("login");
  const [role, setRole] = useState<"client" | "provider">("client");
  const [loading, setLoading] = useState(false);

  // متغيرات الحالة لتخزين البيانات المدخلة في النماذج
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // توجيه المستخدم تلقائياً إلى الصفحة المناسبة له إذا كان مسجل الدخول مسبقاً
  useEffect(() => {
    if (authLoading) return;
    if (user && userRole) {
      const dest = userRole === "admin" ? "/admin" : userRole === "provider" ? "/provider" : "/";
      navigate(dest, { replace: true });
    }
  }, [authLoading, user, userRole, navigate]);

  // معالجة عملية تسجيل الدخول
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

  // معالجة عملية إنشاء حساب جديد
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // التحقق من تعبئة الحقول الإلزامية
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error(t('auth.fill_required'));
      return;
    }

    setLoading(true);
    try {
      // التحقق مسبقاً مما إذا كان البريد الإلكتروني مسجلاً بالفعل في قاعدة البيانات
      const { data: checkEmail } = await (supabase.from("profiles") as any)
        .select("id")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();

      if (checkEmail) {
        toast.error(t('auth.email_already_registered'));
        setLoading(false);
        return;
      }

      // إنشاء الحساب وإرسال رمز التحقق
      await signUp(email, password, name, phone, role);
      toast.success(t('auth.verification_sent'));
      setView("verify-otp"); // تحويل المستخدم لواجهة إدخال رمز التحقق
      
    } catch (err: any) {
      // التعامل مع أخطاء التسجيل وإظهار رسالة مناسبة للمستخدم
      if (err.message?.includes("User already registered")) {
        toast.error(t('auth.email_already_registered'));
      } else {
        toast.error(translateError(err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  // معالجة التحقق من الرمز السري (OTP) وتفعيل الحساب
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // إرسال الرمز للتحقق منه
      await verifyOtp(email, otpCode, 'signup');
      
      // جلب بيانات المستخدم لمعرفة المعرف الخاص به (ID)
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        // تحديث حالة الحساب في قاعدة البيانات ليصبح موثقاً
        await (supabase
          .from("profiles")
          .update({ is_verified: true } as any)
          .eq("id", authUser.id));
      }

      toast.success(t('auth.verified_success'));
      // بعد النجاح، سيقوم الـ useEffect الموجود بالأعلى بنقل المستخدم لصفحته المناسبة تلقائياً
    } catch (err: any) {
      toast.error(translateError(err.message));
    } finally {
      setLoading(false);
    }
  };

  // معالجة طلب استعادة كلمة المرور
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // إرسال رمز التحقق الخاص باستعادة كلمة المرور للبريد الإلكتروني
      await resetPasswordEmail(email);
      toast.success(t('auth.password_recovery_sent'));
      setView("reset-password"); // الانتقال لواجهة تعيين كلمة المرور الجديدة
    } catch (err: any) {
      toast.error(translateError(err.message));
    } finally {
      setLoading(false);
    }
  };

  // معالجة تعيين كلمة مرور جديدة
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // التحقق من الرمز وتحديث كلمة المرور في خطوة واحدة
      await verifyOtp(email, otpCode, 'recovery');
      await updatePassword(newPassword);
      toast.success(t('auth.password_updated'));
      setView("login"); // العودة لواجهة تسجيل الدخول بعد النجاح
    } catch (err: any) {
      toast.error(translateError(err.message));
    } finally {
      setLoading(false);
    }
  };

  // واجهة المستخدم (Render)
  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md animate-fade-in">
        
        {/* الترويسة والعنوان الرئيسي للواجهة */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-primary tracking-tighter">{t('portal.name')}</h1>
          <p className="text-muted-foreground mt-2">{t('portal.subtitle')}</p>
        </div>

        <Card className="rounded-[2rem] shadow-xl overflow-hidden border-none bg-white/80 backdrop-blur-sm">
          <CardContent className="p-0">
            
            {/* عرض تبويبات تسجيل الدخول وإنشاء الحساب */}
            {(view === "login" || view === "signup") && (
              <Tabs value={view} onValueChange={(v) => setView(v as any)} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 rounded-none h-14 bg-muted/10 p-1">
                  <TabsTrigger value="login" className="text-base font-bold data-[state=active]:bg-white data-[state=active]:text-primary rounded-xl transition-all">{t('auth.login_tab')}</TabsTrigger>
                  <TabsTrigger value="signup" className="text-base font-bold data-[state=active]:bg-white data-[state=active]:text-primary rounded-xl transition-all">{t('auth.signup_tab')}</TabsTrigger>
                </TabsList>

                <div className="p-6">
                  {/* نموذج تسجيل الدخول */}
                  <TabsContent value="login" className="mt-0 space-y-4">
                    <form className="space-y-4" onSubmit={handleLogin}>
                      <div className="space-y-2">
                        <Label className="font-bold">{t('auth.email_label')}</Label>
                        <div className="relative">
                          <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input type="email" placeholder={t('auth.email_placeholder')} className="ps-10 h-11 rounded-xl" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold">{t('auth.password_label')}</Label>
                        <div className="relative">
                          <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input type="password" placeholder={t('auth.password_placeholder')} className="ps-10 h-11 rounded-xl" dir="ltr" value={password} onChange={e => setPassword(e.target.value)} required />
                        </div>
                      </div>
                      <div className="flex justify-start">
                        <Button type="button" variant="link" className="px-0 h-auto text-primary text-xs font-bold" onClick={() => setView("forgot-password")}>
                          {t('auth.forgot_password')}
                        </Button>
                      </div>
                      <Button className="w-full h-12 text-base font-black rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20" type="submit" disabled={loading}>
                        {loading ? t('auth.loading') : t('auth.sign_in')}
                      </Button>
                    </form>
                  </TabsContent>

                  {/* نموذج إنشاء حساب جديد */}
                  <TabsContent value="signup" className="mt-0 space-y-4">
                    <form className="space-y-4" onSubmit={handleSignup}>
                      <div className="space-y-2">
                        <Label className="font-bold">{t('auth.account_type')}</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Button type="button" variant={role === "client" ? "default" : "outline"} className="rounded-xl h-10 font-bold" onClick={() => setRole("client")}>{t('roles.client')}</Button>
                          <Button type="button" variant={role === "provider" ? "default" : "outline"} className="rounded-xl h-10 font-bold" onClick={() => setRole("provider")}>{t('roles.provider')}</Button>
                        </div>
                        {/* عرض تنبيه خاص إذا اختار المستخدم التسجيل كمزود خدمة */}
                        {role === "provider" && (
                          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mt-2 flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-xs font-bold text-amber-800 leading-relaxed">
                              {t('auth.subscription_policy')}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold">{t('auth.full_name_label')}</Label>
                        <div className="relative">
                          <User className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input placeholder={t('auth.full_name_placeholder')} className="ps-10 h-11 rounded-xl" value={name} onChange={e => setName(e.target.value)} required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold">{t('auth.phone_label')}</Label>
                        <div className="relative">
                          <Phone className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input type="tel" placeholder={t('auth.phone_placeholder')} className="ps-10 h-11 rounded-xl" dir="ltr" value={phone} onChange={e => setPhone(e.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold">{t('auth.email_label')}</Label>
                        <div className="relative">
                          <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input type="email" placeholder={t('auth.email_placeholder')} className="ps-10 h-11 rounded-xl" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold">{t('auth.password_label')}</Label>
                        <div className="relative">
                          <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input type="password" placeholder={t('auth.password_placeholder')} className="ps-10 h-11 rounded-xl" dir="ltr" value={password} onChange={e => setPassword(e.target.value)} required />
                        </div>
                      </div>
                      <Button className="w-full h-12 text-base font-black rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20" type="submit" disabled={loading}>
                        {loading ? t('auth.processing') : t('auth.create_account')}
                      </Button>
                    </form>
                  </TabsContent>
                </div>
              </Tabs>
            )}

            {/* واجهة إدخال رمز التحقق للبريد الإلكتروني */}
            {view === "verify-otp" && (
              <div className="p-8 text-center space-y-6">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10 text-primary" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black">{t('auth.verify_account_title')}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t('auth.verify_account_instructions', { digits: 6 })}
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
                    {t('auth.activate_account_btn')}
                  </Button>
                  <Button type="button" variant="ghost" className="text-sm font-bold text-muted-foreground hover:text-primary" onClick={() => setView("signup") }>
                    {t('auth.back_edit_details')}
                  </Button>
                </form>
              </div>
            )}

            {/* واجهة طلب استعادة كلمة المرور */}
            {view === "forgot-password" && (
              <div className="p-8 space-y-6">
                <div className="text-center space-y-2">
                  <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                    <KeyRound className="w-10 h-10 text-primary" />
                  </div>
                  <h2 className="text-2xl font-black">{t('auth.recover_password_title')}</h2>
                  <p className="text-sm text-muted-foreground">{t('auth.forgot_password_instructions')}</p>
                </div>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <Input type="email" placeholder={t('auth.email_placeholder')} className="h-12 text-center text-lg rounded-xl" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} required />
                  <Button className="w-full h-12 font-black rounded-xl shadow-lg shadow-primary/20" type="submit" disabled={loading}>{t('auth.send_code_btn')}</Button>
                  <Button type="button" variant="ghost" className="w-full font-bold" onClick={() => setView("login")}>{t('auth.back_to_login')}</Button>
                </form>
              </div>
            )}

            {/* واجهة تعيين كلمة مرور جديدة */}
            {view === "reset-password" && (
              <div className="p-8 space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-black text-primary">{t('auth.reset_password_title')}</h2>
                  <p className="text-sm text-muted-foreground">{t('auth.reset_password_instructions')}</p>
                </div>
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <Label className="text-xs font-bold text-muted-foreground">{t('auth.otp_label')}</Label>
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
                  <Label className="text-xs font-bold text-muted-foreground">{t('auth.new_password_label')}</Label>
                  <Input type="password" placeholder={t('auth.password_placeholder')} className="h-12 rounded-xl" dir="ltr" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                  <Button className="w-full h-12 font-black rounded-xl mt-2 shadow-lg shadow-primary/20" type="submit" disabled={loading}>{t('auth.update_password_btn')}</Button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>

        {/* زر العودة إلى الصفحة الرئيسية */}
        <Button variant="ghost" className="w-full mt-6 text-muted-foreground font-bold hover:text-primary transition-colors" onClick={() => navigate("/") }>
          <ArrowRight className="w-4 h-4 ms-2" />
          {t('common.back_home')}
        </Button>
      </div>
    </div>
  );
};

export default Auth;