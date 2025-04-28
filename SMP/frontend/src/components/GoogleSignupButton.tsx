"use client";

import { SignUpButton } from "@clerk/nextjs";
import { Button } from "@mui/material";

export default function GoogleSignupButton() {
  return (
    <SignUpButton
      mode="oauth_redirect" // Use oauth_redirect for social sign-ups
      provider="google"      // Specify the provider
      redirectUrl="/completesignup"
      afterSignUpUrl="/completesignup"
      signUpForceRedirectUrl="/completesignup"
      asChild
    >
      <Button variant="outlined" fullWidth>
        Sign up with Google
      </Button>
    </SignUpButton>
  );
}