'use client';

import { apiClient } from '@/lib/api-client';

import React, { useState } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { Loader2 } from 'lucide-react';
import { authApi, GoogleAuthResponse, API_ROUTES } from '@/api';
import { loading } from '@/lib/loading-store';
import { useSessionStore } from '@/lib/session-store';
import { getErrorMessage, toast } from '@/lib/toast-store';

export type { GoogleAuthResponse };

export interface GoogleDecodedUser {
  sub?: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email_verified?: boolean;
  [key: string]: any;
}

interface GoogleAuthButtonProps {
  mode?: 'signin' | 'signup';
  endpoint?: string;
  onCredential?: (response: CredentialResponse) => void | Promise<void>;
  onSuccessCallback?: (data: GoogleAuthResponse, googleUser?: GoogleDecodedUser | null, idToken?: string) => void;
  className?: string;
}

export function GoogleAuthButton({
  endpoint = API_ROUTES.AUTH.GOOGLE,
  onCredential,
  onSuccessCallback,
  className = '',
}: GoogleAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    const idToken = response.credential;
    if (!idToken) {
      toast.error('No Google credential received. Please try again.');
      return;
    }

    if (onCredential) {
      setIsLoading(true);

      try {
        await onCredential(response);
      } catch (err) {
        toast.error(getErrorMessage(err, 'Google authentication failed.'));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    loading.open();

    try {
      const data: GoogleAuthResponse = await authApi.authenticateGoogle({ idToken });

      if (!data.status) {
        toast.error(data.message || 'Google authentication failed', {
          title: 'Google sign-in failed',
        });
        return;
      }

      // Decode Google ID Token (client-side only for prefilling name, email, avatar)
      let googleUser: GoogleDecodedUser | null = null;
      try {
        const base64Url = idToken.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        googleUser = JSON.parse(
          decodeURIComponent(
            window
              .atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          )
        );
      } catch (decodeErr) {
        console.warn('Could not decode Google ID token payload:', decodeErr);
      }

      if (data.action === 'REGISTRATION_REQUIRED') {
        toast.info(data.message || 'Google account verified. Please complete your registration.');
      } else if (data.action === 'REGISTRATION_PENDING') {
        toast.info(data.message || 'Registration submitted and waiting for admin approval.');
      } else if (data.action === 'REGISTERED') {
        useSessionStore.getState().setAuthenticated({
          userId: data.userId,
          roleId: data.roleId,
          email: data.email,
        });
        void useSessionStore.getState().refresh();
        toast.success('Registration completed');
      } else {
        useSessionStore.getState().setAuthenticated({
          userId: data.userId,
          roleId: data.roleId,
          email: data.email,
        });
        void useSessionStore.getState().refresh();
        toast.success('Authentication successful');
      }

      if (onSuccessCallback) {
        onSuccessCallback(data, googleUser, idToken);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to authenticate with Google.'), {
        title: 'Google sign-in failed',
      });
    } finally {
      loading.close(500);
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    toast.error('Google Sign-In was cancelled or failed.');
  };

  if (!clientId) {
    return (
      <div className={`p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 text-center space-y-1 ${className}`}>
        <p className="font-semibold text-amber-300">Google OAuth Not Configured</p>
        <p className="text-[11px] text-amber-300/70">
          Add <code className="bg-amber-950/40 px-1 py-0.5 rounded text-white">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> to your <code className="bg-amber-950/40 px-1 py-0.5 rounded text-white">frontend/.env.local</code> to enable Google Sign-In.
        </p>
      </div>
    );
  }

  return (
    <div className={`w-full flex flex-col items-center space-y-2.5 ${className}`}>
      {isLoading ? (
        <div className="w-full py-3 px-4 bg-white/10 rounded-full flex items-center justify-center space-x-2 text-xs text-zinc-300 border border-white/15">
          <Loader2 className="w-4 h-4 animate-spin text-white" />
          <span>Verifying Google account with server...</span>
        </div>
      ) : (
        <div className="w-full flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="filled_black"
            shape="pill"
            size="large"
            text="continue_with"
            width="100%"
          />
        </div>
      )}
    </div>
  );
}

export default GoogleAuthButton;
