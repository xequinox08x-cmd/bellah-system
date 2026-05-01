import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useAuth } from './components/AuthContext';

// Lazy-loaded pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Products = lazy(() => import('./pages/Products'));
const Sales = lazy(() => import('./pages/Sales'));
const AIMarketing = lazy(() => import('./pages/AIMarketing'));
const ContentApproval = lazy(() => import('./pages/ContentApproval'));
const Scheduling = lazy(() => import('./pages/Scheduling'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Settings = lazy(() => import('./pages/Settings'));
const Users = lazy(() => import('./pages/Users'));
const Campaigns = lazy(() => import('./pages/Campaigns'));
const Login = lazy(() => import('./pages/Login'));

// Loading spinner
const PageFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-6 h-6 border-2 border-[#EC4899] border-t-transparent rounded-full animate-spin" />
  </div>
);

// Auth guard — redirects to /login if not logged in, renders Layout + Outlet if ok
function ProtectedLayout() {
  const { user, loading } = useAuth();

  if (loading) return <PageFallback />;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout />;
}

// Admin guard — redirects staff away from admin-only pages
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <PageFallback />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <Suspense fallback={<PageFallback />}>
        <Login />
      </Suspense>
    ),
  },
  {
    path: '/',
    element: <ProtectedLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Suspense fallback={<PageFallback />}><Dashboard /></Suspense> },
      { path: 'products', element: <Suspense fallback={<PageFallback />}><Products /></Suspense> },
      { path: 'sales', element: <Suspense fallback={<PageFallback />}><Sales /></Suspense> },
      { path: 'marketing', element: <Suspense fallback={<PageFallback />}><AIMarketing /></Suspense> },
      { path: 'approvals', element: <AdminRoute><Suspense fallback={<PageFallback />}><ContentApproval /></Suspense></AdminRoute> },
      { path: 'scheduling', element: <Suspense fallback={<PageFallback />}><Scheduling /></Suspense> },
      { path: 'campaigns', element: <Suspense fallback={<PageFallback />}><Campaigns /></Suspense> },
      { path: 'analytics', element: <Suspense fallback={<PageFallback />}><Analytics /></Suspense> },
      { path: 'settings', element: <Suspense fallback={<PageFallback />}><Settings /></Suspense> },

      // Admin only
      { path: 'users', element: <AdminRoute><Suspense fallback={<PageFallback />}><Users /></Suspense></AdminRoute> },

      { path: '*', element: <Navigate to="/dashboard" replace /> },
    ],
  },
]);