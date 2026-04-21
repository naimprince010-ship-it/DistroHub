import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { OfflineProvider } from '@/contexts/OfflineContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { startKeepAlive, stopKeepAlive } from '@/lib/keepAlive';
import { useEffect, lazy, Suspense, type ReactNode } from 'react';

const queryClient = new QueryClient();

const Login = lazy(async () => ({ default: (await import('@/pages/Login')).Login }));
const Dashboard = lazy(async () => ({ default: (await import('@/pages/Dashboard')).Dashboard }));
const Products = lazy(async () => ({ default: (await import('@/pages/Products')).Products }));
const Retailers = lazy(async () => ({ default: (await import('@/pages/Retailers')).Retailers }));
const Purchase = lazy(async () => ({ default: (await import('@/pages/Purchase')).Purchase }));
const Inventory = lazy(async () => ({ default: (await import('@/pages/Inventory')).Inventory }));
const Sales = lazy(async () => ({ default: (await import('@/pages/Sales')).Sales }));
const SalesReturns = lazy(async () => ({ default: (await import('@/pages/SalesReturns')).SalesReturns }));
const RoutesPage = lazy(async () => ({ default: (await import('@/pages/Routes')).Routes }));
const Accountability = lazy(async () => ({ default: (await import('@/pages/Accountability')).Accountability }));
const Payments = lazy(async () => ({ default: (await import('@/pages/Payments')).Payments }));
const Receivables = lazy(async () => ({ default: (await import('@/pages/Receivables')).Receivables }));
const Expiry = lazy(async () => ({ default: (await import('@/pages/Expiry')).Expiry }));
const Reports = lazy(async () => ({ default: (await import('@/pages/Reports')).Reports }));
const StockReconciliation = lazy(async () => ({ default: (await import('@/pages/StockReconciliation')).StockReconciliation }));
const Settings = lazy(async () => ({ default: (await import('@/pages/Settings')).Settings }));
const Categories = lazy(async () => ({ default: (await import('@/pages/Categories')).Categories }));

function RouteFallback() {
  return <div className="py-10 text-center text-sm text-muted-foreground">Loading page…</div>;
}

function lazyPage(page: ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{page}</Suspense>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token')?.trim();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  useEffect(() => {
    startKeepAlive();
    return () => {
      stopKeepAlive();
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <OfflineProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={lazyPage(<Login />)} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <MainLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={lazyPage(<Dashboard />)} />
                  <Route path="dashboard" element={lazyPage(<Dashboard />)} />
                  <Route path="products" element={lazyPage(<Products />)} />
                  <Route path="retailers" element={lazyPage(<Retailers />)} />
                  <Route path="purchase" element={lazyPage(<Purchase />)} />
                  <Route path="inventory" element={lazyPage(<Inventory />)} />
                  <Route path="sales" element={lazyPage(<Sales />)} />
                  <Route path="sales-returns" element={lazyPage(<SalesReturns />)} />
                  <Route path="routes" element={lazyPage(<RoutesPage />)} />
                  <Route path="accountability" element={lazyPage(<Accountability />)} />
                  <Route path="payments" element={lazyPage(<Payments />)} />
                  <Route path="receivables" element={lazyPage(<Receivables />)} />
                  <Route path="expiry" element={lazyPage(<Expiry />)} />
                  <Route path="reports" element={lazyPage(<Reports />)} />
                  <Route path="reports/stock-reconciliation" element={lazyPage(<StockReconciliation />)} />
                  <Route path="settings" element={lazyPage(<Settings />)} />
                  <Route path="categories" element={lazyPage(<Categories />)} />
                </Route>
              </Routes>
              <OfflineIndicator />
            </BrowserRouter>
          </OfflineProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
