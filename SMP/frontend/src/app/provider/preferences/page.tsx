"use client";

import { useUser  } from "@clerk/nextjs";
import { useEffect, useState } from "react";
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
import ProviderSidebar from "@/components/ProviderSidebar";

export default function ProviderPreferences() {
  const { user } = useUser ();
  const [providerDetails, setProviderDetails] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [newAttributes, setNewAttributes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch provider details and categories on component mount
  useEffect(() => {
    const fetchProviderDetails = async () => {
      if (!user) return; // Ensure user is available
      try {
        const providerResponse = await axios.get(`http://localhost:5000/api/provider/details/${user.id}`); // Pass clerkId
        setProviderDetails(providerResponse.data);
      } catch (err) {
        console.error("Error fetching provider details:", err);
        setError("Failed to load provider details.");
      }
    };

    const fetchCategories = async () => {
      try {
        const categoriesResponse = await axios.get("http://localhost:5000/api/getCategories");
        setCategories(categoriesResponse.data);
      } catch (err) {
        console.error("Error fetching categories:", err);
        setError("Failed to load categories.");
      }
    };

    fetchProviderDetails();
    fetchCategories();
    setLoading(false);
  }, [user]);

  const handleAddCategory = async () => {
    try {
      await axios.post("/api/provider/addCategory", {
        categoryId: selectedCategory,
        attributes: newAttributes,
      });
      setSelectedCategory("");
      setNewAttributes({});
    } catch (err) {
      console.error("Error adding category:", err);
      setError("Failed to add category.");
    }
  };

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <ProviderSidebar />

      <Box sx={{ flexGrow: 1, p: 4, ml: { xs: 0, md: "240px" } }}>
        <Typography variant="h4" gutterBottom>
          Provider Preferences
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}
        {providerDetails && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6">Provider Details</Typography>
            <Typography>Name: {providerDetails.firstName} {providerDetails.lastName}</Typography>
            <Typography>Email: {providerDetails.email}</Typography>
            <Typography>Phone: {providerDetails.phoneNumber}</Typography>
            <Typography>Bio: {providerDetails.bio}</Typography>
          </Box>
        )}

        <Typography variant="h6">Add New Category</Typography>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={selectedCategory}
            onChange={(e) => {
              const categoryId = e.target.value;
              setSelectedCategory(categoryId);
              const selectedCat = categories.find(cat => cat._id === categoryId);
              if (selectedCat && selectedCat.attributes) {
                const attrs = {};
                Object.keys(selectedCat.attributes).forEach(key => {
                  attrs[key] = ""; // Initialize attributes for input
                });
                setNewAttributes(attrs);
              } else {
                setNewAttributes({});
              }
            }}
          >
            {categories.map((cat) => (
              <MenuItem key={cat._id} value={cat._id}>
                {cat.categoryName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedCategory && (
          <Box>
            <Typography variant="subtitle1">Attributes for {selectedCategory}</Typography>
            {Object.entries(newAttributes).map(([key]) => (
              <TextField
                key={key}
                fullWidth
                label={key}
                value={newAttributes[key] || ""}
                onChange={(e) => setNewAttributes({ ...newAttributes, [key]: e.target.value })}
                sx={{ mb: 2 }}
              />
            ))}
          </Box>
        )}

        <Button variant="contained" onClick={handleAddCategory} disabled={!selectedCategory || Object.values(newAttributes).some(attr => !attr)}>
          Add Category
        </Button>
      </Box>
    </Box>
  );
}