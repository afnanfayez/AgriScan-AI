'use client';

import React from 'react';
import { Sprout, ShieldCheck, Sparkles, CloudSun } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans">
      {/* ── LEFT BRAND PANEL — 3D animated dark ── */}
      <div className="hidden md:flex flex-col justify-between w-[480px] shrink-0 p-12 relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #0a1f0f 0%, #0d2b1a 60%, #0f1f2e 100%)' }}>
        {/* Animated floating 3D leaf/globe orbs */}
        <style>{`
          @keyframes float3d {
            0%,100% { transform: translateY(0px) rotateX(0deg) rotateY(0deg); }
            33% { transform: translateY(-18px) rotateX(8deg) rotateY(10deg); }
            66% { transform: translateY(-8px) rotateX(-5deg) rotateY(-8deg); }
          }
          @keyframes float3d2 {
            0%,100% { transform: translateY(0px) rotateX(0deg) rotateY(0deg); }
            33% { transform: translateY(-12px) rotateX(-6deg) rotateY(12deg); }
            66% { transform: translateY(-22px) rotateX(10deg) rotateY(-5deg); }
          }
          @keyframes float3d3 {
            0%,100% { transform: translateY(0px) rotateX(0deg) rotateY(0deg); }
            50% { transform: translateY(-14px) rotateX(6deg) rotateY(-10deg); }
          }
          @keyframes orbit {
            0% { transform: rotate(0deg) translateX(90px) rotate(0deg); }
            100% { transform: rotate(360deg) translateX(90px) rotate(-360deg); }
          }
          @keyframes orbit2 {
            0% { transform: rotate(120deg) translateX(70px) rotate(-120deg); }
            100% { transform: rotate(480deg) translateX(70px) rotate(-480deg); }
          }
          @keyframes orbit3 {
            0% { transform: rotate(240deg) translateX(110px) rotate(-240deg); }
            100% { transform: rotate(600deg) translateX(110px) rotate(-600deg); }
          }
          @keyframes pulseGlow {
            0%,100% { opacity: 0.15; transform: scale(1); }
            50% { opacity: 0.30; transform: scale(1.08); }
          }
          @keyframes scanLine {
            0% { transform: translateY(-100%); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(100%); opacity: 0; }
          }
          @keyframes particleDrift {
            0% { transform: translateY(0) translateX(0) scale(1); opacity: 0.7; }
            100% { transform: translateY(-120px) translateX(20px) scale(0.3); opacity: 0; }
          }
        `}</style>

        {/* Background glow blobs */}
        <div className="absolute inset-0" style={{ perspective: '800px' }}>
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)', animation: 'pulseGlow 4s ease-in-out infinite' }} />
          <div className="absolute bottom-1/4 right-0 w-64 h-64 rounded-full" style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.10) 0%, transparent 70%)', animation: 'pulseGlow 6s ease-in-out infinite 2s' }} />
          <div className="absolute top-0 left-0 w-48 h-48 rounded-full" style={{ background: 'radial-gradient(circle, rgba(6,95,70,0.25) 0%, transparent 70%)' }} />
        </div>

        {/* 3D Central Orb + orbiting elements */}
        <div className="absolute top-[47%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48" style={{ perspective: '600px' }}>
          {/* Core planet orb */}
          <div className="w-48 h-48 rounded-full relative" style={{ background: 'radial-gradient(ellipse at 35% 35%, #10b981 0%, #059669 40%, #064e3b 80%, #022c22 100%)', boxShadow: '0 0 60px rgba(16,185,129,0.4), 0 0 120px rgba(16,185,129,0.15), inset -20px -20px 40px rgba(0,0,0,0.5)', animation: 'float3d 7s ease-in-out infinite' }}>
            {/* Scan line */}
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <div style={{ position:'absolute', left:0, right:0, height:'2px', background:'linear-gradient(90deg, transparent, rgba(52,211,153,0.8), transparent)', animation:'scanLine 3s ease-in-out infinite' }} />
            </div>
            {/* Grid overlay */}
            <div className="absolute inset-0 rounded-full" style={{ backgroundImage:'repeating-linear-gradient(0deg, transparent, transparent 18px, rgba(52,211,153,0.08) 18px, rgba(52,211,153,0.08) 19px), repeating-linear-gradient(90deg, transparent, transparent 18px, rgba(52,211,153,0.08) 18px, rgba(52,211,153,0.08) 19px)', borderRadius:'50%' }} />
            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Sprout className="h-14 w-14" style={{ color:'rgba(255,255,255,0.9)', filter:'drop-shadow(0 0 12px rgba(52,211,153,0.8))' }} />
            </div>
          </div>

          {/* Orbiting particles */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div style={{ position:'absolute', width:'8px', height:'8px', borderRadius:'50%', background:'linear-gradient(135deg,#10b981,#34d399)', boxShadow:'0 0 10px rgba(16,185,129,0.8)', animation:'orbit 5s linear infinite' }} />
            <div style={{ position:'absolute', width:'6px', height:'6px', borderRadius:'50%', background:'linear-gradient(135deg,#6ee7b7,#10b981)', boxShadow:'0 0 8px rgba(110,231,183,0.8)', animation:'orbit2 7s linear infinite' }} />
            <div style={{ position:'absolute', width:'10px', height:'10px', borderRadius:'50%', background:'linear-gradient(135deg,#059669,#047857)', boxShadow:'0 0 12px rgba(5,150,105,0.8)', animation:'orbit3 9s linear infinite' }} />
          </div>

          {/* Orbit ring */}
          <div className="absolute inset-[-30px] rounded-full" style={{ border:'1px solid rgba(16,185,129,0.15)', transform:'rotateX(70deg)' }} />
        </div>

        {/* Top logo */}
        <div className="relative z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl" style={{ background: 'linear-gradient(135deg, #059669, #047857)', boxShadow:'0 4px 20px rgba(5,150,105,0.4)' }}>
              <Sprout className="h-7 w-7 text-white" />
            </div>
            <div>
              <span className="block text-xl font-bold text-white tracking-tight">AgriScan AI</span>
              <span className="block text-[10px] font-mono text-emerald-400 uppercase tracking-widest">Pathology Intelligence</span>
            </div>
          </div>
        </div>

        {/* Hero title */}
        <div className="absolute z-10 left-12 right-12 top-[29%] space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border border-emerald-800/60 bg-emerald-950/60 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">Gemini Multimodal Engine &middot; Live</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white leading-tight tracking-tight">
            Smart Plant<br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">Health Intelligence</span>
          </h1>
        </div>

        {/* Bottom text */}
        <div className="absolute z-10 left-12 right-12 top-[58%] space-y-4">
          <div className="hidden items-center space-x-2 px-3 py-1.5 rounded-full border border-emerald-800/60 bg-emerald-950/60 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">Gemini Multimodal Engine &middot; Live</span>
          </div>
          <h1 className="hidden text-3xl font-extrabold text-white leading-tight tracking-tight">
            Smart Plant<br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">Health Intelligence</span>
          </h1>

          <p className="text-sm text-stone-200/95 leading-relaxed font-normal">
            Instant disease diagnosis powered by Google Gemini Vision. Protect your crops before it&apos;s too late.
          </p>

          <div className="hidden">
            {[
              { icon: ShieldCheck, text: 'Bank-grade encrypted auth & OTP verification' },
              { icon: Sparkles, text: 'AI-powered treatment plans generated instantly' },
              { icon: CloudSun, text: 'Localized weather & blight spore risk alerts' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center space-x-3">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Icon className="h-3.5 w-3.5 text-emerald-300" />
                </div>
                <span className="text-sm text-stone-100 font-medium leading-relaxed">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-[10px] text-emerald-500/30 font-mono text-center">
          AgriScan AI Professional © 2026. All rights reserved.
        </div>
      </div>

      {/* ── RIGHT AUTH PANEL — white ── */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-white">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
