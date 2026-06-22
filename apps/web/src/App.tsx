import { RouterProvider } from 'react-router';
import { AppThemeProvider } from './components/AppThemeProvider';
import { AuthProvider } from './components/AuthContext';
import { Toaster } from './components/ui/sonner';
import { router } from './routes';

export default function App() {
  return (
    <AppThemeProvider>
      <AuthProvider>
        <div className="theme-compat min-h-screen bg-background text-foreground">
          <RouterProvider router={router} />
          <Toaster position="bottom-right" richColors closeButton />
        </div>
      </AuthProvider>
    </AppThemeProvider>
  );
}
