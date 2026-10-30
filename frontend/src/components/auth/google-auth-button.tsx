'use client';

import React, { useState } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { AlertCircle, Loader2 } from 'lucide-react';

interface GoogleAuthButtonProps {
  mode?: 'signin' | 'signup';
  endpoint?: string;
  onCredential?: (response: CredentialResponse) => void | Promise<void>;
  onSuccessCallback?: (data: any) => void;
  className?: string;
}

export function GoogleAuthButton({
  mode = 'signup',
  endpoint = 'http://localhost:8080/goevent/api/auth/google',
  onCredential,
  onSuccessCallback,
  className = '',
}: GoogleAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    const idToken = response.credential;
    if (!idToken) {
      setErrorMessage('No Google credential received. Please try again.');
      return;
    }

    if (onCredential) {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        await onCredential(response);
      } catch (err: any) {
        setErrorMessage(err.message || 'Google authentication failed.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });

      const data = await result.json();
      console.log('Google Auth Response:', data);

      if (!result.ok) {
        throw new Error(data.message || 'Google authentication request failed');
      }

      if (onSuccessCallback) {
        onSuccessCallback(data);
      }
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      setErrorMessage(error.message || 'Failed to authenticate with Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    console.log('Google Sign-In Failed');
    setErrorMessage('Google Sign-In was cancelled or failed.');
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
    <div className={`w-full flex flex-col items-center space-y-2 ${className}`}>
      {isLoading ? (
        <div className="w-full py-3 px-4 bg-white/10 rounded-full flex items-center justify-center space-x-2 text-xs text-zinc-300 border border-white/15">
          <Loader2 className="w-4 h-4 animate-spin text-white" />
          <span>Verifying Google account...</span>
        </div>
      ) : (
        <div className="w-full flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="filled_black"
            shape="pill"
            size="large"
            text={mode === 'signup' ? 'signup_with' : 'signin_with'}
            width="100%"
          />
        </div>
      )}

      {errorMessage && (
        <div className="w-full p-2.5 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center space-x-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}

export default GoogleAuthButton;
