/* استيراد مكونات واجهة المستخدم (UI) الأساسية:
  - Toaster / Sonner: لعرض الإشعارات المنبثقة للمستخدم (مثل: "تم الحفظ بنجاح").
  - TooltipProvider: المزود الأساسي للنصوص المساعدة التي تظهر عند التمرير (Hover) فوق العناصر.
*/
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

/* إدارة حالة البيانات القادمة من الخوادم (Server State Management) */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/* أدوات التوجيه والتنقل بين صفحات الموقع (Routing) */
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

/* مزود حالة المصادقة (لإدارة جلسات الدخول والخروج) */
import { AuthProvider, useAuth } from "@/hooks/useAuth"; 

/* استيراد دوال التحميل الكسول (Lazy Loading):
  يُستخدم لتقسيم الكود (Code Splitting) بحيث لا يتم تحميل مكونات الصفحة إلا عند طلبها الفعلي، 
  مما يقلل من حجم التحميل الأولي (Initial Load) ويسرع ظهور الموقع.
*/
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

/* 🚀 إعداد عميل البيانات (Query Client) للتعامل مع الذاكرة المخبئية (Cache) بذكاء
  هذه الإعدادات تحسن تجربة المستخدم (UX) وتمنع استهلاك موارد السيرفر بلا داعٍ.
*/
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, /* يمنع إعادة جلب البيانات تلقائياً بمجرد عودة المستخدم لتبويب المتصفح، لتفادي التهنيق */
      retry: 1, /* في حال فشل الاتصال (مثلاً ضعف الإنترنت)، حاول مرة واحدة فقط لتجنب طلبات الشبكة اللانهائية */
      staleTime: 5 * 60 * 1000, /* يعتبر البيانات المعروضة "طازجة" لمدة 5 دقائق، فلن يجلبها من السيرفر مجدداً خلال هذه الفترة */
    },
  },
});

/*
  هيكل التحميل النابض (Skeleton Loader)
  يظهر كعناصر مطفية ومتحركة (Animate Pulse) كبديل بصري مريح للمستخدم أثناء انتظار تحميل الصفحات الكسولة.
  هذا الأسلوب أفضل بكثير من عرض "شاشة بيضاء فارغة" أو علامة تحميل تقليدية.
*/
const PageLoader = () => (
  <div className="min-h-[60vh] p-6 md:p-8 animate-pulse bg-slate-50 dark:bg-slate-950">
    {/* تم تصميم العناصر لتدعم الوضع الليلي (Dark Mode) تلقائياً عبر أصناف التيلويند (dark:...) */}
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

/*
 * مكون الحماية الجدارية للمسارات (Protected Route - RBAC)
 * يغلف الصفحات الحساسة ولا يسمح بعرضها إلا إذا كان المستخدم مسجلاً ويمتلك الصلاحية (الدور) المناسبة.
 */
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const { user, role, loading } = useAuth();

  /* إيقاف التوجيه العشوائي: طالما أن بيانات تسجيل الدخول لا تزال قيد التحقق، 
    نعرض "الهيكل النابض" للحفاظ على استقرار واجهة المستخدم ومنع الوميض (Flickering).
  */
  if (loading) {
    return <PageLoader />;
  }

  /* توجيه الزوار غير المسجلين قسراً إلى صفحة تسجيل الدخول، مع استبدال تاريخ التصفح لمنع الرجوع بالخطأ */
  if (!user) return <Navigate to="/auth" replace />;

  /* فحص الصلاحيات (Authorization): إذا كان دور المستخدم غير مدرج ضمن الأدوار المسموح بها، يوجه لصفحة الرفض */
  if (!allowedRoles.includes(role || '')) {
    return <Navigate to="/permission-denied" replace />;
  }

  /* السماح بالمرور وعرض الصفحة المطلوبة */
  return <>{children}</>;
};

/*
 * مكون التوجيه الذكي للصفحة الرئيسية
 * يعمل كموزع مرور: يستقبل المستخدم عند الدخول للموقع ويوجهه للوحة التحكم التي تناسبه.
 */
const HomeRedirect = () => {
  const { user, role, loading } = useAuth();

  /* ✅ منع إرجاع شاشة بيضاء (null) أثناء فحص حالة المستخدم واستبدالها بحالة التحميل المرئية */
  if (loading) {
    return <PageLoader />;
  }

  /* توجيه ذكي للمستخدمين المسجلين: الإدارة لمسار الإدارة، ومقدمو الخدمة لمسارهم */
  if (user) {
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'provider') return <Navigate to="/provider" replace />;
  }

  /* للعملاء العاديين والزوار، اعرض الصفحة الرئيسية الافتراضية للموقع */
  return <Index />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider> {/* تفعيل دعم النصوص التوضيحية عند التمرير (Hover) في كامل التطبيق */}
      <AuthProvider> {/* تزويد التطبيق بحالة تسجيل دخول المستخدم ليتم استهلاكها في أي مكان */}
        <Toaster /> {/* تفعيل إشعارات النظام الأساسية */}
        <Sonner /> {/* تفعيل إشعارات Sonner المتقدمة للعمليات الناجحة/الفاشلة */}
        <BrowserRouter>
          {/* حاوية تخطيط مرنة (Flex Layout):
            تمتد بطول الشاشة بالكامل (min-h-screen). الـ flex-1 في العنصر main تدفع الفوتر للأسفل دوماً، 
            مما يمنع مشكلة "الفوتر الطافي" إذا كان محتوى الصفحة قصيراً.
          */}
          <div className="min-h-screen flex flex-col bg-background">
            <main className="flex-1">
              {/* الـ Suspense يعمل كشبكة أمان للتحميل الكسول (Lazy Loading).
                بينما يقوم المتصفح بتحميل ملفات الـ Javascript الخاصة بالصفحة الجديدة، نعرض الهيكل النابض.
              */}
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* --- المسارات العامة (متاحة للجميع) --- */}
                  <Route path="/" element={<HomeRedirect />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/service/:id" element={<ServiceDetail />} />
                  
                  {/* --- مسارات العميل المستفيد (تتطلب دخول بصلاحية عميل) --- */}
                  <Route path="/my-bookings" element={
                    <ProtectedRoute allowedRoles={['client']}>
                      <MyBookings />
                    </ProtectedRoute>
                  } />
                  <Route path="/support" element={<SupportTickets />} /> {/* مسار الدعم متاح للمسجلين عامة أو للجميع حسب اللوجيك لديك */}

                  {/* --- مسارات مقدم الخدمة (لوحة التحكم، وتعديل الخدمات، والاشتراكات المادية) --- */}
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

                  {/* --- مسارات الإدارة العليا (صلاحية المشرفين فقط) --- */}
                  <Route path="/admin" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  } />

                  {/* --- صفحات الأخطاء وتوجيهات النظام الثابتة --- */}
                  <Route path="/permission-denied" element={<PermissionDenied />} /> {/* صفحة 403 - وصول مرفوض */}
                  <Route path="*" element={<NotFound />} /> {/* صفحة 404 - أي مسار غير موجود يوجه هنا */}
                </Routes>
              </Suspense>
            </main>
            {/* يبقى الفوتر ثابتاً في نهاية الصفحة بسبب إعدادات الـ flex العلوية */}
            <Footer />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;