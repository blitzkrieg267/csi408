"use client";

import { useUser, useAuth } from "@clerk/nextjs";
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import axios from "axios";
import {
    Box, Typography, Paper, Button, CircularProgress, Alert,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from "@mui/material";
import ProviderSidebar from "@/components/ProviderSidebar";
import { format } from 'date-fns';
import { GoogleMap, MarkerF, useLoadScript } from '@react-google-maps/api';

// --- Interfaces ---
// Updated Job interface based on provided Schema
interface Job {
    _id: string;
    title: string;
    // Include all statuses from the schema's enum
    status?: 'Pending' | 'Open' | 'In Progress' | 'Completed' | 'Cancelled';
    createdAt: string; // Or another relevant date like completedAt / updatedAt
    location?: {
        type: 'Point';
        coordinates: [number, number]; // [longitude, latitude]
    };
    // Include other potentially relevant fields from schema if needed for display
    categoryId?: string; // ObjectId as string
    seekerId?: string; // ObjectId as string
    providerId?: string; // ObjectId as string (should match current user for history)
    category?: string; // Category name
    attributes?: Record<string, string>;
    budget?: { $numberDecimal: string }; // Representing Decimal128
    agreedAmount?: { $numberDecimal: string }; // Representing Decimal128
    // altLocationId is likely not needed for display
}

// --- Map Configuration ---
const libraries: ("places")[] = ["places"];
const mapContainerStyle = {
    height: '500px',
    width: '100%',
    borderRadius: '8px',
    border: '1px solid #eee',
    marginTop: '24px',
};
const defaultMapCenter = { lat: -24.6282, lng: 25.9231 };
const defaultZoom = 8;

// --- Marker Icons/Options ---
const defaultMarkerOptions = {};
const highlightedMarkerOptions = { zIndex: 1000 };


export default function ProviderDashboard() {
    const { user } = useUser();
    const { userId: clerkUserId, getToken } = useAuth();
    const [mongoUserId, setMongoUserId] = useState<string | null>(null);
    const [jobHistory, setJobHistory] = useState<Job[]>([]);
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const mapRef = useRef<google.maps.Map | null>(null);
    const [mapCenter, setMapCenter] = useState(defaultMapCenter);
    const [mapZoom, setMapZoom] = useState(defaultZoom);

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

    // --- Load Google Maps API ---
    const { isLoaded: isMapLoaded, loadError: mapLoadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries,
    });

    // --- Fetch User ID ---
    useEffect(() => {
        if (clerkUserId) {
            setLoading(true);
            axios.get(`${API_BASE_URL}/getUserByClerkId/${clerkUserId}`)
                .then(res => {
                    if (res.data?._id) { setMongoUserId(res.data._id); }
                    else { setError("Could not retrieve linked user profile."); setLoading(false); }
                })
                .catch(err => { console.error("Failed to fetch user data:", err); setError("Failed to load user profile."); setLoading(false); });
        } else if (clerkUserId === null) { setError("User not logged in."); setLoading(false); }
    }, [clerkUserId, API_BASE_URL]);

    // --- Fetch Job History ---
    useEffect(() => {
        const fetchJobHistory = async () => {
            if (!mongoUserId) return;
            setLoading(true); setError(null);
            try {
                const token = await getToken();
                if (!token) throw new Error("Authentication token missing.");

                // *** This component relies on an endpoint returning the provider's job history ***
                // *** The provided backend snippets focus on open jobs/bidding ***
                const response = await axios.get<Job[]>(
                    `${API_BASE_URL}/getProviderJobHistory/${mongoUserId}`
                );

                const historyData = response.data || [];
                setJobHistory(historyData);

                const latestJobWithLocation = historyData.find(job => job.location?.coordinates);
                if (latestJobWithLocation?.location?.coordinates) {
                    setMapCenter({ lat: latestJobWithLocation.location.coordinates[1], lng: latestJobWithLocation.location.coordinates[0] });
                    setMapZoom(5);
                } else { setMapCenter(defaultMapCenter); setMapZoom(defaultZoom); }

            } catch (err: any) { console.error("Failed to load job history", err); setError(err.response?.data?.message || err.message || "Failed to load job history"); }
            finally { setLoading(false); }
        };
        fetchJobHistory();
    }, [mongoUserId, getToken, API_BASE_URL]);

    // --- Map Callbacks ---
    const onMapLoad = useCallback((mapInstance: google.maps.Map) => { mapRef.current = mapInstance; }, []);
    const onMapUnmount = useCallback(() => { mapRef.current = null; }, []);

    // --- Table Row Click Handler ---
    const handleRowClick = useCallback((job: Job) => {
        setSelectedJobId(job._id);
        if (job.location?.coordinates && mapRef.current) {
            const newCenter = { lat: job.location.coordinates[1], lng: job.location.coordinates[0] };
            mapRef.current.panTo(newCenter);
            mapRef.current.setZoom(14);
        }
    }, []);

    // --- Helper Functions ---
    const formatLocation = (location?: Job['location']) => { /* ... keep as before ... */ };
    const recentJobs = useMemo(() => jobHistory.slice(0, 10), [jobHistory]);

    // --- Render Logic ---
    if (loading) { /* ... loading indicator ... */ }

    return (
        <Box sx={{ display: "flex", minHeight: "100vh" }}>
            <ProviderSidebar />
            <Box sx={{ flexGrow: 1, p: { xs: 2, md: 4 }, ml: { xs: 0, md: "240px" } }}>
                <Typography variant="h4" gutterBottom> Welcome back, {user?.firstName} 👋 </Typography>
                <Typography variant="h5" gutterBottom sx={{ mb: 2 }}> Your Recent Job Locations </Typography>

                {error && ( <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> )}

                {/* Job History Table */}
                {/* Description + Navigation Button */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        This is your provider dashboard. As a service provider, you can view the history of jobs you've worked on,
                        track their progress, and use the map to explore where you've worked. Click "FIND WORK" to discover new job
                        opportunities that match your skills and preferences.
                    </Typography>
                    <Button variant="contained" color="primary" href="/provider/view-jobs">
                        FIND WORK
                    </Button>
                </Box>

                {/* Job History Table */}
                <Paper elevation={2} sx={{ mb: 3 }}>
                    <TableContainer sx={{ maxHeight: 440 }}>
                        <Table stickyHeader aria-label="job history table" size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Job Title</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {recentJobs.length === 0 && !loading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center">No job history found.</TableCell>
                                    </TableRow>
                                ) : (
                                    recentJobs.map((job) => (
                                        <TableRow hover key={job._id} selected={selectedJobId === job._id} onClick={() => handleRowClick(job)}
                                            sx={{
                                                cursor: 'pointer',
                                                '&.Mui-selected': { backgroundColor: 'action.selected' },
                                                '&.Mui-selected:hover': { backgroundColor: 'action.hover' }
                                            }}>
                                            <TableCell>{job.title}</TableCell>
                                            <TableCell>{job.status || 'N/A'}</TableCell>
                                            <TableCell>{format(new Date(job.createdAt), 'PP')}</TableCell>
                                            <TableCell align="center">
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    color="secondary"
                                                    href={`/provider/jobDetails?id=${job._id}`}
                                                    onClick={(e) => e.stopPropagation()} // Prevent row click
                                                >
                                                    View More
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>


                {/* Map Display */}
                 <Typography variant="h5" gutterBottom sx={{ mb: 1 }}> Job Location Map </Typography>
                <Paper elevation={2}>
                    {mapLoadError ? ( <Alert severity="error">Map cannot be loaded. Please check API key.</Alert> )
                    : !isMapLoaded ? ( <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box> )
                    : (
                        <GoogleMap mapContainerStyle={mapContainerStyle} center={mapCenter} zoom={mapZoom} onLoad={onMapLoad} onUnmount={onMapUnmount} options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: true }} >
                            {jobHistory.map((job) =>
                                job.location?.coordinates && (
                                    <MarkerF key={job._id} position={{ lat: job.location.coordinates[1], lng: job.location.coordinates[0] }} title={job.title} options={selectedJobId === job._id ? highlightedMarkerOptions : defaultMarkerOptions} onClick={() => handleRowClick(job)} />
                                )
                            )}
                        </GoogleMap>
                    )}
                </Paper>
            </Box>
        </Box>
    );
}
