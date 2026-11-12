'use client';

import React, { useState, useEffect } from 'react';
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
  Lock,
  Mail,
  User,
  Sparkles,
  Ticket,
  Music,
} from 'lucide-react';
import {
  GoogleAuthButton,
  GoogleAuthResponse,
  GoogleDecodedUser,
  GoogleRoleModal,
} from '@/components/auth';
import type { ManualRegistrationData } from '@/api';
import { useSessionStore } from '@/lib/session-store';

const signupSchema = z
  .object({
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
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

type SuccessState = 'registered' | 'registeredManual' | 'signedin' | 'pending';

const SUCCESS_COPY: Record<
  SuccessState,
  { title: string; description: string; cta: string; href: string }
> = {
  // Google signup: the backend created a session.
  registered: {
    title: 'AUTHENTICATION COMPLETED',
    description:
      'Your GoEvent profile is ready. You can now discover concerts and book tickets with real-time inventory holds.',
    cta: 'Visit Site',
    href: '/',
  },
  // Manual signup: no session yet, so the user signs in next.
  registeredManual: {
    title: 'REGISTRATION COMPLETED',
    description:
      'Your account has been created. Sign in with your email and password to continue.',
    cta: 'Sign In',
    href: '/login',
  },
  signedin: {
    title: 'AUTHENTICATION COMPLETED',
    description: 'Welcome back to GoEvent. You are signed in and ready to book your next event.',
    cta: 'Visit Site',
    href: '/',
  },
  pending: {
    title: 'REGISTRATION SUBMITTED',
    description:
      'Your organizer account is under review. An admin will approve it shortly, then you can sign in.',
    cta: 'Back to Home',
    href: '/',
  },
};

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successState, setSuccessState] = useState<SuccessState | null>(null);
  const [manualForm, setManualForm] = useState<ManualRegistrationData | null>(null);
  const successCopy = successState ? SUCCESS_COPY[successState] : null;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreeTerms: false,
    },
  });

  const [googleVerifiedUser, setGoogleVerifiedUser] = useState<{
    email?: string;
    name?: string;
    picture?: string;
  } | null>(null);

  // Google Role Modal state
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [googleIdToken, setGoogleIdToken] = useState<string>('');
  const [decodedGoogleUser, setDecodedGoogleUser] = useState<GoogleDecodedUser | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('googleVerified') === 'true') {
        const email = params.get('email');
        const name = params.get('name');
        setGoogleVerifiedUser({
          email: email || undefined,
          name: name || undefined,
        });
        if (email) setValue('email', email, { shouldValidate: true });
        if (name) {
          const parts = name.trim().split(/\s+/);
          const first = parts[0] || '';
          const last = parts.slice(1).join(' ') || '';
          setValue('firstName', first, { shouldValidate: true });
          if (last) setValue('lastName', last, { shouldValidate: true });
        }
      }
    }
  }, [setValue]);

  const handleGoogleSuccess = (
    data: GoogleAuthResponse,
    googleUser?: GoogleDecodedUser | null,
    idToken?: string
  ) => {
    if (idToken) {
      setGoogleIdToken(idToken);
      setDecodedGoogleUser(googleUser || null);
    }

    if (data.action === 'REGISTRATION_REQUIRED') {
      // Google flow: make sure no stale manual form data is used by the modal.
      setManualForm(null);
      if (googleUser) {
        setGoogleVerifiedUser({
          email: googleUser.email,
          name: googleUser.name,
          picture: googleUser.picture,
        });
        if (googleUser.given_name) {
          setValue('firstName', googleUser.given_name, { shouldValidate: true });
        } else if (googleUser.name) {
          const parts = googleUser.name.trim().split(/\s+/);
          setValue('firstName', parts[0] || '', { shouldValidate: true });
        }
        if (googleUser.family_name) {
          setValue('lastName', googleUser.family_name, { shouldValidate: true });
        } else if (googleUser.name) {
          const parts = googleUser.name.trim().split(/\s+/);
          const last = parts.slice(1).join(' ');
          if (last) setValue('lastName', last, { shouldValidate: true });
        }
        if (googleUser.email) setValue('email', googleUser.email, { shouldValidate: true });
      }
      // Open the role selection popup modal
      setIsRoleModalOpen(true);
    } else if (data.action === 'LOGIN') {
      // Existing account signed in; the success card lets the user continue.
      setSuccessState('signedin');
    }
  };

  const handleModalSuccess = (data: GoogleAuthResponse) => {
    // Manual signup never opens a session, unlike Google signup/sign-in.
    const wasManualSignup = manualForm !== null;

    setIsRoleModalOpen(false);
    setManualForm(null);

    if (data.action === 'REGISTRATION_PENDING') {
      // Organizer registrations wait for admin approval
      setSuccessState('pending');
    } else if (data.status) {
      if (!wasManualSignup) {
        useSessionStore.getState().setAuthenticated({
          userId: data.userId,
          roleId: data.roleId,
          email: data.email,
        });
      }

      setSuccessState(wasManualSignup ? 'registeredManual' : 'registered');
    }
  };

  const onSubmit = (data: SignupFormData) => {
    // Step 1: keep the form values and ask the user to pick a role.
    // The actual /auth/register request is sent from the role modal.
    setManualForm({
      fname: data.firstName,
      lname: data.lastName,
      email: data.email,
      password: data.password,
      confirmPassword: data.confirmPassword,
    });
    setIsRoleModalOpen(true);
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
          {successCopy ? (
            <div className="text-center py-10 space-y-5 animate-in fade-in duration-300">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display text-3xl font-black uppercase text-white">
                  {successCopy.title}
                </h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  {successCopy.description}
                </p>
              </div>
              <div className="pt-2 flex justify-center space-x-3">
                <Link
                  href={successCopy.href}
                  className="inline-flex items-center space-x-1.5 bg-white text-black font-semibold text-xs px-6 py-3 rounded-full hover:bg-zinc-200 transition-colors shadow-lg"
                >
                  <span>{successCopy.cta}</span>
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

              {/* Google Sign-Up */}
              <div className="space-y-3">
                <GoogleAuthButton
                  mode="signup"
                  onSuccessCallback={handleGoogleSuccess}
                />

                {googleVerifiedUser && (
                  <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex items-start space-x-3 text-xs text-emerald-200 animate-in fade-in duration-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-bold text-white block">Google Identity Verified</span>
                      <span className="text-[11px] text-emerald-300/80 block">
                        Verified account: <span className="text-white font-medium">{googleVerifiedUser.email}</span>. Please choose your role and complete your details to finish registration.
                      </span>
                    </div>
                  </div>
                )}

                <div className="relative flex items-center justify-center my-4">
                  <div className="border-t border-white/10 w-full" />
                  <span className="bg-[#121216] px-3 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold absolute">
                    Or register with email
                  </span>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Role Selector Tabs */}

                {/* Name fields (First Name & Last Name) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 block">
                      First Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input
                        type="text"
                        {...register('firstName')}
                        placeholder="e.g. Alex"
                        className={`w-full bg-white/5 hover:bg-white/10 focus:bg-white/10 border ${
                          errors.firstName ? 'border-red-500' : 'border-white/15'
                        } rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/40 transition-all`}
                      />
                    </div>
                    {errors.firstName && (
                      <p className="text-[11px] text-red-400 flex items-center space-x-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{errors.firstName.message}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 block">
                      Last Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input
                        type="text"
                        {...register('lastName')}
                        placeholder="e.g. Morgan"
                        className={`w-full bg-white/5 hover:bg-white/10 focus:bg-white/10 border ${
                          errors.lastName ? 'border-red-500' : 'border-white/15'
                        } rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/40 transition-all`}
                      />
                    </div>
                    {errors.lastName && (
                      <p className="text-[11px] text-red-400 flex items-center space-x-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{errors.lastName.message}</span>
                      </p>
                    )}
                  </div>
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

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full bg-white text-black hover:bg-zinc-200 font-semibold text-sm py-3.5 px-6 rounded-full flex items-center justify-center space-x-2 transition-all active:scale-[0.98] shadow-lg mt-2"
                >
                  <span>Create Account</span>
                  <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
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

      {/* Google Role Selection Modal Popup */}
      <GoogleRoleModal
        isOpen={isRoleModalOpen}
        onClose={() => {
          setIsRoleModalOpen(false);
          setManualForm(null);
        }}
        idToken={googleIdToken}
        googleUser={decodedGoogleUser}
        manualRegistration={manualForm}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}
