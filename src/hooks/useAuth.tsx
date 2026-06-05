import { useState, useEffect, useRef, createContext, useContext, ReactNode, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import i18n from "@/i18n/config";

// دالة مساعدة لترجمة أخطاء الخادم (Supabase) إلى رسائل مفهومة للمستخدم باستخدام ملفات الترجمة
const getArabicError = (errorMsg: string) => {
  console.log("Raw Server Error:", errorMsg);
  if (errorMsg.includes("Invalid login credentials")) return i18n.t("errors.invalid_login_credentials");
  if (errorMsg.includes("User already registered")) return i18n.t("errors.user_already_registered");
  if (errorMsg.includes("Password should be at least")) return i18n.t("errors.password_too_short");
  if (errorMsg.includes("Token has expired or is invalid")) return i18n.t("errors.invalid_or_expired_token");
  if (errorMsg.includes("Email not confirmed")) return i18n.t("errors.email_not_confirmed");
  if (errorMsg.includes("rate limit")) return i18n.t("errors.rate_limited");
  return i18n.t("errors.technical_error", { message: errorMsg });
};

// تعريف هيكل البيانات الخاص بسياق المصادقة والذي سيتم مشاركته في أرجاء التطبيق
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
  // تعريف متغيرات الحالة الأساسية لحفظ بيانات الجلسة والمستخدم
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<"client" | "provider" | "admin" | null>(null);
  const [profile, setProfile] = useState<{ full_name: string; phone: string | null; is_verified: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  // استخدام مرجع لتتبع معرف المستخدم الأخير، وذلك لمنع تكرار جلب البيانات من الخادم بلا داعٍ
  const fetchedForUserId = useRef<string | null>(null);

  // دالة لجلب بيانات المستخدم (الصلاحية والملف الشخصي) مع آلية لإعادة المحاولة وتحديد وقت أقصى للاستجابة
  const fetchUserData = useCallback(async (userId: string, retryCount = 0) => {
    const maxRetries = 2; 
    const queryTimeout = 10000; 

    console.log(`Fetching user data for: ${userId} (attempt ${retryCount + 1}/${maxRetries + 1})`);

    try {
      // تنفيذ استعلامات قاعدة البيانات بشكل متوازٍ لتقليل وقت الانتظار
      const rolesPromise = Promise.race([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Roles query timeout")), queryTimeout)
        )
      ]);

      const profilePromise = Promise.race([
        supabase.from("profiles").select("full_name, phone, is_verified").eq("id", userId).single(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Profile query timeout")), queryTimeout)
        )
      ]);

      const queryResults = await Promise.all([
        rolesPromise.catch((err: Error) => ({ data: null, error: err })),
        profilePromise.catch((err: Error) => ({ data: null, error: err }))
      ]);

      const [{ data: roles, error: rolesError }, { data: prof, error: profError }] = queryResults as [
        { data: { role: string }[] | null; error: Error | null },
        { data: { full_name: string; phone: string | null; is_verified: boolean } | null; error: Error | null }
      ];

      // تسجيل الأخطاء إن وجدت، دون إيقاف سير العمل الأساسي
      if (rolesError) console.error("Roles query error:", rolesError);
      if (profError) console.error("Profile query error:", profError);

      // تحديث حالة الصلاحية (Role) أو تعيين القيمة الافتراضية
      if (roles && roles.length > 0) {
        setRole(roles[0].role as "client" | "provider" | "admin");
        console.log("Role set to:", roles[0].role);
      } else {
        setRole("client");
        console.log("Role defaulted to: client");
      }

      // تحديث بيانات الملف الشخصي
      if (prof) {
        setProfile(prof);
        console.log("Profile set:", prof.full_name);
      } else {
        setProfile(null);
        console.log("Profile not found, set to null");
      }

      console.log("fetchUserData completed successfully");
    } catch (err) {
      console.error(`Error in user queries (attempt ${retryCount + 1}):`, err);

      // آلية إعادة المحاولة في حال فشل الاتصال
      if (retryCount < maxRetries) {
        console.log(`Retrying fetchUserData in 1.5 seconds... (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1500)); 
        return fetchUserData(userId, retryCount + 1);
      }

      console.log("All retries failed, using defaults");
      setRole("client");
      setProfile(null);
    }
  }, []);

  // الاستماع لتغيرات حالة المصادقة (تسجيل الدخول، تسجيل الخروج، تجديد الجلسة)
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    // تسجيل مراقب للاستماع لأحداث مصادقة Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!mounted) return;

      console.log("Auth Event Hooked:", event);

      // تحديث متزامن لبيانات الجلسة لمنع حدوث شاشات تحميل غير مبررة
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      const uid = currentSession?.user?.id;

      // تصفير البيانات فوراً في حال تسجيل الخروج
      if (event === 'SIGNED_OUT') {
        setRole(null);
        setProfile(null);
        fetchedForUserId.current = null;
        setLoading(false);
        return;
      }

      if (uid) {
        // آلية لمنع طلب البيانات من الخادم إذا كان معرف المستخدم هو نفسه (مثلا عند تجديد التوكن)
        if (fetchedForUserId.current !== uid) {
          fetchedForUserId.current = uid;
          setLoading(true);
          
          fetchUserData(uid).finally(() => {
            if (mounted) setLoading(false);
          });
        } else {
          // إنهاء حالة التحميل إذا لم يتغير المستخدم
          setLoading(false);
        }
      } else {
        // التعامل مع حالة عدم وجود مستخدم مسجل دخول
        setRole(null);
        setProfile(null);
        fetchedForUserId.current = null;
        setLoading(false);
      }
    });

    // تنظيف المراقب عند إزالة المكون من الواجهة لمنع تسريب الذاكرة
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

  // مجموعة دوال مساعدة مغلفة بـ useCallback لضمان استقرارها وتقليل إعادة التصيير (Re-renders)
  const signUp = useCallback(async (email: string, password: string, fullName: string, phone: string, role: "client" | "provider") => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone, role } },
    });
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
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setRole(null);
      setProfile(null);
      fetchedForUserId.current = null;
      toast.info(i18n.t("auth.logged_out"));
    } finally {
      setLoading(false);
    }
  }, []);

  // حفظ القيم המمررة للسياق في الذاكرة لتجنب إعادة تصيير المكونات المستهلكة بلا حاجة
  const value = useMemo(() => ({
    user, session, role, profile, loading,
    signUp, signIn, signOut, verifyOtp,
    resetPasswordEmail, updatePassword,
  }), [
    user, session, role, profile, loading,
    signUp, signIn, signOut, verifyOtp, resetPasswordEmail, updatePassword,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// تصدير دالة المترجم لتسهيل استخدامها في أجزاء أخرى من التطبيق
export const translateError = (msg: string) => getArabicError(msg);

// خطاف مخصص (Custom Hook) لتسهيل استدعاء سياق المصادقة والتحقق من تغليفه بشكل صحيح
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};