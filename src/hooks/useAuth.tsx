import { useState, useEffect, useRef, createContext, useContext, ReactNode, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { toast } from "sonner";

// دالة ترجمة الأخطاء
const getArabicError = (errorMsg: string) => {
  console.log("Raw Server Error:", errorMsg);
  if (errorMsg.includes("Invalid login credentials")) return "بيانات الدخول غير صحيحة، يرجى التأكد والمحاولة مجدداً.";
  if (errorMsg.includes("User already registered")) return "هذا البريد الإلكتروني مسجل مسبقاً لدينا.";
  if (errorMsg.includes("Password should be at least")) return "يجب أن تكون كلمة المرور مكونة من 6 رموز على الأقل.";
  if (errorMsg.includes("Token has expired or is invalid")) return "رمز التحقق غير صحيح أو قد انتهت صلاحيته.";
  if (errorMsg.includes("Email not confirmed")) return "يرجى تفعيل الحساب عبر بريدك الإلكتروني أولاً.";
  if (errorMsg.includes("rate limit")) return "لقد تجاوزت الحد المسموح، يرجى الانتظار قليلاً قبل المحاولة مجدداً.";
  return `خطأ تقني: ${errorMsg}`;
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

  // ✅ ref يتتبع آخر userId تم جلب بياناته — لا يتأثر بـ stale closure
  const fetchedForUserId = useRef<string | null>(null);

  const fetchUserData = useCallback(async (userId: string, retryCount = 0) => {
    const maxRetries = 3; // Increased retries
    const queryTimeout = 15000; // Reduced to 15 seconds for faster retries

    console.log(`🔄 Fetching user data for: ${userId} (attempt ${retryCount + 1}/${maxRetries + 1})`);

    // Test basic Supabase connectivity (non-blocking)
    console.log("🔍 Testing Supabase connectivity...");
    const connectivityTest = Promise.race([
      supabase.from("profiles").select("count").limit(1),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Connectivity test timeout")), 3000) // Reduced to 3 seconds
      )
    ]).catch(err => {
      console.warn("⚠️ Supabase connectivity test failed:", err.message);
      return { error: err };
    });

    type ConnectivityResult = { data?: unknown[]; error?: Error | null } | { error: Error };

    const testResult = await connectivityTest as ConnectivityResult;
    if (testResult && 'error' in testResult && !testResult.error) {
      console.log("✅ Supabase connectivity test passed");
    } else {
      console.log("⚠️ Supabase connectivity uncertain, proceeding with queries");
    }

    // Try user queries with timeout and retry logic
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

      console.log("📊 Query results:", {
        roles: roles ? "success" : "failed",
        profile: prof ? "success" : "failed",
        rolesError: rolesError?.message,
        profError: profError?.message
      });

      if (rolesError) {
        console.error("❌ Roles query error:", rolesError);
      }
      if (profError) {
        console.error("❌ Profile query error:", profError);
      }

      console.log("✅ User data fetched:", { roles: roles?.length, profile: !!prof });

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

      // Retry logic for any error (including timeouts)
      if (retryCount < maxRetries) {
        console.log(`🔄 Retrying fetchUserData in 2 seconds... (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Increased delay
        return fetchUserData(userId, retryCount + 1);
      }

      // After all retries failed, use defaults
      console.log("❌ All retries failed, using defaults");
      setRole("client");
      setProfile(null);
      console.log("🎉 fetchUserData completed with defaults after all retries");
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    // ✅ Safety timeout: Ensure loading is set to false within 90 seconds (15s query + 3 retries + delays + buffer)
    const startTimeout = () => {
      timeoutId = setTimeout(() => {
        if (mounted) {
          console.warn("Auth init timeout - forcing loading to false");
          setLoading(false);
        }
      }, 90000);
    };

    const clearTimeout = () => {
      if (timeoutId) {
        globalThis.clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    startTimeout();

    // ✅ Single source of truth: onAuthStateChange handles EVERYTHING
    // INITIAL_SESSION fires on startup automatically from Supabase — no need for separate getSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;

      console.log("Auth Event:", event);

      // ✅ TOKEN_REFRESHED: Just update session, no DB queries needed
      if (event === 'TOKEN_REFRESHED') {
        console.log("🔑 TOKEN_REFRESHED event fired");
        setSession(currentSession);
        console.log("✅ TOKEN_REFRESHED processing complete");
        return;
      }

      // ✅ INITIAL_SESSION: Fires on startup with the user session
      if (event === 'INITIAL_SESSION') {
        console.log("🚀 INITIAL_SESSION event fired");
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          const uid = currentSession.user.id;
          console.log("👤 Initial user ID:", uid);

          // 🚨 TEMPORARY: Skip fetching user data on initial session to start signed out
          console.log("⏭️ Skipping initial user data fetch - starting signed out");
          setRole(null);
          setProfile(null);
          fetchedForUserId.current = null;

          // Optionally sign out to clear the session
          // await supabase.auth.signOut();
        } else {
          console.log("👤 No user in initial session");
        }

        console.log("✅ INITIAL_SESSION processing complete, setting loading to false");
        clearTimeout();
        setLoading(false);
        return;
      }

      // ✅ SIGNED_IN: Only process if this is a new user to prevent duplicate processing
      if (event === 'SIGNED_IN') {
        console.log("🔐 SIGNED_IN event fired");
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        const uid = currentSession?.user?.id;
        console.log("👤 User ID:", uid);

        if (uid && fetchedForUserId.current !== uid) {
          console.log("📡 Fetching user data (first time for this user)");
          fetchedForUserId.current = uid;
          await fetchUserData(uid);
        } else {
          console.log("⏭️ Skipping fetchUserData (already fetched or no user)");
        }

        console.log("✅ SIGNED_IN processing complete, setting loading to false");
        clearTimeout();
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_OUT') {
        console.log("🚪 SIGNED_OUT event fired");
        setSession(null);
        setUser(null);
        setRole(null);
        setProfile(null);
        fetchedForUserId.current = null; // ✅ إعادة تعيين عند تسجيل الخروج
        console.log("✅ SIGNED_OUT processing complete, user cleared");
        clearTimeout();
        setLoading(false);
        return;
      }

      if (event === 'USER_UPDATED') {
        console.log("🔄 USER_UPDATED event fired");
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          console.log("✅ USER_UPDATED processing complete");
        } else {
          console.log("❌ USER_UPDATED with no session");
          clearTimeout();
          setLoading(false);
        }
        return;
      }

      if (event === 'PASSWORD_RECOVERY') {
        console.log("🔒 PASSWORD_RECOVERY event fired");
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        console.log("✅ PASSWORD_RECOVERY processing complete, setting loading to false");
        clearTimeout();
        setLoading(false);
        return;
      }
    });

    return () => {
      mounted = false;
      clearTimeout();
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
      toast.info("تم تسجيل الخروج بنجاح");
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo(() => ({
    user, session, role, profile, loading,
    signUp, signIn, signOut, verifyOtp,
    resetPasswordEmail, updatePassword,
  }), [
    user,
    session,
    role,
    profile,
    loading,
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