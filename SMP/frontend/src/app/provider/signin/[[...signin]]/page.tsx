"use client";

import React from 'react';
import { SignIn, ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import Link from 'next/link';

const ProviderSignInPage = () => {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-300 px-4">

      <div className="w-full max-w-md text-center text-black space-y-6">
        <div>
        <Link href="/" className="text-blue-400 hover:underline">
                       <h1 className="text-blue-600 font-bold"> Return Home</h1>
                      </Link>
          <h1 className="text-3xl font-bold">Sign in as Provider</h1>
          <p className="mt-2 text-sm text-gray-800">
            Providers are individuals offering services to job seekers. Sign in to view open jobs,
            place bids, and manage your provider profile.
          </p>
        </div>

        <SignIn

          redirectUrl="/provider-dash"
        />

        <h1 className="text-3xl font-bold"><p className="text-sm text-gray-800">
          Not a provider?{' '}
          <Link href="/sign-in" className="text-blue-400 hover:underline">
            Sign in as Seeker
          </Link>
        </p></h1>
      </div>
    </div>
  );
};

const ClerkWrapper = () => {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      afterSignInUrl="/provider-dash"
    >
      <ProviderSignInPage />
    </ClerkProvider>
  );
};

export default ClerkWrapper;
