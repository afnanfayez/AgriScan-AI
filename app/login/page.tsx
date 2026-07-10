'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth-context';
import AuthLayout from '@/components/auth-layout';
import { motion } from 'motion/react';
import { Sprout, AlertTriangle, Loader2, ChevronRight, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);
    const res = await login(email, password);
    if (res.success) {
      router.push('/dashboard');
      router.refresh();
    } else {
      setAuthError(res.error || 'Invalid credentials');
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-1">
            <div className="p-1.5 rounded-lg" style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}>
              <Sprout className="h-4 w-4 text-white" />
            </div>
            <span className="text-xs font-mono font-bold text-emerald-600 uppercase tracking-widest">AgriScan AI</span>
          </div>
          <h2 className="text-3xl font-bold text-stone-900 tracking-tight mt-4">Welcome back</h2>
          <p className="text-sm text-stone-500 mt-1">Sign in to your farm dashboard</p>
        </div>

        {authError && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <span className="text-xs text-red-600">{authError}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Email Address</label>
            <input
              type="email" required value={email}
              onChange={(e) => { setEmail(e.target.value); setAuthError(''); }}
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'} required value={password}
                onChange={(e) => { setPassword(e.target.value); setAuthError(''); }}
                placeholder="••••••••"
                className="w-full px-4 py-3 pr-12 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="mt-1.5 text-right">
              <Link href="/forgot-password" className="text-xs text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer font-medium">
                Forgot password?
              </Link>
            </div>
          </div>

          <button type="submit" disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-60"
            style={{ background: isSubmitting ? '#065f46' : 'linear-gradient(135deg, #059669, #047857)' }}
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><span>Sign In</span><ChevronRight className="h-4 w-4" /></>}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-stone-100 text-center text-xs text-stone-400">
          New to AgriScan?{' '}
          <Link href="/register" className="text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer transition-colors">
            Create farm account →
          </Link>
        </div>
      </motion.div>
    </AuthLayout>
  );
}
