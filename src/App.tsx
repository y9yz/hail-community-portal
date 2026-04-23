import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth"; 
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ServiceDetail from "./pages/ServiceDetail";
import Checkout from "./pages/Checkout";
import MyBookings from "./pages/MyBookings";
import ProviderDashboard from "./pages/ProviderDashboard";
import EditServicePage from "./pages/EditServicePage";
import AdminDashboard from "./pages/AdminDashboard";
import PermissionDenied from "./pages/PermissionDenied";
import NotFound from "./pages/NotFound";
import SubscriptionPage from "./pages/SubscriptionPage"; 
import SupportTickets from "./pages/SupportTickets"; 
import PaymentPage from "./pages/PaymentPage"; // استيراد صفحة الدفع

const queryClient = new QueryClient();

// مكون ذكي للتحكم في الدخول بناءً على الدور (RBAC)
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const { user, role, loading } = useAuth();

  if (loading) return <div className="flex h-screen items-center justify-center">جاري التحميل...</div>;

  if (!user) return <Navigate to="/auth" replace />;

  if (!allowedRoles.includes(role || '')) {
    return <Navigate to="/permission-denied" replace />;
  }

  return <>{children}</>;
};

// مكون التوجيه التلقائي للصفحة الرئيسية
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
          <Routes>
            {/* الصفحة الرئيسية: توجيه ذكي بناءً على الدور */}
            <Route path="/" element={<HomeRedirect />} />
            
            <Route path="/auth" element={<Auth />} />
            
            {/* مسارات العميل (Customer) */}
            <Route path="/service/:id" element={<ServiceDetail />} />
            <Route path="/my-bookings" element={<ProtectedRoute allowedRoles={['client']}><MyBookings /></ProtectedRoute>} />
            <Route path="/support" element={<SupportTickets />} />

            {/* مسارات مقدم الخدمة (Provider) */}
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
            {/* مسار صفحة الدفع الجديد */}
            <Route path="/payment" element={
              <ProtectedRoute allowedRoles={['provider']}>
                <PaymentPage />
              </ProtectedRoute>
            } />

            {/* مسارات المسؤول (Admin) */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />

            {/* مسارات عامة */}
            <Route path="/permission-denied" element={<PermissionDenied />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;