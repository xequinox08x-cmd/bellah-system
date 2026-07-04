import { RouterProvider } from 'react-router';
import { AppThemeProvider } from './components/AppThemeProvider';
import { AuthProvider } from './components/AuthContext';
import { StoreProvider } from './data/store';
import { Toaster } from './components/ui/sonner';
import { router } from './routes';

export default function App() {
  return (
    <AppThemeProvider>
      <AuthProvider>
        <StoreProvider>
          <div className="theme-compat min-h-screen bg-background text-foreground">
            <RouterProvider router={router} />
            <Toaster position="bottom-right" richColors closeButton />
          </div>
        </StoreProvider>
      </AuthProvider>
    </AppThemeProvider>
  );
}
