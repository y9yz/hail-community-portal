import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth"; 
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ServiceDetail from "./pages/ServiceDetail";
import MyBookings from "./pages/MyBookings";
import ProviderDashboard from "./pages/ProviderDashboard";
import EditServicePage from "./pages/EditServicePage";
import AdminDashboard from "./pages/AdminDashboard";
import PermissionDenied from "./pages/PermissionDenied";
import NotFound from "./pages/NotFound";
import SubscriptionPage from "./pages/SubscriptionPage"; 
import SupportTickets from "./pages/SupportTickets"; 
import PaymentPage from "./pages/PaymentPage";
import Footer from "./components/Footer";

/* 
  🚀 التعديل الجوهري هنا: إعداد عميل البيانات للتعامل مع الـ Cache بذكاء 
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

/**
 * حماية المسارات (RBAC)
 * تتحقق من تسجيل الدخول ومن مطابقة صلاحية المستخدم للمسار المطلوب
 */
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const { user, role, loading } = useAuth();

  /* منع التحويل العشوائي قبل اكتمال جلب بيانات المستخدم */
  if (loading) return <div className="flex h-screen items-center justify-center">جاري التحميل...</div>;

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

  if (loading) return null;

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
              <Routes>
                {/* المسارات العامة */}
                <Route path="/" element={<HomeRedirect />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/service/:id" element={<ServiceDetail />} />
                
                {/* مسارات العميل المستفيد */}
                <Route path="/my-bookings" element={<ProtectedRoute allowedRoles={['client']}><MyBookings /></ProtectedRoute>} />
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
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;