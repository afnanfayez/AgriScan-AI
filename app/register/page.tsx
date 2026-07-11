'use client';

import React, { Suspense, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth-context';
import AuthLayout from '@/components/auth-layout';
import type { AccountType } from '@/types/domain';
import { motion } from 'motion/react';
import {
  Sprout,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Eye,
  EyeOff,
  Mail,
  ShieldCheck,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signup, verifyEmail, resendVerificationCode } = useAuth();

  const step = searchParams.get('step') === 'verify' ? 'verify' : 'form';
  const emailFromUrl = searchParams.get('email') || '';

  const [name, setName] = useState('');
  const [email, setEmail] = useState(emailFromUrl);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>('Gardener');
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendCooldown, setResendCooldown] = useState(0);

  const pwChecks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const pwStrength = Object.values(pwChecks).filter(Boolean).length;

  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;
    const next = [...otpDigits];
    next[index] = value;
    setOtpDigits(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtpDigits(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwChecks.length) {
      setAuthError('Password must be at least 8 characters.');
      return;
    }
    setAuthError('');
    setIsSubmitting(true);
    const res = await signup(email, password, name, accountType);
    setIsSubmitting(false);
    if (res.success) {
      setOtpDigits(['', '', '', '', '', '']);
      setResendCooldown(60);
      router.push(`/register?step=verify&email=${encodeURIComponent(email)}`);
    } else {
      setAuthError(res.error || 'Signup failed');
    }
  };

  const handleVerifyOtp = async () => {
    const code = otpDigits.join('');
    if (code.length < 6) { setAuthError('Please enter all 6 digits.'); return; }
    setAuthError('');
    setIsSubmitting(true);
    const res = await verifyEmail(code, emailFromUrl || email);
    if (res.success) {
      router.push('/dashboard');
      router.refresh();
    } else {
      setAuthError(res.error || 'Invalid code. Please try again.');
      setOtpDigits(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setAuthError('');
    const res = await resendVerificationCode(emailFromUrl || email);
    if (res.success) {
      setResendCooldown(60);
      setOtpDigits(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } else {
      setAuthError(res.error || 'Failed to resend code.');
    }
  };

  if (step === 'verify') {
    return (
      <AuthLayout>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 rounded-2xl" style={{ background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.2)' }}>
              <Mail className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900 dark:text-slate-50 tracking-tight">Check your inbox</h2>
              <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">Enter the 6-digit code sent to <strong className="text-stone-900 dark:text-slate-200">{emailFromUrl}</strong></p>
            </div>
          </div>

          {authError && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
              <span className="text-xs text-red-600 dark:text-red-400">{authError}</span>
            </motion.div>
          )}

          <div className="mb-6">
            <label className="block text-xs font-semibold text-stone-500 dark:text-slate-400 tracking-wider mb-3 text-center uppercase">6-digit verification code</label>
            <div className="flex items-center justify-center space-x-2">
              {otpDigits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  onPaste={handleOtpPaste}
                  className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${d ? 'bg-emerald-50 border-emerald-600 text-emerald-950 dark:bg-emerald-950/30 dark:border-emerald-500 dark:text-emerald-100' : 'bg-stone-50 border-stone-200 text-stone-900 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100'}`}
                />
              ))}
            </div>
          </div>

          <button
            onClick={handleVerifyOtp}
            disabled={isSubmitting || otpDigits.join('').length < 6}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><ShieldCheck className="h-4 w-4" /><span>Verify & Enter Dashboard</span></>}
          </button>

          <div className="mt-5 flex items-center justify-between text-xs">
            <button onClick={() => router.push('/register')} className="flex items-center space-x-1 text-stone-400 hover:text-stone-600 dark:text-slate-500 dark:hover:text-slate-350 cursor-pointer transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>
            <button
              onClick={handleResendOtp}
              disabled={resendCooldown > 0}
              className={`flex items-center space-x-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed ${resendCooldown > 0 ? 'text-stone-400 dark:text-slate-600' : 'text-emerald-600 dark:text-emerald-400'}`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${resendCooldown > 0 ? '' : 'hover:rotate-180 transition-transform duration-500'}`} />
              <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}</span>
            </button>
          </div>
        </motion.div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-1">
            <div className="p-1.5 rounded-lg" style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}>
              <Sprout className="h-4 w-4 text-white" />
            </div>
            <span className="text-xs font-mono font-bold text-emerald-600 uppercase tracking-widest">AgriScan AI</span>
          </div>
          <h2 className="text-3xl font-bold text-stone-900 dark:text-slate-50 tracking-tight mt-4">Create account</h2>
          <p className="text-sm text-stone-500 dark:text-slate-400 mt-1">Set up your farm dashboard today</p>
        </div>

        {authError && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl flex items-start space-x-2">
            <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
            <span className="text-xs text-red-600 dark:text-red-400">{authError}</span>
          </motion.div>
        )}

        <form onSubmit={handleSignupSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
            <input type="text" required value={name}
              onChange={(e) => { setName(e.target.value); setAuthError(''); }}
              placeholder="e.g. John Green"
              className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-900 text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
            <input type="email" required value={email}
              onChange={(e) => { setEmail(e.target.value); setAuthError(''); }}
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-900 text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} required value={password}
                onChange={(e) => { setPassword(e.target.value); setAuthError(''); }}
                placeholder="Min. 8 characters"
                className="w-full px-4 py-3 pr-12 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-900 text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:text-slate-500 dark:hover:text-slate-350 transition-colors cursor-pointer">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2">
                <div className="flex space-x-1">
                  {[1,2,3,4,5].map((i) => (
                    <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${pwStrength >= i ? (pwStrength <= 2 ? 'bg-red-500' : pwStrength <= 3 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-stone-200 dark:bg-slate-800'}`} />
                  ))}
                </div>
                <p className={`text-[11px] mt-1 font-medium ${pwStrength <= 2 ? 'text-red-500' : pwStrength <= 3 ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {pwStrength <= 2 ? 'Weak password' : pwStrength <= 3 ? 'Fair password' : pwStrength === 4 ? 'Strong password' : 'Very strong password'}
                </p>
              </motion.div>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Operation Type</label>
            <select value={accountType} onChange={(e: any) => setAccountType(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-900 text-stone-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none cursor-pointer"
              style={{ backgroundImage: 'none' }}
            >
              <option value="Gardener">🌱 Home / Hobbyist Gardener</option>
              <option value="Farmer">🚜 Commercial Farmer</option>
              <option value="Nursery">🌿 Farm Dashboard / Nursery Operator</option>
              <option value="Agribusiness">🏢 Agribusiness Professional</option>
            </select>
          </div>

          <button type="submit" disabled={isSubmitting || pwStrength < 3}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
            style={{ background: (isSubmitting || pwStrength < 3) ? '#6b7280' : 'linear-gradient(135deg, #059669, #047857)' }}
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><span>Create Account & Verify Email</span><ChevronRight className="h-4 w-4" /></>}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-stone-100 dark:border-slate-800 text-center text-xs text-stone-400 dark:text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-semibold cursor-pointer transition-colors">
            Sign in →
          </Link>
        </div>
      </motion.div>
    </AuthLayout>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
