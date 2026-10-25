'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Eye,
  EyeOff,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Mail,
  Sparkles,
} from 'lucide-react';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: true,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    // Simulated authenticating state
    setTimeout(() => {
      setIsSubmitting(false);
      setAuthSuccess(true);
    }, 1200);
  };

  const handleQuickDemoFill = (role: 'viewer' | 'creator' | 'admin') => {
    if (role === 'viewer') {
      setValue('email', 'attendee@goevent.com');
      setValue('password', 'password123');
    } else if (role === 'creator') {
      setValue('email', 'organizer@goevent.com');
      setValue('password', 'password123');
    } else {
      setValue('email', 'admin@goevent.com');
      setValue('password', 'password123');
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#0a0a0c] text-white flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background ambient concert lighting glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 rounded-3xl overflow-hidden border border-white/10 bg-[#121216] shadow-2xl relative z-10">
        {/* Left Side: Visual Concert Showcase */}
        <div className="hidden lg:flex lg:col-span-5 relative flex-col justify-between p-10 overflow-hidden bg-black">
          <Image
            src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1000&q=80"
            alt="Concert stage lights"
            fill
            className="object-cover object-center opacity-60 contrast-125"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/60" />

          {/* Top Brand Tag */}
          <div className="relative z-10 flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <span className="w-1.5 h-5 bg-white rounded-full transform -skew-x-12" />
              <span className="w-1.5 h-5 bg-white/80 rounded-full transform -skew-x-12" />
              <span className="w-1.5 h-5 bg-white/60 rounded-full transform -skew-x-12" />
            </div>
            <span className="font-display text-2xl tracking-wider text-white font-bold">
              GOEVENT
            </span>
          </div>

          {/* Bottom Headline */}
          <div className="relative z-10 space-y-3">
            <span className="text-xs uppercase font-bold tracking-widest text-red-400 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Concert Pass System</span>
            </span>
            <h2 className="font-display text-4xl sm:text-5xl font-black text-white leading-[0.9] uppercase">
              EXPERIENCE LIVE MUSIC LIKE NEVER BEFORE.
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Log in to access your verified QR passes, manage bookings, and discover exclusive tour drops across Asia.
            </p>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
          {authSuccess ? (
            <div className="text-center py-10 space-y-5 animate-in fade-in duration-300">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display text-3xl font-black uppercase text-white">
                  AUTHENTICATED SUCCESSFULLY
                </h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Welcome back to GoEvent. You are now logged in with verified ticket ownership.
                </p>
              </div>
              <Link
                href="/"
                className="inline-flex items-center space-x-1.5 bg-white text-black font-semibold text-xs px-6 py-3 rounded-full hover:bg-zinc-200 transition-colors shadow-lg"
              >
                <span>Go to Live Events</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header */}
              <div>
                <h2 className="font-display text-4xl sm:text-5xl font-black text-white tracking-wide uppercase leading-none">
                  SIGN IN
                </h2>
                <p className="text-xs text-zinc-400 mt-2">
                  New to GoEvent?{' '}
                  <Link href="/signup" className="text-white font-semibold underline underline-offset-4 hover:text-red-400 transition-colors">
                    Create an account
                  </Link>
                </p>
              </div>

              {/* Demo Login Shortcuts */}
              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Demo Quick Fill:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickDemoFill('viewer')}
                    className="text-[11px] bg-white/10 hover:bg-white/20 text-zinc-200 px-3 py-1 rounded-full border border-white/10 transition-colors"
                  >
                    Attendee Demo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemoFill('creator')}
                    className="text-[11px] bg-white/10 hover:bg-white/20 text-zinc-200 px-3 py-1 rounded-full border border-white/10 transition-colors"
                  >
                    Creator Demo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemoFill('admin')}
                    className="text-[11px] bg-white/10 hover:bg-white/20 text-zinc-200 px-3 py-1 rounded-full border border-white/10 transition-colors"
                  >
                    Admin Demo
                  </button>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Email field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="email"
                      {...register('email')}
                      placeholder="name@example.com"
                      className={`w-full bg-white/5 hover:bg-white/10 focus:bg-white/10 border ${
                        errors.email ? 'border-red-500' : 'border-white/15'
                      } rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/40 transition-all`}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-[11px] text-red-400 flex items-center space-x-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{errors.email.message}</span>
                    </p>
                  )}
                </div>

                {/* Password field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-300 block">
                      Password
                    </label>
                    <span className="text-[11px] text-zinc-400 hover:text-white cursor-pointer transition-colors">
                      Forgot password?
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      {...register('password')}
                      placeholder="Enter your password"
                      className={`w-full bg-white/5 hover:bg-white/10 focus:bg-white/10 border ${
                        errors.password ? 'border-red-500' : 'border-white/15'
                      } rounded-xl pl-11 pr-11 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/40 transition-all`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-[11px] text-red-400 flex items-center space-x-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{errors.password.message}</span>
                    </p>
                  )}
                </div>

                {/* Remember me checkbox */}
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    {...register('rememberMe')}
                    className="w-4 h-4 rounded bg-white/10 border-white/20 text-black focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="rememberMe" className="text-xs text-zinc-400 cursor-pointer select-none">
                    Remember this device for 30 days
                  </label>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-white text-black hover:bg-zinc-200 font-semibold text-sm py-3.5 px-6 rounded-full flex items-center justify-center space-x-2 transition-all active:scale-[0.98] shadow-lg disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
                </button>
              </form>

              {/* Security Invariant Note */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-center space-x-2 text-[11px] text-zinc-500">
                <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                <span>Protected by TLS & Concurrency-Safe Session Token Auth</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
