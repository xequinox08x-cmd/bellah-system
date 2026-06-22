import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useAuth } from './components/AuthContext';
import Login from './pages/Login';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-[#EC4899] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
}

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Products = lazy(() => import('./pages/Products'));
const Sales = lazy(() => import('./pages/Sales'));
const Customers = lazy(() => import('./pages/Customers'));
const Reports = lazy(() => import('./pages/Reports'));
const Users = lazy(() => import('./pages/Users'));
const Settings = lazy(() => import('./pages/Settings'));

const PageFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-6 h-6 border-2 border-[#EC4899] border-t-transparent rounded-full animate-spin" />
  </div>
);

function lazyPage(element: React.ReactNode) {
  return <Suspense fallback={<PageFallback />}>{element}</Suspense>;
}

export function preloadCriticalPages() {
  void import('./pages/Dashboard');
  void import('./pages/Products');
  void import('./pages/Sales');
}

export const router = createBrowserRouter([
  { path: '/login', Component: Login },
  {
    path: '/',
    element: (
      <RequireAuth>
        <Layout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: lazyPage(<Dashboard />) },
      { path: 'products', element: lazyPage(<Products />) },
      { path: 'sales', element: lazyPage(<Sales />) },
      { path: 'customers', element: lazyPage(<Customers />) },
      { path: 'reports', element: lazyPage(<Reports />) },
      { path: 'users', element: lazyPage(<Users />) },
      { path: 'settings', element: lazyPage(<Settings />) },
      { path: 'admin', element: <Navigate to="/dashboard" replace /> },
      { path: 'admin/dashboard', element: <Navigate to="/dashboard" replace /> },
      { path: 'marketing', element: <Navigate to="/dashboard" replace /> },
      { path: 'approvals', element: <Navigate to="/dashboard" replace /> },
      { path: 'scheduling', element: <Navigate to="/dashboard" replace /> },
      { path: 'campaigns', element: <Navigate to="/dashboard" replace /> },
      { path: 'analytics', element: <Navigate to="/reports" replace /> },
      { path: '*', element: <Navigate to="/dashboard" replace /> },
    ],
  },
]);
