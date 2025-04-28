"use client";

import React from 'react';
import { SignIn, ClerkProvider } from '@clerk/nextjs';
import { purple } from '@clerk/themes';
import Link from 'next/link';

const SeekerSignInPage = () => {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 px-4">
      <div className="w-full max-w-md text-center text-gray-800 space-y-6">
        <div><Link href="/" className="text-blue-400 hover:underline">
                                    <h1 className="text-blue-600 font-bold"> Return Home</h1>
                                   </Link>
          <h1 className="text-3xl font-bold">Sign in as Seeker</h1>

          <p className="mt-2 text-sm text-gray-600">
            Seekers are users looking for help with small jobs and services. Sign in to post new jobs,
            manage your requests, and connect with providers.
          </p>
        </div>

        <SignIn
          appearance={{
            baseTheme: purple,
          }}
          redirectUrl="/provider-dash"
        />

        <p className="text-sm text-gray-600">
          Are you a provider?{' '}
          <Link href="/provider/signin" className="text-blue-600 hover:underline">
            Sign in as Provider
          </Link>
        </p>
      </div>
    </div>
  );
};

const ClerkWrapper = () => {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      afterSignInUrl="/dashboard"
    >
      <SeekerSignInPage />
    </ClerkProvider>
  );
};

export default ClerkWrapper;
