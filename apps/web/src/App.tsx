import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './components/AuthContext';


import { StoreProvider } from './data/store';
import { Toaster } from './components/ui/sonner';
import { router } from './routes';

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors />
      </StoreProvider>
    </AuthProvider>
  );
}
