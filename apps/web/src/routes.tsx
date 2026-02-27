import { createBrowserRouter, Navigate } from 'react-router';
import { Layout }          from './components/Layout';
import { Login }           from './components/Login';
import Dashboard           from './pages/Dashboard';
import Products            from './pages/Products';
import Sales               from './pages/Sales';
import AIMarketing         from './pages/AIMarketing';
import ContentApproval     from './pages/ContentApproval';
import Scheduling          from './pages/Scheduling';
import Analytics           from './pages/Analytics';
import Settings            from './pages/Settings';
import Users               from './pages/Users';

export const router = createBrowserRouter([
  {
    path: '/login',
    Component: Login,
  },
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true,             element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard',       Component: Dashboard       },
      { path: 'products',        Component: Products        },
      { path: 'sales',           Component: Sales           },
      { path: 'marketing',       Component: AIMarketing     },
      { path: 'approvals',       Component: ContentApproval },
      { path: 'scheduling',      Component: Scheduling      },
      { path: 'analytics',       Component: Analytics       },
      { path: 'users',           Component: Users           },
      { path: 'settings',        Component: Settings        },
      { path: '*',               element: <Navigate to="/dashboard" replace /> },
    ],
  },
]);
