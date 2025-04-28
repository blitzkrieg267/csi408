"use client";
import { useUser, useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import {
  TextField, Button, Box, Typography, CircularProgress, Alert,
  FormControl, InputLabel, Select, MenuItem, FormHelperText, Paper,
  keyframes, styled
} from "@mui/material";
import axiosInstance from "@/utils/axios";
import { useRouter, useSearchParams } from "next/navigation";
import { SelectChangeEvent } from '@mui/material/Select';

// Animation keyframes
const pulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(25, 118, 210, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(25, 118, 210, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(25, 118, 210, 0);
  }
`;

// Styled components
const PulsingTextField = styled(TextField)(({ theme }) => ({
  '&.Mui-error': {
    '& .MuiOutlinedInput-root': {
      animation: `${pulse} 2s infinite`,
    },
  },
}));

const PulsingFormControl = styled(FormControl)(({ theme }) => ({
  '&.Mui-error': {
    '& .MuiOutlinedInput-root': {
      animation: `${pulse} 2s infinite`,
    },
  },
}));

// Interface for Category data expected from API
interface Category {
  _id: string;
  categoryName: string;
  attributes?: Record<string, string>;
}

export default function CompleteSignupPage() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userType = searchParams.get('type');

  // Common state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bio, setBio] = useState("");
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Provider-specific state
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedCategoryDetails, setSelectedCategoryDetails] = useState<Category | null>(null);
  const [attributeValues, setAttributeValues] = useState<Record<string, string>>({});
  const [isFetchingCategories, setIsFetchingCategories] = useState(true);

  const [highlightFields, setHighlightFields] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  // Redirect to SelectType if no type parameter
  useEffect(() => {
    if (!userType) {
      router.push('/selectType');
    }
  }, [userType, router]);

  // Fetch Categories if user is a provider
  useEffect(() => {
    if (userType === 'Provider') {
      setIsFetchingCategories(true);
      axiosInstance.get<Category[]>(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/getCategories`)
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
    }
  }, [userType]);

  // Fetch existing user details if they exist in MongoDB
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!isUserLoaded || !user?.id) return;

      try {
        const token = await getToken();
        const response = await axiosInstance.get(
          `/getUserByClerkId/${user.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data) {
          setPhoneNumber(response.data.phoneNumber || "");
          setBio(response.data.bio || "");
          if (userType === 'Provider' && response.data.categoryId) {
            setSelectedCategoryId(response.data.categoryId);
            setAttributeValues(response.data.attributes || {});
          }
        }
      } catch (err) {
        // If user doesn't exist in MongoDB yet, that's fine - they're completing signup
        console.log("User not found in MongoDB - completing signup process");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserDetails();
  }, [isUserLoaded, user?.id, getToken, userType]);

  const handleCategoryChange = (event: SelectChangeEvent) => {
    const categoryId = event.target.value;
    setSelectedCategoryId(categoryId);

    const selectedCat = categories.find(cat => cat._id === categoryId) || null;
    setSelectedCategoryDetails(selectedCat);

    // Reset attributes when category changes
    const initialAttributes: Record<string, string> = {};
    if (selectedCat?.attributes) {
      Object.keys(selectedCat.attributes).forEach(key => {
        initialAttributes[key] = '';
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

  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setProfilePicture(event.target.files[0]);
    } else {
      setProfilePicture(null);
    }
  };

  const validateForm = () => {
    const missing: string[] = [];
    
    if (!phoneNumber) missing.push('Phone Number');
    if (!bio) missing.push('Bio');
    
    if (userType === 'Provider') {
      if (!selectedCategoryId) missing.push('Primary Category');
      if (selectedCategoryDetails?.attributes) {
        Object.entries(selectedCategoryDetails.attributes).forEach(([key, value]) => {
          if (!attributeValues[key]) missing.push(key);
        });
      }
    }
    
    setMissingFields(missing);
    setHighlightFields(missing.length > 0);
    return missing.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError("");

    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication token not available.");
      if (!userType) throw new Error("User type not specified.");

      const formData = new FormData();
      formData.append("clerkId", user?.id || "");
      formData.append("phoneNumber", phoneNumber);
      formData.append("bio", bio);
      formData.append("userType", userType);
      formData.append("email", user?.emailAddresses[0]?.emailAddress || "");
      formData.append("firstName", user?.firstName || "");
      formData.append("lastName", user?.lastName || "");

      if (userType === 'Provider') {
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

        formData.append("categoryId", selectedCategoryId);
        Object.entries(attributeValues).forEach(([key, value]) => {
          if (value) {
            formData.append(`attributes[${key}]`, value);
          }
        });
      }

      if (profilePicture) {
        formData.append("profilePicture", profilePicture);
      }

      const endpoint = userType === 'Provider' ? "/completeProviderSignup" : "/completeSignupUser";
      await axiosInstance.post(endpoint, formData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      router.push(userType === 'Provider' ? "/provider/dashboard" : "/dashboard");
    } catch (err: any) {
      console.error("Submit error:", err.response?.data || err);
      setError(err.response?.data?.message || err.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  if (!userType) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (isLoading || !isUserLoaded || (userType === 'Provider' && isFetchingCategories)) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 2 }}>
      <Paper elevation={4} sx={{ maxWidth: "600px", width: '100%', p: { xs: 2, sm: 4 }, mt: 4, mb: 4 }}>
      <Typography variant="h5" align="center" gutterBottom>
          Complete Your Profile ({userType})
        </Typography>
        <Typography variant="subtitle1" align="center" color="text.secondary" sx={{ mb: 3 }}>
          {userType === 'Provider' ? 'Tell us more about your skills and services.' : 'Tell us more about yourself.'}
      </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {highlightFields && missingFields.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Please fill in the following required fields: {missingFields.join(', ')}
          </Alert>
        )}

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
            <PulsingTextField
          fullWidth
              margin="dense"
          label="Phone Number"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          required
              error={highlightFields && !phoneNumber}
              helperText={highlightFields && !phoneNumber ? "Phone number is required" : ""}
        />
            <PulsingTextField
          fullWidth
              margin="dense"
              label="Bio / Short Introduction"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          multiline
          rows={3}
              required
              error={highlightFields && !bio}
              helperText={
                highlightFields && !bio 
                  ? "Bio is required" 
                  : userType === 'Provider' 
                    ? "Briefly describe yourself and your services." 
                    : "Tell us about yourself."
              }
            />

            {/* Provider-specific fields */}
            {userType === 'Provider' && (
              <>
                <PulsingFormControl 
                  fullWidth 
                  margin="dense" 
                  required 
                  error={highlightFields && !selectedCategoryId}
                >
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
                  <FormHelperText error={highlightFields && !selectedCategoryId}>
                    {highlightFields && !selectedCategoryId 
                      ? "Please select a category" 
                      : "Choose the category that best represents your main skill/service."}
                  </FormHelperText>
                </PulsingFormControl>

                {selectedCategoryDetails && selectedCategoryDetails.attributes && 
                  Object.entries(selectedCategoryDetails.attributes).map(([key, value]) => (
                    <PulsingFormControl 
                      key={key} 
                      fullWidth 
                      margin="dense" 
                      required 
                      error={highlightFields && !attributeValues[key]}
                    >
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
                      <FormHelperText error={highlightFields && !attributeValues[key]}>
                        {highlightFields && !attributeValues[key] ? `Please select a ${key}` : ""}
                      </FormHelperText>
                    </PulsingFormControl>
                  ))
                }
              </>
            )}

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
