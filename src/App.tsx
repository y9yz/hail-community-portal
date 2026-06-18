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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, 
      retry: 1, 
      staleTime: 5 * 60 * 1000, 
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

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (!allowedRoles.includes(role || '')) {
    return <Navigate to="/permission-denied" replace />;
  }

  return <>{children}</>;
};


const HomeRedirect = () => {
  const { user, role, loading } = useAuth();

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
          
          <div className="min-h-screen flex flex-col bg-background">
            <main className="flex-1">
              
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  
                  <Route path="/" element={<HomeRedirect />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/service/:id" element={<ServiceDetail />} />
                  
                  
                  <Route path="/my-bookings" element={
                    <ProtectedRoute allowedRoles={['client']}>
                      <MyBookings />
                    </ProtectedRoute>
                  } />
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
