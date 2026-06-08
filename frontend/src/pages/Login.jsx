import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Lock, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { LOGIN } from '@/constants/testIds';
import { toast } from 'sonner';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const next = params.get('next') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => { document.title = 'Sign In | Abundant Merchandise'; }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name || user.email}`);
      navigate(user.role === 'admin' && next === '/' ? '/admin' : next, { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Unable to sign in. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16 bg-ink-50">
      <div className="w-full max-w-md">
        <div className="bg-white border border-ink-200 rounded-xl shadow-sm p-8">
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-ink-900">Welcome back</h1>
          <p className="text-sm text-ink-500 mt-1">Sign in to continue shopping.</p>

          {error && (
            <div className="mt-5 flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={1.75} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-ink-700 uppercase tracking-wider">Email</span>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" strokeWidth={1.75} />
                <input
                  data-testid={LOGIN.emailInput}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 pl-9 pr-3 text-sm bg-white border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  placeholder="you@example.com"
                />
              </div>
            </label>

            <label className="block">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-700 uppercase tracking-wider">Password</span>
                <Link data-testid={LOGIN.forgotPasswordLink} to="/forgot-password" className="text-xs text-brand hover:text-brand-600">Forgot?</Link>
              </div>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" strokeWidth={1.75} />
                <input
                  data-testid={LOGIN.passwordInput}
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-9 pr-3 text-sm bg-white border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  placeholder="••••••••"
                />
              </div>
            </label>

            <button
              data-testid={LOGIN.submitButton}
              type="submit"
              disabled={submitting}
              className="w-full h-11 bg-brand hover:bg-brand-600 disabled:bg-ink-300 disabled:cursor-not-allowed text-white font-semibold rounded-md transition-colors"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-ink-500">
            New to Abundant?{' '}
            <Link data-testid={LOGIN.registerLink} to={`/register${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-brand hover:text-brand-600">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
