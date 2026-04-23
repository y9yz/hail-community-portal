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
import Footer from "./components/Footer"; // 👈 استيراد الـ Footer الجديد

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center">جاري التحميل...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!allowedRoles.includes(role || '')) return <Navigate to="/permission-denied" replace />;
  return <>{children}</>;
};

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
          {/* أضفنا هذا الـ Div لضمان دفع الـ Footer لأسفل الصفحة دائماً */}
          <div className="min-h-screen flex flex-col bg-background">
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomeRedirect />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/service/:id" element={<ServiceDetail />} />
                <Route path="/my-bookings" element={<ProtectedRoute allowedRoles={['client']}><MyBookings /></ProtectedRoute>} />
                <Route path="/support" element={<SupportTickets />} />

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

                <Route path="/admin" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } />

                <Route path="/permission-denied" element={<PermissionDenied />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            {/* 👈 الـ Footer يظهر هنا في جميع الصفحات */}
            <Footer />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;