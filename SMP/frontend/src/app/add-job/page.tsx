"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import dynamic from "next/dynamic";
import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import {
  TextField,
  Button,
  MenuItem,
  Container,
  Typography,
  Select,
  FormControl,
  InputLabel,
  Box,
  FormHelperText,
  CircularProgress,
  Alert,
} from "@mui/material";

// --- Google Maps Integration ---
import { GoogleMap, MarkerF, useLoadScript, Autocomplete } from '@react-google-maps/api';

const libraries: ("places")[] = ["places"];
const mapContainerStyle = {
  height: '400px',
  width: '100%',
  borderRadius: '4px',
  border: '1px solid #ccc'
};
const defaultLocation = { lat: -24.6282, lng: 25.9231 };
// --- End Google Maps Integration ---


// Interface for Category data
interface Category {
    _id: string;
    categoryName: string;
    attributes?: Record<string, string>;
}

// Interface for Job data structure
interface JobData {
    title: string;
    description: string;
    categoryId: string;
    categoryName: string; // Stores the category name
    budget: string;
    location: { lat: number | null; lng: number | null };
    attributes: Record<string, string>;
}

const AddJob = () => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const { user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const clerkUserId = user?.id;
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [jobData, setJobData] = useState<JobData>({
    title: "",
    description: "",
    categoryId: "",
    categoryName: "", // Initialize category name
    budget: "",
    location: defaultLocation,
    attributes: {},
  });
  const [budgetError, setBudgetError] = useState("");
  const [formError, setFormError] = useState("");

  // --- Google Maps State and Refs ---
  const [autocompleteInstance, setAutocompleteInstance] = useState<google.maps.places.Autocomplete | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { isLoaded: isMapLoaded, loadError: mapLoadError } = useLoadScript({
      googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
      libraries,
  });
  // --- End Google Maps State ---

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  // Fetch Categories
  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/getCategories`)
      .then((response) => {
         if (Array.isArray(response.data)) {
             setCategories(response.data);
         } else {
            console.error("Error: Categories data is not an array:", response.data);
            setCategories([]);
         }
      })
      .catch((error) => {
          console.error("Error fetching categories:", error);
          setFormError("Failed to load job categories. Please try refreshing.");
      });
  }, [API_BASE_URL]);


  // Handle standard input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setJobData((prev) => ({ ...prev, [name]: value }));

    if (name === "budget") {
      const budgetValue = Number(value);
      if (isNaN(budgetValue) || budgetValue < 20) {
        setBudgetError("Budget must be a positive number, minimum P20.");
      } else {
        setBudgetError("");
      }
    }
  };

  // Handle Category selection change
  const handleCategoryChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const selectedId = event.target.value as string;
    const selected = categories.find((cat) => cat._id === selectedId) || null;
    setSelectedCategory(selected);
    // Update both categoryId and categoryName in state
    setJobData((prev) => ({
      ...prev,
      categoryId: selected?._id || "",
      categoryName: selected?.categoryName || "", // Set the name here
      attributes: {},
    }));
  };

  // Handle changes in dynamic attribute dropdowns
  const handleAttributeChange = (key: string, value: string) => {
    setJobData((prev) => ({
      ...prev,
      attributes: { ...prev.attributes, [key]: value },
    }));
  };

  // --- Google Maps Event Handlers ---
  const handleMapClick = useCallback((event: google.maps.MapMouseEvent) => {
      if (event.latLng) {
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();
          setJobData(prev => ({ ...prev, location: { lat, lng } }));
      }
  }, []);

  const handleMarkerDragEnd = useCallback((event: google.maps.MapMouseEvent) => {
      if (event.latLng) {
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();
          setJobData(prev => ({ ...prev, location: { lat, lng } }));
      }
  }, []);

  const onPlaceChanged = useCallback(() => {
      if (autocompleteInstance) {
          const place = autocompleteInstance.getPlace();
          if (place.geometry && place.geometry.location) {
              const lat = place.geometry.location.lat();
              const lng = place.geometry.location.lng();
              setJobData(prev => ({ ...prev, location: { lat, lng } }));
          } else {
              console.warn("Autocomplete place changed but no geometry found:", place);
          }
      }
  }, [autocompleteInstance]);

  const onAutocompleteLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
      setAutocompleteInstance(autocomplete);
  }, []);
  // --- End Google Maps Event Handlers ---


  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError("");

    // --- Validation ---
    if (budgetError) {
      setFormError("Please fix the budget error before submitting.");
      setLoading(false);
      return;
    }
    if (isNaN(Number(jobData.budget)) || Number(jobData.budget) < 20) {
      setBudgetError("Budget must be a number greater than P20.");
      setFormError("Budget must be at least P20.");
      setLoading(false);
      return;
    }
    if (jobData.location.lat === null || jobData.location.lng === null) {
      setFormError("Please select a location on the map or using the search bar.");
      setLoading(false);
      return;
    }
    const requiredAttributes = Object.keys(selectedCategory?.attributes || {});
    const missingAttributes = requiredAttributes.filter(key => !jobData.attributes[key]);
    if (missingAttributes.length > 0) {
        setFormError(`Please select values for the following attributes: ${missingAttributes.join(', ')}`);
        setLoading(false);
        return;
    }
    // Ensure category name is also present in state before submitting
    if (!jobData.title || !jobData.description || !jobData.categoryId || !jobData.categoryName) {
        setFormError("Please fill in all required fields (Title, Description, Category).");
        setLoading(false);
        return;
    }

    // --- Prepare Data ---
    let mongoUserId: string | null = null;
    try {
      const userResponse = await axios.get(`${API_BASE_URL}/getUserByClerkId/${clerkUserId}`);
      mongoUserId = userResponse.data?._id;
      if (!mongoUserId) throw new Error("User not found in database.");
    } catch (error: any) {
      console.error("Error fetching MongoDB user ID:", error);
      setFormError(`Failed to verify user: ${error.message || "Unknown error"}`);
      setLoading(false);
      return;
    }

    // *** FIX: Add categoryName to the data sent to the backend ***
    const formattedJobData = {
      title: jobData.title,
      description: jobData.description,
      budget: Number(jobData.budget),
      categoryId: jobData.categoryId,
      category: jobData.categoryName, // Add the category name here
      attributes: jobData.attributes,
      seekerId: mongoUserId,
      location: {
        type: "Point",
        coordinates: [jobData.location.lng, jobData.location.lat],
      },
    };

    // --- API Call ---
    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication token not available.");

      console.log("Submitting job data:", formattedJobData); // Log the data being sent
      await axios.post(`${API_BASE_URL}/addJob`, formattedJobData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert("Job posted successfully!");
      router.push("/view-jobs");

    } catch (error: any) {
      // Log the detailed error response if available
      console.error("Error adding job:", error.response ? error.response.data : error.message);
      setFormError(`Failed to add job: ${error.response?.data?.error || error.response?.data?.message || error.message || "An unknown error occurred."}`);
    } finally {
      setLoading(false);
    }
  };


  // --- Render ---
   if (mapLoadError) {
      return (
         <Box sx={{ display: "flex", minHeight: "100vh" }}>
            <Sidebar />
            <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, ml: { sm: '240px' }, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
               <Alert severity="error">Error loading Google Maps. Please check your API key and network connection.</Alert>
            </Box>
         </Box>
      );
   }

   if (!isMapLoaded) {
      return (
         <Box sx={{ display: "flex", minHeight: "100vh" }}>
            <Sidebar />
             <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, ml: { sm: '240px' }, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
               <CircularProgress />
               <Typography sx={{ ml: 2 }}>Loading Map...</Typography>
            </Box>
         </Box>
      );
   }

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: 'background.default' }}>
      <Sidebar />
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, ml: { sm: '240px' } }}>
        <Container maxWidth="md">
          <Typography variant="h4" component="h1" sx={{ mt: 2, mb: 1, textAlign: "center", color: "primary.main", fontWeight: 'bold' }}>
            Post a New Job
          </Typography>
          <Typography variant="subtitle1" sx={{ mb: 3, textAlign: "center", color: "text.secondary" }}>
             Fill in the details below to create a new job listing. Providers will be able to view and bid on your job.
          </Typography>

          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}

          <form onSubmit={handleSubmit} noValidate>
            {/* Job Title */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <TextField id="job-title" label="Job Title" name="title" value={jobData.title} onChange={handleChange} required variant="outlined" />
              <FormHelperText>Enter a clear and concise title for your job (e.g., "Fix Leaking Kitchen Sink").</FormHelperText>
            </FormControl>

            {/* Description */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <TextField id="job-description" multiline rows={4} label="Detailed Description" name="description" value={jobData.description} onChange={handleChange} required variant="outlined" />
              <FormHelperText>Provide as much detail as possible about the job requirements, tasks involved, and any specific conditions.</FormHelperText>
            </FormControl>

            {/* Category */}
            <FormControl fullWidth required sx={{ mb: 3 }} error={!jobData.categoryId && !!formError}>
              <InputLabel id="category-select-label">Category</InputLabel>
              <Select labelId="category-select-label" id="category-select" value={jobData.categoryId} label="Category" onChange={handleCategoryChange} >
                 <MenuItem value="" disabled><em>Select a category...</em></MenuItem>
                 {categories.length > 0 ? categories.map((cat) => (<MenuItem key={cat._id} value={cat._id}>{cat.categoryName}</MenuItem>)) : <MenuItem disabled>Loading categories...</MenuItem>}
              </Select>
              <FormHelperText>Choose the category that best fits your job. This helps providers find relevant tasks.</FormHelperText>
            </FormControl>

            {/* Dynamic Attributes */}
            {selectedCategory && selectedCategory.attributes && Object.entries(selectedCategory.attributes).map(([key, value]) => (
              <FormControl fullWidth required sx={{ mb: 3 }} key={key} error={!jobData.attributes[key] && !!formError}>
                <InputLabel id={`attribute-label-${key}`}>{key}</InputLabel>
                <Select labelId={`attribute-label-${key}`} id={`attribute-select-${key}`} label={key} value={jobData.attributes[key] || ""} onChange={(e) => handleAttributeChange(key, e.target.value as string)} >
                   <MenuItem value="" disabled><em>Select {key}...</em></MenuItem>
                   {(typeof value === 'string' ? value.split(',') : []).map((option) => (<MenuItem key={option.trim()} value={option.trim()}>{option.trim()}</MenuItem>))}
                </Select>
                 <FormHelperText>Select the appropriate option for '{key}'.</FormHelperText>
              </FormControl>
            ))}

            {/* Budget */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <TextField id="job-budget" type="number" label="Your Budget (Pula)" name="budget" value={jobData.budget} onChange={handleChange} required error={!!budgetError} inputProps={{ min: "20", step: "any" }} InputProps={{ startAdornment: <Typography sx={{ mr: 0.5 }}>P</Typography> }} variant="outlined" />
              <FormHelperText error={!!budgetError}>{budgetError || "Enter the maximum amount you are willing to pay in Pula (minimum P20). Providers will bid based on this."}</FormHelperText>
            </FormControl>

             {/* Location Selection */}
            <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>Job Location</Typography>
             <FormHelperText sx={{ mb: 2 }}>
                Use the search bar to find the job location, click directly on the map, or drag the marker to the precise spot.
            </FormHelperText>

            <Box sx={{ mb: 2 }}>
                 <Autocomplete
                    onLoad={onAutocompleteLoad}
                    onPlaceChanged={onPlaceChanged}
                 >
                  <TextField
                     inputRef={searchInputRef}
                     fullWidth
                     placeholder="Search for job location..."
                     variant="outlined"
                     size="small"
                     sx={{ '& .MuiOutlinedInput-root': { paddingRight: '0 !important' } }}
                  />
                 </Autocomplete>
             </Box>

            <Box sx={{ height: mapContainerStyle.height, width: mapContainerStyle.width, mb: 3, position: 'relative' }}>
               <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={jobData.location || defaultLocation}
                  zoom={13}
                  onClick={handleMapClick}
                  options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
               >
                  {jobData.location?.lat && jobData.location?.lng && (
                     <MarkerF
                        position={jobData.location}
                        draggable={true}
                        onDragEnd={handleMarkerDragEnd}
                     />
                  )}
               </GoogleMap>
            </Box>

            {/* Submit Button */}
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
              <Button type="submit" variant="contained" color="primary" disabled={loading} size="large" startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null} >
                {loading ? "Posting Job..." : "Post Job Now"}
              </Button>
            </Box>
          </form>
        </Container>
      </Box>
    </Box>
  );
};

export default AddJob;
