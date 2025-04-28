"use client";
import { useUser, useAuth } from "@clerk/nextjs";
import React, { useEffect, useState, useCallback } from "react";
import {
  TextField, Button, Box, Typography, CircularProgress, Alert,
  FormControl, InputLabel, Select, MenuItem, FormHelperText, Grid, Paper
} from "@mui/material";
import axiosInstance from "@/utils/axios"; // Assuming this is your configured axios instance
import { useRouter } from "next/navigation";

// Interface for Category data expected from API
interface Category {
  _id: string;
  categoryName: string;
  // Assuming attributes is an object where keys are attribute names
  // and values are comma-separated strings of options
  attributes?: Record<string, string>;
}

interface CategoryResponse {
  data: Category[];
}

export default function CompleteSignupPage() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();

  // Existing state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bio, setBio] = useState("");
  const [profilePicture, setProfilePicture] = useState<File | null>(null); // Correct type for file state
  const [loading, setLoading] = useState(false); // For submission loading
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true); // For initial data loading

  // --- New State for Categories and Attributes ---
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedCategoryDetails, setSelectedCategoryDetails] = useState<Category | null>(null);
  const [attributeValues, setAttributeValues] = useState<Record<string, string>>({});
  const [isFetchingCategories, setIsFetchingCategories] = useState(true);
  // --- End New State ---

  const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:5000/api"; // Use consistent base URL

  // Fetch Categories on component mount
  useEffect(() => {
    setIsFetchingCategories(true);
    axiosInstance.get<CategoryResponse>(`${API_BASE_URL}/getCategories`)
      .then((response) => {
        if (Array.isArray(response.data)) {
          setCategories(response.data);
        } else {
          console.error("Categories data is not an array:", response.data);
          setError("Failed to load category options.");
        }
      })
      .catch((error: Error) => {
        console.error("Error fetching categories:", error);
        setError("Failed to load categories. Please try refreshing.");
      })
      .finally(() => setIsFetchingCategories(false));
  }, [API_BASE_URL]);


  // Fetch existing user details (keep as before)
  useEffect(() => {
    const fetchUserDetails = async () => {
      // Combine loading state
      if (!isUserLoaded || !user?.id || isFetchingCategories) return;

      setIsLoading(true); // Use main loading indicator
      try {
        const token = await getToken();
        // Ensure axiosInstance uses the correct base URL or handle it here
        const response = await axiosInstance.get(
          `/getUserByClerkId/${user.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

          if (response.data) {
          setPhoneNumber(response.data.phoneNumber || "");
          setBio(response.data.bio || "");
          // TODO: Pre-fill category and attributes if they were previously saved
          // setSelectedCategoryId(response.data.categoryId || '');
          // setAttributeValues(response.data.attributes || {});
        }
      } catch (err) {
        console.error("Error fetching user details:", err);
        // Don't overwrite category fetch error if it occurred
        if (!error) setError("Failed to load user details.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserDetails();
    // Depend on category fetch status as well
  }, [isUserLoaded, user?.id, getToken, isFetchingCategories, error, axiosInstance]); // Added axiosInstance if it's reactive


  // --- Handlers for Category and Attributes ---
  const handleCategoryChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const categoryId = event.target.value as string;
    setSelectedCategoryId(categoryId);

    const selectedCat = categories.find(cat => cat._id === categoryId) || null;
    setSelectedCategoryDetails(selectedCat);

    // Reset attributes when category changes
    const initialAttributes: Record<string, string> = {};
         if (selectedCat?.attributes) {
            Object.keys(selectedCat.attributes).forEach(key => {
        initialAttributes[key] = ''; // Initialize with empty string
      });
    }
    setAttributeValues(initialAttributes);
  };

  const handleAttributeChange = (attributeName: string, value: string) => {
    setAttributeValues(prev => ({
      ...prev,
      [attributeName]: value,
    }));
  };
  // --- End Handlers ---

  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
        setProfilePicture(event.target.files[0]);
        } else {
        setProfilePicture(null);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation for required attributes
    const requiredAttributes = Object.keys(selectedCategoryDetails?.attributes || {});
    const missingAttributes = requiredAttributes.filter(key => !attributeValues[key]);
    if (missingAttributes.length > 0) {
        setError(`Please select a value for: ${missingAttributes.join(', ')}`);
        return;
    }
     if (!selectedCategoryId) {
        setError(`Please select your primary category.`);
      return;
    }


    setLoading(true);
    setError("");

      try {
      const token = await getToken();
      if (!token) throw new Error("Authentication token not available.");

      const formData = new FormData();
      formData.append("clerkId", user?.id || "");
      formData.append("phoneNumber", phoneNumber);
      formData.append("bio", bio);
      // *** IMPORTANT: Setting userType to Provider ***
      formData.append("userType", "Provider");
      formData.append("email", user?.emailAddresses[0]?.emailAddress || "");
      formData.append("firstName", user?.firstName || "");
      formData.append("lastName", user?.lastName || "");

      // Append Category and Attributes
      formData.append("categoryId", selectedCategoryId); // Send selected category ID
      // Append attributes individually for easier backend parsing with FormData
        Object.entries(attributeValues).forEach(([key, value]) => {
         if (value) { // Only append if a value is selected
             formData.append(`attributes[${key}]`, value);
         }
      });


      if (profilePicture) {
        formData.append("profilePicture", profilePicture);
      }

      // Log FormData content for debugging (won't show files directly)
      // for (let [key, value] of formData.entries()) {
      //   console.log(`${key}: ${value}`);
      // }

      await axiosInstance.post(
        "/completeProviderSignup", // Changed from completeSignupUser to completeProviderSignup
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      router.push("/dashboard"); // Redirect to provider dashboard

    } catch (err: any) {
      console.error("Submit error:", err.response?.data || err);
      setError(err.response?.data?.message || err.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  // Combined loading state check
   if (isLoading || isFetchingCategories || !isUserLoaded) {
     return ( <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh"><CircularProgress /></Box> );
    }

  return (
    // Added padding to the outer box
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 2 }}>
        <Paper elevation={4} sx={{ maxWidth: "600px", width: '100%', p: { xs: 2, sm: 4 }, mt: 4, mb: 4 }}> {/* Use Paper for better styling control */}
        <Typography variant="h5" align="center" gutterBottom>
                Complete Your Profile (Provider) {/* Changed title */}
            </Typography>
            <Typography variant="subtitle1" align="center" color="text.secondary" sx={{ mb: 3 }}>
                Tell us more about your skills and services.
        </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <form onSubmit={handleSubmit}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
                        margin="dense" 
            label="First Name"
                        value={user?.firstName || ""} 
                        disabled 
            InputProps={{ readOnly: true }}
          />
          <TextField
            fullWidth
                        margin="dense" 
            label="Last Name"
                        value={user?.lastName || ""} 
                        disabled 
            InputProps={{ readOnly: true }}
          />
          <TextField
            fullWidth
                        margin="dense" 
            label="Email"
                        value={user?.emailAddresses[0]?.emailAddress || ""} 
                        disabled 
            InputProps={{ readOnly: true }}
          />
          <TextField
            fullWidth
                        margin="dense" 
            label="Phone Number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            required
          />
          <TextField
            fullWidth
                        margin="dense" 
                        label="Bio / Short Introduction" 
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            multiline
            rows={3}
                        required 
                        helperText="Briefly describe yourself and your services."
                    />

                    {/* Category Selection */}
                    <FormControl fullWidth margin="dense" required error={!selectedCategoryId && !!error}>
                        <InputLabel id="category-select-label">Primary Category</InputLabel>
            <Select
                            labelId="category-select-label"
                            id="category-select"
                            value={selectedCategoryId}
                            label="Primary Category"
              onChange={handleCategoryChange}
            >
                            <MenuItem value="" disabled><em>Select your main service category...</em></MenuItem>
                            {categories.length > 0 ? categories.map((cat) => (
                                <MenuItem key={cat._id} value={cat._id}>
                                    {cat.categoryName}
              </MenuItem>
                            )) : <MenuItem disabled>Loading categories...</MenuItem>}
            </Select>
                        <FormHelperText>Choose the category that best represents your main skill/service.</FormHelperText>
          </FormControl>

                    {/* Dynamic Attributes */}
                    {selectedCategoryDetails && selectedCategoryDetails.attributes && Object.entries(selectedCategoryDetails.attributes).map(([key, value]) => (
                        <FormControl key={key} fullWidth margin="dense" required error={!attributeValues[key] && !!error}>
                            <InputLabel id={`attribute-label-${key}`}>{key}</InputLabel>
              <Select
                                labelId={`attribute-label-${key}`}
                                id={`attribute-select-${key}`}
                                label={key}
                                name={key}
                                value={attributeValues[key] || ""}
                                onChange={(e) => handleAttributeChange(key, e.target.value as string)}
                            >
                                <MenuItem value="" disabled><em>Select {key}...</em></MenuItem>
                                {(typeof value === 'string' ? value.split(',') : []).map((option) => (
                  <MenuItem key={option.trim()} value={option.trim()}>
                    {option.trim()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ))}

                    {/* Profile Picture Upload */}
                    <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" gutterBottom>Profile Picture (Optional)</Typography>
                        <Button variant="outlined" component="label" size="small">
                            Upload Image
                            <input type="file" hidden accept="image/*" onChange={handleProfilePictureChange} />
                        </Button>
                        {profilePicture && <Typography variant="caption" sx={{ ml: 1 }}>{profilePicture.name}</Typography>}
                    </Box>

                    {/* Submit Button */}
          <Button
            type="submit"
            variant="contained"
            color="primary"
                        fullWidth 
            disabled={loading}
            sx={{ mt: 2 }}
          >
                        {loading ? <CircularProgress size={24} /> : "Complete Profile"}
          </Button>
                </Box>
        </form>
        </Paper>
      </Box>
  );
}
