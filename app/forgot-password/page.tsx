'use client';

import React, { Suspense, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth-context';
import AuthLayout from '@/components/auth-layout';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  CheckCircle,
  Loader2,
  Mail,
  ShieldCheck,
  KeyRound,
  ArrowLeft,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';

type Step = 'request' | 'otp' | 'newpass';

function ForgotPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { requestPasswordReset, verifyResetCode, confirmPasswordReset } = useAuth();

  const stepParam = searchParams.get('step');
  const step: Step = stepParam === 'otp' ? 'otp' : stepParam === 'newpass' ? 'newpass' : 'request';

  const [resetEmail, setResetEmail] = useState(searchParams.get('email') || '');
  const [resetOtpDigits, setResetOtpDigits] = useState(['', '', '', '', '', '']);
  const resetOtpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  // Short-lived; kept out of the URL on purpose. Refreshing on the newpass
  // step loses this and bounces the user back to re-enter the OTP.
  const [resetVerifiedToken, setResetVerifiedToken] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  React.useEffect(() => {
    if (step === 'newpass' && !resetVerifiedToken) {
      router.replace(`/forgot-password?step=otp&email=${encodeURIComponent(resetEmail)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;
    const next = [...resetOtpDigits];
    next[index] = value;
    setResetOtpDigits(next);
    if (value && index < 5) resetOtpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !resetOtpDigits[index] && index > 0) {
      resetOtpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setResetOtpDigits(pasted.split(''));
      resetOtpRefs.current[5]?.focus();
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);
    const res = await requestPasswordReset(resetEmail);
    setIsSubmitting(false);
    if (res.success) {
      setResetOtpDigits(['', '', '', '', '', '']);
      setResendCooldown(60);
      router.push(`/forgot-password?step=otp&email=${encodeURIComponent(resetEmail)}`);
    } else {
      setAuthError(res.error || 'Failed to request reset.');
    }
  };

  const handleVerifyResetOtp = async () => {
    const code = resetOtpDigits.join('');
    if (code.length < 6) { setAuthError('Please enter all 6 digits.'); return; }
    setAuthError('');
    setIsSubmitting(true);
    const res = await verifyResetCode(resetEmail, code);
    setIsSubmitting(false);
    if (res.success && res.verifiedToken) {
      setResetVerifiedToken(res.verifiedToken);
      setNewPassword('');
      router.push(`/forgot-password?step=newpass&email=${encodeURIComponent(resetEmail)}`);
    } else {
      setAuthError(res.error || 'Invalid code. Please try again.');
      setResetOtpDigits(['', '', '', '', '', '']);
      resetOtpRefs.current[0]?.focus();
    }
  };

  const handleResendResetOtp = async () => {
    if (resendCooldown > 0) return;
    setAuthError('');
    const res = await requestPasswordReset(resetEmail);
    if (res.success) {
      setResendCooldown(60);
      setResetOtpDigits(['', '', '', '', '', '']);
      resetOtpRefs.current[0]?.focus();
    } else {
      setAuthError(res.error || 'Failed to resend code.');
    }
  };

  const handleConfirmReset = async () => {
    if (newPassword.length < 8) { setAuthError('Password must be at least 8 characters.'); return; }
    setAuthError('');
    setIsSubmitting(true);
    const res = await confirmPasswordReset(resetEmail, resetVerifiedToken, newPassword);
    if (res.success) {
      setAuthSuccess('Password reset successfully! Redirecting to your dashboard…');
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 800);
    } else {
      setAuthError(res.error || 'Failed to reset password.');
      setIsSubmitting(false);
    }
  };

  if (step === 'otp') {
    return (
      <AuthLayout>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <button onClick={() => router.push('/forgot-password')} className="flex items-center space-x-1.5 text-stone-400 hover:text-stone-600 dark:text-slate-500 dark:hover:text-slate-350 text-xs mb-6 cursor-pointer transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </button>

          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 rounded-2xl" style={{ background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.2)' }}>
              <Mail className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900 dark:text-slate-50 tracking-tight">Check your email</h2>
              <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">Enter the 6-digit code sent to <span className="text-emerald-600 dark:text-emerald-400 font-medium">{resetEmail}</span></p>
            </div>
          </div>

          {authError && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
              <span className="text-xs text-red-600 dark:text-red-400">{authError}</span>
            </motion.div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-stone-500 dark:text-slate-400 uppercase tracking-wider mb-3 text-center">6-digit reset code</label>
              <div className="flex items-center justify-center space-x-2">
                {resetOtpDigits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => { resetOtpRefs.current[i] = el; }}
                    type="text" inputMode="numeric" maxLength={1} value={d}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    onPaste={handleOtpPaste}
                    className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${d ? 'bg-emerald-50 border-emerald-600 text-emerald-950 dark:bg-emerald-950/30 dark:border-emerald-500 dark:text-emerald-100' : 'bg-stone-50 border-stone-200 text-stone-900 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100'}`}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={handleVerifyResetOtp}
              disabled={isSubmitting || resetOtpDigits.join('').length < 6}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><ShieldCheck className="h-4 w-4" /><span>Verify Code</span></>}
            </button>

            <div className="flex items-center justify-end">
              <button
                onClick={handleResendResetOtp}
                disabled={resendCooldown > 0}
                className={`flex items-center space-x-1.5 text-xs transition-colors cursor-pointer disabled:cursor-not-allowed ${resendCooldown > 0 ? 'text-stone-400 dark:text-slate-650' : 'text-emerald-600 dark:text-emerald-450'}`}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </AuthLayout>
    );
  }

  if (step === 'newpass') {
    return (
      <AuthLayout>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 rounded-2xl" style={{ background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.2)' }}>
              <ShieldCheck className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900 dark:text-slate-50 tracking-tight">Set new password</h2>
              <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">Code verified ✅ — Choose a strong new password</p>
            </div>
          </div>

          {authError && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
              <span className="text-xs text-red-600 dark:text-red-400">{authError}</span>
            </motion.div>
          )}
          {authSuccess && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-xl flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-xs text-emerald-700 dark:text-emerald-300">{authSuccess}</span>
            </motion.div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-stone-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">New Password</label>
              <div className="relative">
                <input type={showNewPassword ? 'text' : 'password'} value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setAuthError(''); }}
                  placeholder="Min. 8 characters"
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-900 text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:text-slate-500 dark:hover:text-slate-350 transition-colors cursor-pointer">
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {newPassword.length > 0 && newPassword.length < 8 && (
                <p className="text-xs text-red-500 mt-1.5">Password must be at least 8 characters.</p>
              )}
            </div>

            <button
              onClick={handleConfirmReset}
              disabled={isSubmitting || newPassword.length < 8}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><KeyRound className="h-4 w-4" /><span>Save & Sign In</span></>}
            </button>
          </div>
        </motion.div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <button onClick={() => router.push('/login')} className="flex items-center space-x-1.5 text-stone-400 hover:text-stone-600 dark:text-slate-500 dark:hover:text-slate-350 text-xs mb-6 cursor-pointer transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to sign in</span>
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 rounded-2xl" style={{ background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.2)' }}>
            <KeyRound className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-900 dark:text-slate-50 tracking-tight">Forgot password?</h2>
            <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">We&apos;ll send a reset code to your email</p>
          </div>
        </div>

        {authError && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl flex items-start space-x-2">
            <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
            <span className="text-xs text-red-600 dark:text-red-400">{authError}</span>
          </motion.div>
        )}

        <form onSubmit={handleRequestReset} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Registered Email Address</label>
            <input type="email" required value={resetEmail}
              onChange={(e) => { setResetEmail(e.target.value); setAuthError(''); }}
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-900 text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
          </div>

          <button type="submit" disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Mail className="h-4 w-4" /><span>Send Reset Code</span></>}
          </button>
        </form>
      </motion.div>
    </AuthLayout>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
