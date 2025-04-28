"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CircularProgress, Box, Alert } from "@mui/material";

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setShowAlert(true);
      // Redirect after a short delay to allow the alert to be seen
      const timer = setTimeout(() => {
        router.push("/sign-in"); // Redirect to your sign-in page
      }, 2000); // Adjust the delay as needed (e.g., 2000ms = 2 seconds)

      return () => clearTimeout(timer); // Cleanup the timer if the component unmounts
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (showAlert) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Alert severity="warning">You need to be signed in to access this page. Redirecting to sign-in...</Alert>
      </Box>
    );
  }

  if (!isSignedIn) {
    return null; // Prevents rendering the protected content
  }

  return <>{children}</>;
};