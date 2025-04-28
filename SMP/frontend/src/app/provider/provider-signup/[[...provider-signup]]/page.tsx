"use client";

import {
  Box,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { useSignUp } from '@clerk/nextjs';
import { GoogleOneTap } from '@clerk/nextjs';
import { useRouter } from "next/navigation";
import axios from 'axios';

import DraggableMap from '@/components/DraggableMap'; // <- Your map component

interface Category {
  _id: string;
  categoryName: string;
  description: string;
  attributes: { [key: string]: string };
}

export default function ProviderSignUpPage() {
  const { signUp } = useSignUp();


  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    bio: '',
    birthday: '',
    profilePicture: null,
  });

  const [baseLocation, setBaseLocation] = useState({ lat: -1.286389, lng: 36.817223 });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryAttributes, setCategoryAttributes] = useState<Category['attributes']>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attributeValues, setAttributeValues] = useState({});
  const router = useRouter();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/getCategories`);
        setCategories(response.data);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError('Failed to load categories.');
      }
    };

    fetchCategories();
  }, []);

  const handleChange = (e) => {
    if (e.target.name === 'profilePicture') {
      setFormData({ ...formData, profilePicture: e.target.files[0] });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleCategoryChange = (event) => {
    const categoryId = event.target.value;
    setSelectedCategory(categoryId);
    const selectedCat = categories.find(cat => cat._id === categoryId);
    setCategoryAttributes(selectedCat?.attributes || {});
    const initialAttributeValues: { [key: string]: string } = {};
    if (selectedCat?.attributes) {
      Object.keys(selectedCat.attributes).forEach(key => {
        initialAttributeValues[key] = '';
      });
    }
    setAttributeValues(initialAttributeValues);
  };

  const handleAttributeChange = (e) => {
    const { name, value } = e.target;
    setAttributeValues(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
      e.preventDefault();
      setError('');
      setLoading(true);

      if (!selectedCategory) {
        setError('Please select a category.');
        setLoading(false);
        return;
      }

      try {
        const result = await signUp.create({
          emailAddress: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
        });

        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });

        const formDataToSend = new FormData();
        formDataToSend.append('clerkId', result.id);
        formDataToSend.append('firstName', formData.firstName);
        formDataToSend.append('lastName', formData.lastName);
        formDataToSend.append('email', formData.email);
        formDataToSend.append('phoneNumber', formData.phoneNumber);
        formDataToSend.append('bio', formData.bio);
        formDataToSend.append('userType', 'Provider');
        formDataToSend.append('birthday', formData.birthday);
        formDataToSend.append('baseLocation[lat]', baseLocation.lat);
        formDataToSend.append('baseLocation[lng]', baseLocation.lng);
        formDataToSend.append('category', selectedCategory); // Send selectedCategory as 'category'

        Object.entries(attributeValues).forEach(([key, value]) => {
          formDataToSend.append(`attributes[${key}]`, value); // Send attributes with the correct naming convention
        });

        if (formData.profilePicture) {
          formDataToSend.append('profilePicture', formData.profilePicture);
        }

        await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/addProvider`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        alert('Provider signup successful! Check your email for verification.');

        router.push('/provider-dash');
      } catch (err) {
        console.error('Signup error:', err);
        setError(err.errors?.[0]?.message || 'Signup failed. Try again.');
      } finally {
        setLoading(false);
      }
    };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="#f5f5f5" padding="20px">
      <Box maxWidth="600px" bgcolor="white" p={4} borderRadius={8} boxShadow={3}>
        <Typography variant="h5" align="center" gutterBottom>
          Provider Sign Up
        </Typography>

        <GoogleOneTap signUpForceRedirectUrl="/completeProviderProfile" />

        {error && <Alert severity="error">{error}</Alert>}
        <form onSubmit={handleSubmit}>
          <TextField fullWidth margin="normal" label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} required />
          <TextField fullWidth margin="normal" label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} required />
          <TextField fullWidth margin="normal" label="Email" name="email" value={formData.email} onChange={handleChange} required />
          <TextField fullWidth margin="normal" label="Password" type="password" name="password" value={formData.password} onChange={handleChange} required />
          <TextField fullWidth margin="normal" label="Confirm Password" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
          <TextField fullWidth margin="normal" label="Phone Number" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required />
          <TextField fullWidth margin="normal" label="Birthday" type="date" name="birthday" InputLabelProps={{ shrink: true }} value={formData.birthday} onChange={handleChange} />
          <TextField fullWidth margin="normal" label="Bio" name="bio" value={formData.bio} onChange={handleChange} />

          <input
            type="file"
            accept="image/*"
            name="profilePicture"
            onChange={handleChange}
            style={{ marginTop: '10px', display: 'block' }}
          />

          {/* Map Picker */}
          <Box mt={2}>
            <Typography>Pick your base location:</Typography>
            <DraggableMap location={baseLocation} setLocation={setBaseLocation} />
          </Box>

          {/* Category Selection */}
          <FormControl fullWidth margin="normal" required>
            <InputLabel id="category-label">Category</InputLabel>
            <Select
              labelId="category-label"
              id="category"
              value={selectedCategory || ''}
              onChange={handleCategoryChange}
              label="Category"
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat._id} value={cat._id}>
                  {cat.categoryName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Dynamic Attribute Fields as Dropdowns */}
          {selectedCategory && Object.entries(categoryAttributes).map(([attributeName, attributeOptions]) => (
            <FormControl key={attributeName} fullWidth margin="normal" required>
              <InputLabel id={`${attributeName}-label`}>{attributeName}</InputLabel>
              <Select
                labelId={`${attributeName}-label`}
                id={attributeName}
                name={attributeName}
                value={attributeValues[attributeName] || ''}
                onChange={handleAttributeChange}
                label={attributeName}
              >
                {attributeOptions.split(',').map((option) => (
                  <MenuItem key={option.trim()} value={option.trim()}>
                    {option.trim()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ))}

          <Button type="submit" fullWidth variant="contained" color="primary" disabled={loading || !selectedCategory} sx={{ marginTop: 2 }}>
            {loading ? <CircularProgress size={24} /> : 'Sign Up as Provider'}
          </Button>
        </form>

        <Typography align="center" mt={2}>
          Already have an account?
        </Typography>
        <Button fullWidth variant="outlined" color="secondary" href="/sign-in" sx={{ mt: 1 }}>
          Sign In
        </Button>
      </Box>
    </Box>
  );
}