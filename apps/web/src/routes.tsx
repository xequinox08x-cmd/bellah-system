import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { Layout } from './components/Layout';
import { Login } from './components/Login';

// Pages are lazy-loaded so each route is only downloaded when first visited
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

// Shared fallback shown while a page chunk is downloading
const PageFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-6 h-6 border-2 border-[#EC4899] border-t-transparent rounded-full animate-spin" />
  </div>
);

export const router = createBrowserRouter([
  {
    path: '/login',
    Component: Login,
  },
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Suspense fallback={<PageFallback />}><Dashboard /></Suspense> },
      { path: 'products', element: <Suspense fallback={<PageFallback />}><Products /></Suspense> },
      { path: 'sales', element: <Suspense fallback={<PageFallback />}><Sales /></Suspense> },
      { path: 'marketing', element: <Suspense fallback={<PageFallback />}><AIMarketing /></Suspense> },
      { path: 'approvals', element: <Suspense fallback={<PageFallback />}><ContentApproval /></Suspense> },
      { path: 'scheduling', element: <Suspense fallback={<PageFallback />}><Scheduling /></Suspense> },
      { path: 'campaigns', element: <Suspense fallback={<PageFallback />}><Campaigns /></Suspense> },
      { path: 'analytics', element: <Suspense fallback={<PageFallback />}><Analytics /></Suspense> },
      { path: 'users', element: <Suspense fallback={<PageFallback />}><Users /></Suspense> },
      { path: 'settings', element: <Suspense fallback={<PageFallback />}><Settings /></Suspense> },
      { path: '*', element: <Navigate to="/dashboard" replace /> },
    ],
  },
]);
