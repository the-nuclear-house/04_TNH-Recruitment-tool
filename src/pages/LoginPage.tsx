import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/lib/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui';
import { Mail, Lock, AlertCircle } from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const { checkAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setIsLoading(false);
        return;
      }

      if (data.user) {
        // Check auth will fetch/create the user profile
        await checkAuth();
        navigate('/');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-slate-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-cyan/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-brand-green/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.svg" alt="The Nuclear House" className="h-20 w-20 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Control Room</h1>
          <p className="text-brand-grey-400">
            The Nuclear House Command Centre
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-strong p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-brand-slate-900 mb-2">
              Sign In
            </h2>
            <p className="text-brand-grey-400">
              Enter your credentials to continue
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-slate-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-brand-grey-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-brand-grey-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-brand-grey-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-brand-grey-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="accent"
              className="w-full"
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </form>

          {/* Test Credentials Info */}
          <div className="mt-6 p-4 bg-brand-grey-100 rounded-lg">
            <p className="text-sm text-brand-slate-700 font-medium mb-2">
              Test Credentials:
            </p>
            <div className="text-sm text-brand-grey-400 space-y-1">
              <p><strong>Email:</strong> director@recruithub.com</p>
              <p><strong>Password:</strong> TestPassword123!</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-brand-grey-400">
          © 2025 The Nuclear House. All rights reserved.
        </p>
      </div>
    </div>
  );
}
