import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { Products } from '@/pages/Products';
import { Retailers } from '@/pages/Retailers';
import { Purchase } from '@/pages/Purchase';
import { Inventory } from '@/pages/Inventory';
import { Sales } from '@/pages/Sales';
import { Payments } from '@/pages/Payments';
import { Receivables } from '@/pages/Receivables';
import { Expiry } from '@/pages/Expiry';
import { Reports } from '@/pages/Reports';
import { Settings } from '@/pages/Settings';
import { OfflineProvider } from '@/contexts/OfflineContext';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <OfflineProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="products" element={<Products />} />
                <Route path="retailers" element={<Retailers />} />
                <Route path="purchase" element={<Purchase />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="sales" element={<Sales />} />
                <Route path="payments" element={<Payments />} />
                <Route path="receivables" element={<Receivables />} />
                <Route path="expiry" element={<Expiry />} />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Routes>
            <OfflineIndicator />
          </BrowserRouter>
        </OfflineProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
