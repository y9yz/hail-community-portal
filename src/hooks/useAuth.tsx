import { useState, useEffect, createContext, useContext, ReactNode, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { toast } from "sonner";

// نقلنا الدالة هنا لكن جعلناها "خام" لتعطينا الخطأ الحقيقي إذا لم تتعرف عليه
const getArabicError = (errorMsg: string) => {
  console.log("Raw Server Error:", errorMsg); // لمراقبة الخطأ في الكونسول

  if (errorMsg.includes("Invalid login credentials")) return "بيانات الدخول غير صحيحة، يرجى التأكد والمحاولة مجدداً.";
  if (errorMsg.includes("User already registered")) return "هذا البريد الإلكتروني مسجل مسبقاً لدينا.";
  if (errorMsg.includes("Password should be at least")) return "يجب أن تكون كلمة المرور مكونة من 6 رموز على الأقل.";
  if (errorMsg.includes("Token has expired or is invalid")) return "رمز التحقق غير صحيح أو قد انتهت صلاحيته.";
  if (errorMsg.includes("Email not confirmed")) return "يرجى تفعيل الحساب عبر بريدك الإلكتروني أولاً.";
  if (errorMsg.includes("rate limit")) return "لقد تجاوزت الحد المسموح، يرجى الانتظار قليلاً قبل المحاولة مجدداً.";
  
  // ✅ التعديل الجوهري: إذا كان الخطأ غير معروف (مثل أخطاء SMTP)، أظهره كما هو
  return `خطأ تقني من الخادم: ${errorMsg}`;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: "client" | "provider" | "admin" | null;
  profile: { full_name: string; phone: string | null; is_verified: boolean } | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, phone: string, role: "client" | "provider") => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  verifyOtp: (email: string, token: string, type: "signup" | "recovery") => Promise<void>;
  resetPasswordEmail: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<"client" | "provider" | "admin" | null>(null);
  const [profile, setProfile] = useState<{ full_name: string; phone: string | null; is_verified: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      const [{ data: roles }, { data: prof }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("profiles").select("full_name, phone, is_verified").eq("id", userId).single(),
      ]);

      if (roles && roles.length > 0) setRole(roles[0].role as any);
      else setRole("client");

      if (prof) setProfile(prof);
    } catch (err) {
      console.error("Auth Error:", err);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (mounted) {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession?.user) {
          await fetchUserData(currentSession.user.id);
        }
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        await fetchUserData(currentSession.user.id);
      } else {
        setRole(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

  // ✅ الإصلاح: نمرر error.message مباشرة لصفحة الـ UI لتتم معالجتها هناك بالترجمة الصحيحة
  const signUp = useCallback(async (email: string, password: string, fullName: string, phone: string, role: "client" | "provider") => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone, role } },
    });
    // هنا نرمي الرسالة الإنجليزية لكي تستطيع صفحة Auth.tsx ترجمتها وكشف الخطأ التقني
    if (error) throw new Error(error.message);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  const verifyOtp = useCallback(async (email: string, token: string, type: "signup" | "recovery") => {
    const { error } = await supabase.auth.verifyOtp({ email, token, type });
    if (error) throw new Error(error.message);
  }, []);

  const resetPasswordEmail = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw new Error(error.message);
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setProfile(null);
    setLoading(false);
    toast.info("تم تسجيل الخروج بنجاح");
  }, []);

  const value = useMemo(() => ({
    user, session, role, profile, loading,
    signUp, signIn, signOut, verifyOtp,
    resetPasswordEmail, updatePassword,
  }), [
    user?.id,
    session?.access_token,
    role,
    profile?.full_name,
    profile?.is_verified,
    loading,
    signUp, signIn, signOut, verifyOtp, resetPasswordEmail, updatePassword,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// ✅ إضافة دالة تصدير للترجمة لتستخدمها في صفحة Auth.tsx
export const translateError = (msg: string) => getArabicError(msg);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};