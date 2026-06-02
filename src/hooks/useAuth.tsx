import { useState, useEffect, useRef, createContext, useContext, ReactNode, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import i18n from "@/i18n/config";

// Map server error messages to i18n keys
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

  // ref tracks the last userId fetched to prevent duplicate profile queries
  const fetchedForUserId = useRef<string | null>(null);

  const fetchUserData = useCallback(async (userId: string, retryCount = 0) => {
    const maxRetries = 2; 
    const queryTimeout = 10000; 

    console.log(`🔄 Fetching user data for: ${userId} (attempt ${retryCount + 1}/${maxRetries + 1})`);

    try {
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

      if (rolesError) console.error("❌ Roles query error:", rolesError);
      if (profError) console.error("❌ Profile query error:", profError);

      if (roles && roles.length > 0) {
        setRole(roles[0].role as "client" | "provider" | "admin");
        console.log("👤 Role set to:", roles[0].role);
      } else {
        setRole("client");
        console.log("👤 Role defaulted to: client");
      }

      if (prof) {
        setProfile(prof);
        console.log("📋 Profile set:", prof.full_name);
      } else {
        setProfile(null);
        console.log("📋 Profile not found, set to null");
      }

      console.log("🎉 fetchUserData completed successfully");
    } catch (err) {
      console.error(`💥 Error in user queries (attempt ${retryCount + 1}):`, err);

      if (retryCount < maxRetries) {
        console.log(`🔄 Retrying fetchUserData in 1.5 seconds... (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1500)); 
        return fetchUserData(userId, retryCount + 1);
      }

      console.log("❌ All retries failed, using defaults");
      setRole("client");
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    // 🚀 معالجة متزامنة آمنة لأحداث السيرفر تمنع التصادم والـ Race Conditions
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!mounted) return;

      console.log("🔐 Auth Event Hooked:", event);

      // تحديث فوري ومتزامن لبيانات الجلسة لمنع حدوث شاشات بيضاء مفاجئة
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      const uid = currentSession?.user?.id;

      if (event === 'SIGNED_OUT') {
        setRole(null);
        setProfile(null);
        fetchedForUserId.current = null;
        setLoading(false);
        return;
      }

      if (uid) {
        // 🔥 صمام الأمان الحرج: لا تطلب البيانات من قاعدة البيانات إلا إذا كان معرف المستخدم جديداً فعلياً
        // هذا يمنع إعادة الجلب العشوائي المتكرر عند الخروج والرجوع للموقع
        if (fetchedForUserId.current !== uid) {
          fetchedForUserId.current = uid;
          setLoading(true);
          
          fetchUserData(uid).finally(() => {
            if (mounted) setLoading(false);
          });
        } else {
          // إذا كان نفس المستخدم وتغير التوكن فقط بالخلفية، نوقف الـ loading فوراً لتجنب تعليق الـ loader
          setLoading(false);
        }
      } else {
        setRole(null);
        setProfile(null);
        fetchedForUserId.current = null;
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

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

export const translateError = (msg: string) => getArabicError(msg);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};