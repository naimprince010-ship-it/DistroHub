import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Shield, Truck, BarChart3 } from 'lucide-react';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/api/auth/login', { email, password });
      const { access_token, user } = response.data;
      localStorage.setItem('token', String(access_token).trim());
      localStorage.setItem('user', JSON.stringify(user));
      navigate('/');
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { detail?: string | string[] } };
        code?: string;
        message?: string;
        isNetworkError?: boolean;
        isTimeout?: boolean;
      };
      if (e?.code === 'ERR_NETWORK' || e?.isNetworkError || e?.message?.includes?.('Network Error')) {
        setError(
          'Cannot reach the API server. Start the backend on the same URL as VITE_API_URL (default: http://localhost:8001), then try again.'
        );
      } else if (e?.code === 'ECONNABORTED' || e?.isTimeout) {
        setError('Request timed out. If the backend was sleeping, wait a few seconds and try again.');
      } else {
        const detail = e.response?.data?.detail;
        const msg =
          typeof detail === 'string'
            ? detail
            : Array.isArray(detail)
              ? detail
                  .map((d) =>
                    typeof d === 'object' && d && 'msg' in d ? String((d as { msg: string }).msg) : String(d)
                  )
                  .join(' ')
              : null;
        setError(msg || 'Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel — hero / branding */}
      <div
        className="hidden lg:flex lg:w-[55%] relative overflow-hidden"
        style={{
          backgroundImage: 'url(/login-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/85 via-slate-900/65 to-[hsl(var(--primary))]/40" />

        <div className="relative z-10 flex flex-col justify-between w-full p-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-[hsl(var(--primary))] rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-sm font-bold text-white tracking-tight">DH</span>
            </div>
            <div>
              <span className="text-xl font-bold text-white tracking-tight">DistroHub</span>
              <span className="ml-2 text-[10px] font-semibold uppercase tracking-widest text-white/50">
                FMCG · SaaS
              </span>
            </div>
          </div>

          {/* Hero text */}
          <div className="max-w-lg">
            <h1 className="text-5xl font-extrabold text-white leading-tight mb-6">
              Streamline Your
              <span className="block text-[hsl(var(--primary))]">Distribution</span>
              <span className="block">Management</span>
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed mb-10">
              The all-in-one platform for managing your supply chain, tracking deliveries, and optimizing
              your distribution network with real-time analytics.
            </p>

            <div className="space-y-4">
              {[
                { icon: Truck, title: 'Real-time Tracking', desc: 'Monitor deliveries across all routes' },
                { icon: BarChart3, title: 'Advanced Analytics', desc: 'Data-driven insights for your business' },
                { icon: Shield, title: 'Secure & Reliable', desc: 'Enterprise-grade security for your data' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10 shrink-0">
                    <Icon className="w-5 h-5 text-[hsl(var(--primary))]" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{title}</p>
                    <p className="text-slate-400 text-xs">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} DistroHub. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Panel — login form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center bg-background relative overflow-y-auto">
        {/* Subtle pattern */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="w-full max-w-lg px-6 py-10 relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 bg-[hsl(var(--primary))] rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
              <span className="text-lg font-bold text-white">DH</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">DistroHub</h1>
            <p className="text-muted-foreground text-sm mt-1">Distribution Management System</p>
          </div>

          {/* Card wrapper */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
              <p className="text-muted-foreground mt-1 text-sm">Enter your credentials to access your account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="h-11 w-full text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="h-11 w-full text-sm pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 font-semibold gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Demo credentials */}
            <div className="mt-6 p-3.5 bg-muted/60 border border-dashed border-border rounded-lg">
              <p className="text-xs text-muted-foreground text-center">
                <span className="font-semibold text-foreground">Demo Credentials</span>
                <br />
                <span className="font-mono text-[hsl(var(--primary))] mt-1 inline-block">
                  admin@distrohub.com / admin123
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
