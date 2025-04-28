

"use client";


import { useState, useEffect } from "react";

import { useSignUp } from "@clerk/nextjs";
import dynamic from "next/dynamic";
const GoogleSignupButton = dynamic(() => import("@/components/GoogleSignupButton"), { ssr: false });

import axios from "axios";
import {
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Box,
  CircularProgress,
  Alert,
} from "@mui/material";
import { useRouter } from 'next/navigation'; // Import useRouter

export default function SignUpPage() {
  const { signUp, isLoaded } = useSignUp();
  console.log(signUp);
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
    userType: "Seeker",
    bio: "",
    profilePicture: null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false); // New loading state for Google
    // ... other state variables

  const handleGoogleSignUpClick = () => {
      setIsGoogleLoading(true);
      // The GoogleSignupButton component will handle the redirect,
      // so we don't need to do anything further here immediately.
      // The loading state will likely persist until the redirect happens.
    };
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [birthday, setBirthday] = useState("");
  const [baseLocation, setBaseLocation] = useState({ lat: -1.286389, lng: 36.817223 }); // Default location

  const handleChange = (e) => {
    if (e.target.name === "profilePicture") {
      setFormData({ ...formData, profilePicture: e.target.files[0] });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleCategoryChange = (e) => {
    const selected = e.target.value;
    setSelectedCategory(selected);
    const category = categories.find((cat) => cat._id === selected);
    if (category?.attributes) {
      const attrs = {};
      Object.keys(category.attributes).forEach((key) => (attrs[key] = ""));
      setSelectedAttributes(attrs);
    }
  };

  const handleAttributeChange = (key, value) => {
    setSelectedAttributes((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
      e.preventDefault();
      setError("");
      setLoading(true);
      try {
        const result = await signUp.create({
          emailAddress: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
        });
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        const formDataToSend = new FormData();
        formDataToSend.append("clerkId", result.id);
        formDataToSend.append("firstName", formData.firstName);
        formDataToSend.append("lastName", formData.lastName);
        formDataToSend.append("email", formData.email);
        formDataToSend.append("phoneNumber", formData.phoneNumber);
        formDataToSend.append("userType", "Seeker"); // Hardcoded
        formDataToSend.append("bio", formData.bio);
        if (formData.profilePicture) {
          formDataToSend.append("profilePicture", formData.profilePicture);
        }
        await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/addUser`, formDataToSend, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        alert("Signup successful! Check your email for verification.");
      } catch (err) {
        console.error("Signup error:", err);
        setError(err.errors?.[0]?.message || "Signup failed. Try again.");
      } finally {
        setLoading(false);
      }
    };

 useEffect(() => {
     if (isLoaded && signUp && signUp.client) { // Check if signUp.client exists
       console.log("SignUp object and client in useEffect:", signUp);

       const unsubscribe = signUp.client.auth.onAuthStateChange((state) => {
         if (state.isSignedIn && isGoogleLoading) {
           setIsGoogleLoading(false);
           router.push('/provider/provider-signup');
         } else if (!state.isSignedIn && isGoogleLoading && state.lastErrorCode) {
           console.error("Google Sign-up Error:", state.lastErrorCode);
           setError("Google Sign-up failed. Please try again.");
           setIsGoogleLoading(false);
         }
       });
       return () => unsubscribe();
     } else {
       console.log("Clerk not yet fully loaded (client missing).");
     }
   }, [signUp, isLoaded, isGoogleLoading, router]);

   if (!isLoaded) {
     return <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh"><CircularProgress /></Box>;
   }
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="#f5f5f5" padding="20px">
      <Box maxWidth="400px" bgcolor="white" p={4} borderRadius={8} boxShadow={3}>

      <Box mt={2}>
                <Typography align="center" gutterBottom>
                  Or sign up with:
                </Typography>
                <div> {/* Wrap the Google button */}
                  <Button
                                         fullWidth
                                         variant="outlined"
                                         color="secondary"
                                         href="/sso"
                                         sx={{ mt: 1, mb: 2 }}
                                       >Google</Button>
                </div>
                {isGoogleLoading && (
                  <Box display="flex" justifyContent="center" mt={1}>
                    <CircularProgress size={24} />
                  </Box>
                )}
              </Box>

      <Typography align="center" sx={{ mt: 1 }}>
        Want to work as a provider?
      </Typography>
      <Button
        fullWidth
        variant="outlined"
        color="secondary"
        href="/provider/provider-signup"
        sx={{ mt: 1, mb: 2 }}
      >
        Sign up as a Provider
      </Button>


       <Typography variant="p" align="center" gutterBottom>
                Already have an account??
              </Typography>
              <a href="/sign-in">
                <Button type="primary" fullWidth variant="contained" color="primary" disabled={loading} sx={{ marginTop: 2 }}>
                  {loading ? <CircularProgress size={24} /> : "Sign In"}
                </Button>
              </a>

        <Typography variant="h5" align="center" gutterBottom>
          Sign Up to Freelance Marketplace
        </Typography>

        {error && <Alert severity="error">{error}</Alert>}
        <form onSubmit={handleSubmit}>
          <TextField fullWidth margin="normal" label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} required />
          <TextField fullWidth margin="normal" label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} required />
          <TextField fullWidth margin="normal" label="Email (e.g., user@domain.com)" name="email" value={formData.email} onChange={handleChange} required />
          <TextField fullWidth margin="normal" label="Password" type="password" name="password" value={formData.password} onChange={handleChange} required />
          <TextField fullWidth margin="normal" label="Confirm Password" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
          <TextField fullWidth margin="normal" label="Phone Number (e.g., 72123456)" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required />
          <TextField fullWidth margin="normal" label="Bio" name="bio" value={formData.bio} onChange={handleChange} />

          <input
            type="file"
            accept="image/*"
            name="profilePicture"
            onChange={handleChange}
            style={{ marginTop: "10px", display: "block" }}
          />

          <Button type="submit" fullWidth variant="contained" color="primary" disabled={loading} sx={{ marginTop: 2 }}>
            {loading ? <CircularProgress size={24} /> : "Sign Up"}
          </Button>
        </form>
      </Box>
    </Box>
  );
}