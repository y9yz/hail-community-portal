import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth"; 
import { lazy, Suspense } from "react";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const ServiceDetail = lazy(() => import("./pages/ServiceDetail"));
const MyBookings = lazy(() => import("./pages/MyBookings"));
const ProviderDashboard = lazy(() => import("./pages/ProviderDashboard"));
const EditServicePage = lazy(() => import("./pages/EditServicePage"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const PermissionDenied = lazy(() => import("./pages/PermissionDenied"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SubscriptionPage = lazy(() => import("./pages/SubscriptionPage"));
const SupportTickets = lazy(() => import("./pages/SupportTickets"));
const PaymentPage = lazy(() => import("./pages/PaymentPage"));
import Footer from "./components/Footer";

/* 🚀 إعداد عميل البيانات للتعامل مع الـ Cache بذكاء 
  هذا التعديل يمنع التهنيق عند العودة للتبويب ويجعل الموقع فائق السرعة
*/
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // يمنع إعادة جلب البيانات دفعة واحدة عند الرجوع للتبويب
      retry: 1, // يحاول مرة واحدة فقط في حال فشل الاتصال بدلاً من المحاولات اللانهائية
      staleTime: 5 * 60 * 1000, // يعتبر البيانات "طازجة" لمدة 5 دقائق، مما يقلل التحميل على السيرفر
    },
  },
});

const PageLoader = () => (
  <div className="min-h-[60vh] p-6 md:p-8 animate-pulse bg-slate-50 dark:bg-slate-950">
    <div className="mb-6 h-14 rounded-[28px] bg-slate-200/80 dark:bg-slate-800" />
    <div className="grid gap-4 lg:grid-cols-3 mb-6">
      <div className="h-40 rounded-3xl bg-slate-200/70 dark:bg-slate-800" />
      <div className="h-40 rounded-3xl bg-slate-200/70 dark:bg-slate-800" />
      <div className="h-40 rounded-3xl bg-slate-200/70 dark:bg-slate-800" />
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="h-28 rounded-3xl bg-slate-200/70 dark:bg-slate-800" />
      <div className="h-28 rounded-3xl bg-slate-200/70 dark:bg-slate-800" />
    </div>
  </div>
);

/**
 * حماية المسارات (RBAC)
 * تتحقق من تسجيل الدخول ومن مطابقة صلاحية المستخدم للمسار المطلوب
 */
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const { user, role, loading } = useAuth();

  /* منع التحويل العشوائي قبل اكتمال جلب بيانات المستخدم */
  if (loading) {
    return <PageLoader />;
  }

  /* توجيه غير المسجلين لصفحة الدخول */
  if (!user) return <Navigate to="/auth" replace />;

  /* فحص الصلاحية؛ إذا لم تتطابق يوجه لصفحة المنع */
  if (!allowedRoles.includes(role || '')) {
    return <Navigate to="/permission-denied" replace />;
  }

  return <>{children}</>;
};

/**
 * تحويل الصفحة الرئيسية
 * يوجه الأدمن ومزود الخدمة لصفحات التحكم الخاصة بهم تلقائياً
 */
const HomeRedirect = () => {
  const { user, role, loading } = useAuth();

  /* ✅ التعديل هنا: منعنا إرجاع null واستبدلناه بحالة تحميل حتى لا تظهر شاشة بيضاء مقطوعة */
  if (loading) {
    return <PageLoader />;
  }

  if (user) {
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'provider') return <Navigate to="/provider" replace />;
  }

  return <Index />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          {/* حاوية flex لضمان بقاء الفوتر في الأسفل دوماً */}
          <div className="min-h-screen flex flex-col bg-background">
            <main className="flex-1">
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* المسارات العامة */}
                  <Route path="/" element={<HomeRedirect />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/service/:id" element={<ServiceDetail />} />
                  
                  {/* مسارات العميل المستفيد */}
                  <Route path="/my-bookings" element={
                    <ProtectedRoute allowedRoles={['client']}>
                      <MyBookings />
                    </ProtectedRoute>
                  } />
                  <Route path="/support" element={<SupportTickets />} />

                  {/* مسارات مقدم الخدمة - تتطلب اشتراك وتحقق */}
                  <Route path="/provider" element={
                    <ProtectedRoute allowedRoles={['provider']}>
                      <ProviderDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/provider/service/:id" element={
                    <ProtectedRoute allowedRoles={['provider']}>
                      <EditServicePage />
                    </ProtectedRoute>
                  } />
                  <Route path="/subscription" element={
                    <ProtectedRoute allowedRoles={['provider']}>
                      <SubscriptionPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/payment" element={
                    <ProtectedRoute allowedRoles={['provider']}>
                      <PaymentPage />
                    </ProtectedRoute>
                  } />

                  {/* مسار الإدارة والمشرفين */}
                  <Route path="/admin" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  } />

                  {/* صفحات الخطأ والمنع */}
                  <Route path="/permission-denied" element={<PermissionDenied />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;