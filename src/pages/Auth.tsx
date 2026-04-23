import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Mail, Lock, User, Phone, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user, profile, role: userRole, loading: authLoading } = useAuth();
  const [role, setRole] = useState<"client" | "provider">("client");
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");

  const [signupName, setSignupName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPass, setSignupPass] = useState("");

  // Role-based auto-redirect once verified
  useEffect(() => {
    if (authLoading) return;
    if (user && profile?.is_verified && userRole) {
      const dest = userRole === "admin" ? "/admin" : userRole === "provider" ? "/provider" : "/";
      navigate(dest, { replace: true });
    }
  }, [authLoading, user, profile, userRole, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(loginEmail, loginPass);
    } catch (err: any) {
      toast.error(err.message || "خطأ في تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName.trim() || !signupEmail.trim() || !signupPass.trim()) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    if (signupPass.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    setLoading(true);
    try {
      await signUp(signupEmail, signupPass, signupName, signupPhone, role);
      toast.success("تم إنشاء الحساب! حسابك بانتظار التحقق من الإدارة.");
    } catch (err: any) {
      toast.error(err.message || "خطأ في إنشاء الحساب");
    } finally {
      setLoading(false);
    }
  };

  // Verification pending message
  if (user && profile && !profile.is_verified) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-2xl shadow-lg p-8 text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-warning mx-auto" />
          <h2 className="text-xl font-extrabold text-foreground">حسابك بانتظار التحقق</h2>
          <p className="text-muted-foreground">
            جاري التحقق من حسابك من قبل الإدارة. ستصلك رسالة عند اكتمال التحقق.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-primary">بوابة حائل</h1>
          <p className="text-muted-foreground mt-2">مرحبًا بك في بوابة الخدمات</p>
        </div>

        <Card className="rounded-2xl shadow-lg">
          <CardHeader className="pb-2">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-xl">
                <TabsTrigger value="login">تسجيل الدخول</TabsTrigger>
                <TabsTrigger value="signup">حساب جديد</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-6">
                <form className="space-y-4" onSubmit={handleLogin}>
                  <div className="space-y-2">
                    <Label htmlFor="login-email">البريد الإلكتروني</Label>
                    <div className="relative">
                      <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="login-email" type="email" placeholder="example@mail.com" className="ps-10" dir="ltr" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-pass">كلمة المرور</Label>
                    <div className="relative">
                      <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="login-pass" type="password" placeholder="••••••••" className="ps-10" dir="ltr" value={loginPass} onChange={e => setLoginPass(e.target.value)} required />
                    </div>
                  </div>
                  <Button className="w-full" type="submit" disabled={loading}>
                    {loading ? "جاري الدخول..." : "دخول"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <form className="space-y-4" onSubmit={handleSignup}>
                  <div className="space-y-2">
                    <Label>نوع الحساب</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" variant={role === "client" ? "default" : "outline"} className="rounded-xl" onClick={() => setRole("client")}>عميل</Button>
                      <Button type="button" variant={role === "provider" ? "default" : "outline"} className="rounded-xl" onClick={() => setRole("provider")}>مقدم خدمة</Button>
                    </div>
                    {role === "provider" && (
                      <p className="text-xs text-muted-foreground bg-accent/40 rounded-lg p-2">
                        💡 الاشتراك السنوي 100 ⃁ مع شهر تجريبي مجاني عند التحقق من حسابك.
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">الاسم الكامل</Label>
                    <div className="relative">
                      <User className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="signup-name" placeholder="أدخل اسمك" className="ps-10" value={signupName} onChange={e => setSignupName(e.target.value)} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">رقم الجوال</Label>
                    <div className="relative">
                      <Phone className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="signup-phone" type="tel" placeholder="05XXXXXXXX" className="ps-10" dir="ltr" value={signupPhone} onChange={e => setSignupPhone(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">البريد الإلكتروني</Label>
                    <div className="relative">
                      <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="signup-email" type="email" placeholder="example@mail.com" className="ps-10" dir="ltr" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-pass">كلمة المرور</Label>
                    <div className="relative">
                      <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="signup-pass" type="password" placeholder="••••••••" className="ps-10" dir="ltr" value={signupPass} onChange={e => setSignupPass(e.target.value)} required />
                    </div>
                  </div>
                  <Button className="w-full" type="submit" disabled={loading}>
                    {loading ? "جاري الإنشاء..." : "إنشاء حساب"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardHeader>
        </Card>

        <Button variant="ghost" className="w-full mt-4 text-muted-foreground" onClick={() => navigate("/")}>
          <ArrowRight className="w-4 h-4 ms-2" />
          العودة للرئيسية
        </Button>
      </div>
    </div>
  );
};

export default Auth;
