"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@clerk/nextjs';
import {
    Container, Box, Typography, CircularProgress, Alert, Paper, Grid,
    List, ListItem, ListItemText, Divider, Chip, Avatar,
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CakeIcon from '@mui/icons-material/Cake';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import CategoryIcon from '@mui/icons-material/Category';
import { format, differenceInYears } from 'date-fns';

// --- Interfaces ---
interface UserProfile {
    _id: string;
    clerkId: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    userType: 'Seeker' | 'Provider';
    profilePicture?: string;
    bio: string;
    createdAt: string;
    updatedAt?: string;
    providerAttributes?: {
        birthday?: string;
        baseLocation?: {
            lat: number;
            lng: number;
        };
        selectedCategories?: {
            categoryId: string;
            attributes: Record<string, string>;
        }[];
    };
}

const ViewProfile = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { getToken } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const userId = searchParams.get('id'); // Get the user ID from query params
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

    const fetchUserProfile = useCallback(async () => {
        if (!userId) {
            setError("User ID is missing.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const token = await getToken();
            // Adjust the endpoint to fetch user details by MongoDB ID
            const res = await axios.get(`${API_BASE_URL}/getUser/${userId}`, { // changed from  /getUserByMongoId
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.data) {
                setError("Profile not found.");
                setLoading(false);
                return;
            }
            setProfile(res.data);
        } catch (err: any) {
            console.error("Error fetching user profile:", err);
            setError(err.response?.data?.message || err.message || "Failed to load profile.");
        } finally {
            setLoading(false);
        }
    }, [userId, getToken, API_BASE_URL]);

    useEffect(() => {
        fetchUserProfile();
    }, [fetchUserProfile]);

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
                <CircularProgress /><Typography sx={{ ml: 2 }}>Loading Profile...</Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    if (!profile) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="warning">Profile not found.</Alert>
            </Box>
        );
    }

    const calculateAge = (birthday: string | undefined) => {
        if (!birthday) return 'N/A';
        try{
            const birthDate = new Date(birthday);
            const today = new Date();
            return differenceInYears(today, birthDate);
        }
        catch(e){
            return "Invalid Date"
        }

    };

    const displayLocation = (location?: { lat: number; lng: number }) => {
        if (!location) return 'Not provided';
        return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
    };

    // Render different content based on user type.  The original request was specifically for a Seeker viewing a Provider.
    if (profile.userType === 'Provider') {
        return (
            <Box sx={{ display: 'flex' }}>
                {/* The original request said this page must maintain the basic structure styling of the others having consistent sidebar etc etc.  */}
                {/* If this is meant to be shown in the main content area, and not a full page, then the Sidebar component should be omitted. */}
                {/* <Sidebar /> */}
                <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                    <Paper elevation={3} sx={{ p: { xs: 2, md: 4 } }}>
                        <Grid container spacing={4}>
                            {/* Left Column: Basic Profile */}
                            <Grid item xs={12} md={4}>
                                <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
                                    <Avatar
                                        src={profile.profilePicture}
                                        alt={`${profile.firstName} ${profile.lastName}`}
                                        sx={{ width: 120, height: 120, mb: 2 }}
                                    />
                                    <Typography variant="h5" component="h1" gutterBottom>
                                        {profile.firstName} {profile.lastName}
                                    </Typography>
                                    <Typography variant="subtitle1" color="text.secondary">
                                        {profile.userType}
                                    </Typography>
                                </Box>

                                <Typography variant="h6" gutterBottom>Contact Information</Typography>
                                <List dense>
                                    <ListItem>
                                        <EmailIcon sx={{ mr: 1, color: 'action.active' }} />
                                        <ListItemText primary={profile.email} />
                                    </ListItem>
                                    <ListItem>
                                        <PhoneIcon sx={{ mr: 1, color: 'action.active' }} />
                                        <ListItemText primary={profile.phoneNumber || 'N/A'} />
                                    </ListItem>
                                    <ListItem>
                                        <LocationOnIcon sx={{ mr: 1, color: 'action.active' }} />
                                        <ListItemText primary={`Location: ${displayLocation(profile.providerAttributes?.baseLocation)}`} />
                                    </ListItem>
                                    {profile.providerAttributes?.birthday && (
                                        <ListItem>
                                            <CakeIcon sx={{ mr: 1, color: 'action.active' }} />
                                            <ListItemText primary={`Age: ${calculateAge(profile.providerAttributes.birthday)}`} />
                                        </ListItem>
                                    )}
                                </List>
                            </Grid>

                            {/* Right Column: Provider Details / Portfolio */}
                            <Grid item xs={12} md={8}>
                                <Typography variant="h6" gutterBottom>About Me</Typography>
                                <Typography variant="body1" paragraph>
                                    {profile.bio || 'No bio provided.'}
                                </Typography>

                                {profile.providerAttributes?.selectedCategories && (
                                    <Box sx={{ mt: 3 }}>
                                        <Typography variant="h6" gutterBottom>Categories & Skills</Typography>
                                        <Grid container spacing={2}>
                                            {profile.providerAttributes.selectedCategories.map((category) => (
                                                <Grid item key={category.categoryId}>
                                                    <Chip
                                                        icon={<CategoryIcon />}
                                                        label={category.categoryId} //  Display the category name, not the ID.
                                                        color="primary"
                                                        variant="outlined"
                                                    />
                                                </Grid>
                                            ))}
                                        </Grid>
                                    </Box>
                                )}
                                 {profile.providerAttributes?.selectedCategories && profile.providerAttributes.selectedCategories.length > 0 && (
                                    <Box sx={{ mt: 3 }}>
                                        <Typography variant="h6" gutterBottom>Attributes</Typography>
                                         {profile.providerAttributes.selectedCategories.map((category) => {
                                            return category.attributes && Object.keys(category.attributes).length > 0 ? (
                                                <div key={category.categoryId}>
                                                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                                                    {`Category: ${category.categoryId}`}
                                                </Typography>
                                                <List dense>
                                                    {Object.entries(category.attributes).map(([key, value]) => (
                                                    <ListItem key={key} disableGutters sx={{ pb: 0.5 }}>
                                                        <ListItemText
                                                        primary={`${key}:`}
                                                        secondary={value}
                                                        primaryTypographyProps={{ fontWeight: 'medium' }}
                                                        secondaryTypographyProps={{ color: 'text.primary' }}
                                                        />
                                                    </ListItem>
                                                    ))}
                                                </List>
                                                </div>
                                            ) : null;
                                        })}
                                    </Box>
                                )}
                            </Grid>
                        </Grid>
                    </Paper>
                </Container>
            </Box>
        );
    }
    else {
        return (
            <Box sx={{ display: 'flex' }}>
                {/* <Sidebar /> */}
                <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                    <Paper elevation={3} sx={{ p: { xs: 2, md: 4 } }}>
                        <Typography variant="h4" component="h1" gutterBottom>
                            Seeker Profile
                        </Typography>
                        <Divider sx={{ mb: 3 }} />
                        <Grid container spacing={4}>
                            <Grid item xs={12} md={4}>
                                <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
                                    <Avatar
                                        src={profile.profilePicture}
                                        alt={`${profile.firstName} ${profile.lastName}`}
                                        sx={{ width: 120, height: 120, mb: 2 }}
                                    />
                                    <Typography variant="h5" component="h1" gutterBottom>
                                        {profile.firstName} {profile.lastName}
                                    </Typography>
                                    <Typography variant="subtitle1" color="text.secondary">
                                        {profile.userType}
                                    </Typography>
                                </Box>
                                <Typography variant="h6" gutterBottom>Contact Information</Typography>
                                    <List dense>
                                        <ListItem>
                                            <EmailIcon sx={{ mr: 1, color: 'action.active' }} />
                                            <ListItemText primary={profile.email} />
                                        </ListItem>
                                        <ListItem>
                                            <PhoneIcon sx={{ mr: 1, color: 'action.active' }} />
                                            <ListItemText primary={profile.phoneNumber || 'N/A'} />
                                        </ListItem>
                                    </List>
                            </Grid>
                            <Grid item xs={12} md={8}>
                                <Typography variant="h6" gutterBottom>Bio</Typography>
                                <Typography variant="body1" paragraph>
                                    {profile.bio || "No bio provided"}
                                </Typography>
                            </Grid>
                        </Grid>
                    </Paper>
                </Container>
            </Box>
        )
    }
};

export default ViewProfile;
