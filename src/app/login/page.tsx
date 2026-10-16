'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('ketan@trexobyte.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError('Invalid email or password. Please try again.');
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  const setDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
  };

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row bg-[#09090b] text-white">
      {/* Left Branding Hero Section */}
      <div className="relative flex flex-1 flex-col justify-between p-8 lg:p-12 border-b lg:border-b-0 lg:border-r border-zinc-800 bg-linear-to-br from-black via-zinc-950 to-[#1c0802]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF3B00] text-white font-black text-xl shadow-lg shadow-[#FF3B00]/30">
            TB
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight">TREXOBYTE</span>
            <span className="ml-2 text-xs font-mono text-[#FF3B00] bg-[#FF3B00]/15 px-2 py-0.5 rounded border border-[#FF3B00]/30">
              ERP v2.4
            </span>
          </div>
        </div>

        <div className="my-12 max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1 text-xs text-zinc-300">
            <span className="h-2 w-2 rounded-full bg-[#FF3B00] animate-ping" />
            <span>Kathmandu Digital Branding & Growth Agency</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight lg:text-5xl leading-tight">
            Scale Client Growth & Shoot Workflows.
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Centralized internal ERP for TrexoByte team members. Track client accounts, shoot schedules, urgency tasks, client feedback approvals, and NPR billing.
          </p>
        </div>

        <div className="border-t border-zinc-800/80 pt-6 flex justify-between items-center text-xs font-mono text-zinc-500">
          <span>TrexoByte Digital Agency Ltd.</span>
          <span>Security Level: Enterprise JWT</span>
        </div>
      </div>

      {/* Right Login Form */}
      <div className="flex w-full lg:w-128 flex-col justify-center p-8 lg:p-12 bg-zinc-950">
        <div className="mx-auto w-full max-w-sm space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Sign In to ERP <Zap className="h-5 w-5 text-[#FF3B00]" />
            </h2>
            <p className="text-xs text-zinc-400">Enter your TrexoByte credentials to access your dashboard.</p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-400 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ketan@trexobyte.com"
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-white focus:border-[#FF3B00] focus:ring-1 focus:ring-[#FF3B00] outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-white focus:border-[#FF3B00] focus:ring-1 focus:ring-[#FF3B00] outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-md bg-[#FF3B00] py-3 text-sm font-bold text-white hover:bg-[#e03400] transition-all shadow-lg shadow-[#FF3B00]/20 clicky-btn"
            >
              {loading ? 'Authenticating...' : 'Sign In to Workspace'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div className="border-t border-zinc-800/80 pt-4 space-y-2">
            <span className="block text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
              Demo Accounts Quick Fill:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDemoAccount('ketan@trexobyte.com')}
                className="rounded border border-zinc-800 bg-zinc-900/60 p-2 text-left hover:border-[#FF3B00] transition-colors"
              >
                <span className="block font-bold text-zinc-200">Ketan Shrestha</span>
                <span className="text-[10px] text-zinc-500">Super Admin</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoAccount('sneha@trexobyte.com')}
                className="rounded border border-zinc-800 bg-zinc-900/60 p-2 text-left hover:border-[#FF3B00] transition-colors"
              >
                <span className="block font-bold text-zinc-200">Sneha Adhikari</span>
                <span className="text-[10px] text-zinc-500">Social Media Mgr</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoAccount('aashish@trexobyte.com')}
                className="rounded border border-zinc-800 bg-zinc-900/60 p-2 text-left hover:border-[#FF3B00] transition-colors"
              >
                <span className="block font-bold text-zinc-200">Aashish Sharma</span>
                <span className="text-[10px] text-zinc-500">Shoot Manager</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoAccount('bikash@trexobyte.com')}
                className="rounded border border-zinc-800 bg-zinc-900/60 p-2 text-left hover:border-[#FF3B00] transition-colors"
              >
                <span className="block font-bold text-zinc-200">Bikash Gurung</span>
                <span className="text-[10px] text-zinc-500">Billing / Finance</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
