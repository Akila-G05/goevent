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
  User,
  Sparkles,
  Ticket,
  Music,
} from 'lucide-react';

const signupSchema = z
  .object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
    role: z.enum(['ROLE_VIEWER', 'ROLE_CREATOR']),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    agreeTerms: z.boolean().refine((val) => val === true, {
      message: 'You must agree to the Terms of Service and Privacy Policy',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ['confirmPassword'],
  });

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      role: 'ROLE_VIEWER',
      password: '',
      confirmPassword: '',
      agreeTerms: false,
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: SignupFormData) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    // Simulated account registration state
    setTimeout(() => {
      setIsSubmitting(false);
      setSignupSuccess(true);
    }, 1400);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white flex items-center justify-center p-4 sm:p-6 lg:p-8 pt-24 sm:pt-28 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 rounded-3xl overflow-hidden border border-white/10 bg-[#121216] shadow-2xl relative z-10 my-6">
        {/* Left Side: Visual Concert Showcase */}
        <div className="hidden lg:flex lg:col-span-5 relative flex-col justify-between p-10 overflow-hidden bg-black">
          <Image
            src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1000&q=80"
            alt="Live concert crowd"
            fill
            className="object-cover object-center opacity-65 contrast-125"
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
              <span>Join the Community</span>
            </span>
            <h2 className="font-display text-4xl sm:text-5xl font-black text-white leading-[0.9] uppercase">
              BE THERE WHEN THE LIGHTS GO DOWN.
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Create an account to reserve concert passes, receive instant cryptographically signed QR tickets, or host your own stadium tours.
            </p>
          </div>
        </div>

        {/* Right Side: Registration Form */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
          {signupSuccess ? (
            <div className="text-center py-10 space-y-5 animate-in fade-in duration-300">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display text-3xl font-black uppercase text-white">
                  ACCOUNT CREATED!
                </h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Your GoEvent profile is ready. You can now discover concerts and book tickets with real-time inventory holds.
                </p>
              </div>
              <div className="pt-2 flex justify-center space-x-3">
                <Link
                  href="/login"
                  className="inline-flex items-center space-x-1.5 bg-white text-black font-semibold text-xs px-6 py-3 rounded-full hover:bg-zinc-200 transition-colors shadow-lg"
                >
                  <span>Sign In Now</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header */}
              <div>
                <h2 className="font-display text-4xl sm:text-5xl font-black text-white tracking-wide uppercase leading-none">
                  CREATE ACCOUNT
                </h2>
                <p className="text-xs text-zinc-400 mt-2">
                  Already have an account?{' '}
                  <Link href="/login" className="text-white font-semibold underline underline-offset-4 hover:text-red-400 transition-colors">
                    Sign in here
                  </Link>
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Role Selector Tabs */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">
                    I want to join as:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setValue('role', 'ROLE_VIEWER')}
                      className={`p-3 rounded-2xl border text-left flex items-start space-x-2.5 transition-all ${
                        selectedRole === 'ROLE_VIEWER'
                          ? 'border-white bg-white/10 text-white shadow-md'
                          : 'border-white/10 bg-white/5 text-zinc-400 hover:border-white/20'
                      }`}
                    >
                      <Ticket className={`w-4 h-4 mt-0.5 ${selectedRole === 'ROLE_VIEWER' ? 'text-red-400' : 'text-zinc-500'}`} />
                      <div>
                        <span className="text-xs font-bold block">Attendee / Fan</span>
                        <span className="text-[10px] text-zinc-400 block leading-tight">Book tickets & receive QR passes</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setValue('role', 'ROLE_CREATOR')}
                      className={`p-3 rounded-2xl border text-left flex items-start space-x-2.5 transition-all ${
                        selectedRole === 'ROLE_CREATOR'
                          ? 'border-white bg-white/10 text-white shadow-md'
                          : 'border-white/10 bg-white/5 text-zinc-400 hover:border-white/20'
                      }`}
                    >
                      <Music className={`w-4 h-4 mt-0.5 ${selectedRole === 'ROLE_CREATOR' ? 'text-red-400' : 'text-zinc-500'}`} />
                      <div>
                        <span className="text-xs font-bold block">Organizer / Creator</span>
                        <span className="text-[10px] text-zinc-400 block leading-tight">Create & manage live events</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Full name field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      {...register('fullName')}
                      placeholder="e.g. Alex Morgan"
                      className={`w-full bg-white/5 hover:bg-white/10 focus:bg-white/10 border ${
                        errors.fullName ? 'border-red-500' : 'border-white/15'
                      } rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/40 transition-all`}
                    />
                  </div>
                  {errors.fullName && (
                    <p className="text-[11px] text-red-400 flex items-center space-x-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{errors.fullName.message}</span>
                    </p>
                  )}
                </div>

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
                  <label className="text-xs font-semibold text-zinc-300 block">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      {...register('password')}
                      placeholder="At least 8 characters"
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

                {/* Confirm Password field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      {...register('confirmPassword')}
                      placeholder="Re-type your password"
                      className={`w-full bg-white/5 hover:bg-white/10 focus:bg-white/10 border ${
                        errors.confirmPassword ? 'border-red-500' : 'border-white/15'
                      } rounded-xl pl-11 pr-11 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/40 transition-all`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-[11px] text-red-400 flex items-center space-x-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{errors.confirmPassword.message}</span>
                    </p>
                  )}
                </div>

                {/* Terms agreement checkbox */}
                <div className="pt-1">
                  <div className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      id="agreeTerms"
                      {...register('agreeTerms')}
                      className="w-4 h-4 mt-0.5 rounded bg-white/10 border-white/20 text-black focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="agreeTerms" className="text-xs text-zinc-400 cursor-pointer leading-tight select-none">
                      I agree to the <span className="text-white hover:underline">Terms of Service</span> and <span className="text-white hover:underline">Privacy Policy</span>.
                    </label>
                  </div>
                  {errors.agreeTerms && (
                    <p className="text-[11px] text-red-400 flex items-center space-x-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{errors.agreeTerms.message}</span>
                    </p>
                  )}
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
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
                </button>
              </form>

              {/* Security Invariant Note */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-center space-x-2 text-[11px] text-zinc-500">
                <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                <span>Protected by Server-Side Bcrypt Hashing & Role Ownership Policies</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
