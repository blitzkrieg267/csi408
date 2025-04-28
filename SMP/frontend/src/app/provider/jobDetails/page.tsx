"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { useAuth, useUser } from '@clerk/nextjs';
import {
    Container, Box, Typography, CircularProgress, Alert, Paper, Grid, Button,
    List, ListItem, ListItemText, Divider, Chip, Link as MuiLink, IconButton, Card, CardContent, CardHeader
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import DirectionsIcon from '@mui/icons-material/Directions';
import CheckCircleIcon from '@mui/icons-material/CheckCircle'; // For Mark Completed
import AccountCircleIcon from '@mui/icons-material/AccountCircle'; // For Seeker
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'; // For Budget/Bid
import EventIcon from '@mui/icons-material/Event'; // For Dates
import CategoryIcon from '@mui/icons-material/Category'; // For Category
import InfoIcon from '@mui/icons-material/Info'; // For Status
import NotesIcon from '@mui/icons-material/Notes'; // For Description
import BuildIcon from '@mui/icons-material/Build'; // For Requirements
import Sidebar from '@/components/ProviderSidebar'; // *** IMPORTANT: Ensure this is the Provider's Sidebar ***
import { formatDistanceToNow, format } from 'date-fns';

// --- Google Maps Integration ---
import { GoogleMap, MarkerF, useLoadScript } from '@react-google-maps/api';

const libraries: ("places")[] = ["places"];
// Adjusted map style for bottom placement
const mapContainerStyle = {
    height: '400px', // Increased height
    width: '100%',
    borderRadius: '8px',
    border: '1px solid #eee'
};
const defaultMapCenter = { lat: -24.6282, lng: 25.9231 }; // Gaborone default
// --- End Google Maps Integration ---

// --- Interfaces ---
interface Job {
    _id: string;
    title: string;
    description: string;
    categoryId: string;
    category?: string; // Make optional as it might not always be populated directly
    budget?: { $numberDecimal: string } | string | number | null;
    status?: 'Pending' | 'Open' | 'In Progress' | 'Completed' | 'Cancelled';
    createdAt: string;
    updatedAt?: string;
    attributes?: Record<string, string>;
    providerId?: string; // ID of assigned provider
    seekerId: string;
    location?: { type: 'Point'; coordinates: [number, number]; }; // [lng, lat]
    agreedAmount?: { $numberDecimal: string } | string | number | null;
    completedAt?: string;
}

interface Bid {
    _id: string;
    amount: { $numberDecimal: string } | string | number; // Allow flexibility
    createdAt: string;
    providerId: string;
    // No need for providerDetails here as we only care about *our* bid
}

interface UserProfile { // For Seeker details
    _id: string;
    clerkId?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    // Add other fields if needed
}
// --- End Interfaces ---

const JobDetailsProviderView = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { getToken, userId: clerkUserId } = useAuth(); // Get provider's clerkId
    const { user } = useUser(); // Clerk user object

    const [jobDetails, setJobDetails] = useState<Job | null>(null);
    const [myBid, setMyBid] = useState<Bid | null>(null); // Store provider's bid if job is 'Open'
    const [seekerDetails, setSeekerDetails] = useState<UserProfile | null>(null); // Store seeker details
    const [mongoUserId, setMongoUserId] = useState<string | null>(null); // Provider's MongoDB ID
    const [isMyAssignedJob, setIsMyAssignedJob] = useState(false); // Is this job assigned to the current provider?
    const [loading, setLoading] = useState(true);
    const [loadingError, setLoadingError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [mapCenter, setMapCenter] = useState(defaultMapCenter);

    const jobId = searchParams.get('id');
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

    // --- Debugging Helper ---
    const log = (...args: any[]) => console.log("[JobDetailsProviderView]", ...args);

    // Load Google Maps script
    const { isLoaded: isMapLoaded, loadError: mapLoadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries,
    });

    // 1. Fetch Provider's MongoDB User ID
    useEffect(() => {
        log("Checking user for MongoDB ID...");
        if (clerkUserId) {
            log("Clerk user ID found:", clerkUserId);
            axios.get(`${API_BASE_URL}/getUserByClerkId/${clerkUserId}`)
                .then(res => {
                    if (res.data?._id) {
                        log("Provider MongoDB user ID fetched:", res.data._id);
                        setMongoUserId(res.data._id);
                    } else {
                        log("Error: MongoDB user ID not found in response", res.data);
                        setLoadingError("Failed to load your user profile.");
                        // Keep loading true until fetchJobData runs and potentially fails
                    }
                })
                .catch(err => {
                    log("Error fetching Provider MongoDB user ID:", err);
                    setLoadingError(`Failed to load your user profile: ${err.message}`);
                    // Keep loading true
                });
        } else if (user !== undefined) {
            log("Provider not logged in.");
            setLoadingError("You must be logged in to view job details.");
            setLoading(false); // Stop loading as we can't proceed
        }
    }, [clerkUserId, user, API_BASE_URL]);


    // 2. Fetch Job Data, Seeker Details, and Provider's Bid (if applicable)
    const fetchJobData = useCallback(async () => {
        if (!jobId) {
            setLoadingError("Job ID is missing from URL.");
            setLoading(false);
            return;
        }
        // Wait for mongoUserId to be loaded, unless there was already a loading error
        if (!mongoUserId && !loadingError) {
            log("fetchJobData waiting for mongoUserId...");
            // setLoading(true); // Ensure loading remains true
            return; // Wait for the mongoUserId effect to complete
        }
        // If mongoUserId failed to load, stop
        if (!mongoUserId && loadingError) {
             log("fetchJobData aborted due to user profile loading error.");
             setLoading(false);
             return;
        }


        log(`Fetching data for job ID: ${jobId} and provider ID: ${mongoUserId}`);
        setLoading(true);
        setLoadingError(null);
        setActionError(null);
        setMyBid(null); // Reset previous bid info
        setSeekerDetails(null); // Reset seeker info
        setIsMyAssignedJob(false); // Reset assignment status

        try {
            // Fetch Job Details
            log(`Fetching job details from: ${API_BASE_URL}/getJob/${jobId}`);
            const jobRes = await axios.get<Job>(`${API_BASE_URL}/getJob/${jobId}`);
            const fetchedJob = jobRes.data;
            setJobDetails(fetchedJob);
            log("Fetched job details:", fetchedJob);

            // Set map center
            if (fetchedJob.location?.coordinates) {
                const coords = {
                    lat: fetchedJob.location.coordinates[1],
                    lng: fetchedJob.location.coordinates[0]
                };
                setMapCenter(coords);
                log("Map center set to:", coords);
            } else {
                setMapCenter(defaultMapCenter); // Reset to default if no coords
                log("No location coordinates found, using default map center.");
            }

            // Fetch Seeker Details
            if (fetchedJob.seekerId) {
                try {
                    log(`Fetching seeker details for ID: ${fetchedJob.seekerId}`);
                    const seekerRes = await axios.get<UserProfile>(`${API_BASE_URL}/getUser/${fetchedJob.seekerId}`);
                    setSeekerDetails(seekerRes.data);
                    log("Fetched seeker details:", seekerRes.data);
                } catch (seekerErr) {
                    log("Could not fetch seeker details:", seekerErr);
                    // Set minimal seeker info to avoid breaking UI
                    setSeekerDetails({ _id: fetchedJob.seekerId, firstName: "Seeker", lastName: "Info Unavailable" });
                }
            }

            // Check if this job is assigned to the current provider
            if ((fetchedJob.status === 'In Progress' || fetchedJob.status === 'Completed') && fetchedJob.providerId === mongoUserId) {
                log("This job is assigned to the current provider.");
                setIsMyAssignedJob(true);
            }

            // If job is Open, fetch bids and find the provider's bid
            if (fetchedJob.status === 'Open' && mongoUserId) {
                log(`Fetching bids for Open job: ${jobId} to find provider's bid`);
                const bidsRes = await axios.get<{ bids?: Bid[] } | Bid[]>(`${API_BASE_URL}/getBids/${jobId}`);
                 // Ensure bids data is an array, handle potential nesting like { bids: [...] }
                const allBids: Bid[] = Array.isArray(bidsRes.data)
                    ? bidsRes.data
                    : (Array.isArray(bidsRes.data.bids) ? bidsRes.data.bids : []);

                log(`Fetched ${allBids.length} bids.`);
                const providerBid = allBids.find(bid => bid.providerId === mongoUserId);
                if (providerBid) {
                    setMyBid(providerBid);
                    log("Found current provider's bid:", providerBid);
                } else {
                    log("Current provider has not bid on this job.");
                }
            }

        } catch (err: any) {
            log("Error fetching job data:", err);
            setLoadingError(err.response?.data?.message || err.message || "Failed to load job details.");
            setJobDetails(null); // Clear job details on error
        } finally {
            log("Finished fetching job data.");
            setLoading(false);
        }
    }, [jobId, mongoUserId, API_BASE_URL, loadingError]); // Added loadingError dependency

    // Run fetcher when jobId or mongoUserId changes (and is available)
    useEffect(() => {
        fetchJobData();
    }, [fetchJobData]);

    // 3. API Action Helper (Generic POST) - Copied from ViewProviderJobs for consistency
     const handleApiAction = useCallback(async (action: () => Promise<any>, successMessage: string, errorMessage: string) => {
        log(`Performing action: ${successMessage}`);
        setActionError(null); // Clear previous action errors
        setLoading(true); // Set loading true during action
        try {
            const token = await getToken();
             if (!token) {
                 throw new Error("Authentication token not available.");
             }
            // Pass token to the action function if needed, or handle it inside the action
            await action();
            log(`Action successful: ${successMessage}`);
            // Re-fetch data ONLY if the action modifies the job state shown on this page
            await fetchJobData(); // Refresh job data after action
            // Optional: Show a success notification toast
        } catch (error: any) {
            log(`Action failed: ${errorMessage}`, error);
            const errorMsg = `${errorMessage}: ${error.response?.data?.message || error.message || 'Unknown error'}`;
            setActionError(errorMsg); // Set action error state
            setLoading(false); // Ensure loading is false on error
            // Optional: Show an error notification toast
        }
        // setLoading(false); // Loading is set to false by fetchJobData in its finally block
    }, [getToken, fetchJobData]); // Depends on fetchJobData for refresh

    // 4. Provider Action: Mark Job as Completed
    const handleCompleteJob = useCallback(async () => {
        if (!jobId) return;
        log(`Attempting to mark job ${jobId} as complete.`);

        if (!window.confirm("Are you sure you want to mark this job as completed?")) return;

        await handleApiAction(
            async () => {
                const token = await getToken(); // getToken is already available via useAuth
                log(`Sending complete request for job ${jobId} with token.`);
                // *** Use the correct endpoint for completing a job ***
                // This endpoint was NOT provided in the list, using placeholder.
                // Replace '/completeJob/' with your actual endpoint if different.
                return axios.post(`${API_BASE_URL}/completeJob/${jobId}`,
                    {}, // No payload needed usually, unless backend requires something
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            },
            `Job ${jobId} marked as completed request sent.`,
            "Failed to send request to mark job as completed"
        );
    }, [jobId, handleApiAction, API_BASE_URL, getToken]); // Added getToken dependency


    // Handler for Get Directions Button
    const handleGetDirections = () => {
        if (jobDetails?.location?.coordinates) {
            const lat = jobDetails.location.coordinates[1];
            const lng = jobDetails.location.coordinates[0];
            // Use a standard Google Maps URL
            const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
            window.open(url, '_blank', 'noopener,noreferrer');
            log(`Opening directions URL: ${url}`);
        } else {
            setActionError("Location coordinates are not available for directions.");
            log("Get Directions failed: No coordinates.");
        }
    };

    // Helper to render status chip
    const renderStatusChip = (status?: string) => {
        let color: "default" | "warning" | "info" | "success" | "error" | "primary" = "default";
        let icon = <InfoIcon />;
        switch (status) {
            // case 'Pending': color = 'warning'; break; // Less relevant for provider?
            case 'Open': color = 'info'; break;
            case 'In Progress': color = 'primary'; icon = <CircularProgress size={16} color="inherit" sx={{ mr: 0.5 }}/>; break;
            case 'Completed': color = 'success'; icon = <CheckCircleIcon sx={{ fontSize: 18, mr: 0.5 }}/>; break;
            case 'Cancelled': color = 'error'; break;
        }
        return <Chip icon={icon} label={status || 'Unknown'} color={color} size="small" sx={{ fontWeight: 500 }} />;
    };

     // Helper to parse budget/amount
     const parseAmount = (amountValue: any): string => {
        if (amountValue === null || amountValue === undefined) return 'N/A';
        if (typeof amountValue === 'object' && amountValue?.$numberDecimal) {
            return parseFloat(amountValue.$numberDecimal).toFixed(2);
        }
        if (typeof amountValue === 'string') {
            const parsed = parseFloat(amountValue);
            return isNaN(parsed) ? 'N/A' : parsed.toFixed(2);
        }
        if (typeof amountValue === 'number') {
            return amountValue.toFixed(2);
        }
        return 'N/A';
    };


    // --- Render Logic ---
    const renderContent = () => {
        if (loading) {
            // Show specific loading message based on what's missing
            const message = !mongoUserId ? "Loading Your Profile..." : "Loading Job Details...";
            return ( <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}><CircularProgress /><Typography sx={{ ml: 2 }}>{message}</Typography></Box> );
        }
        if (loadingError) {
            return ( <Box sx={{ flexGrow: 1, p: 3 }}><Container maxWidth="lg"><Alert severity="error">{loadingError}</Alert></Container></Box> );
        }
         if (!jobDetails) {
             // This case might be hit if loading finishes but job fetch failed silently or returned null
             return ( <Box sx={{ flexGrow: 1, p: 3 }}><Container maxWidth="lg"><Alert severity="warning">Job details could not be loaded or job not found.</Alert></Container></Box> );
         }

        // --- Main Job Details Display ---
        const budgetAmount = parseAmount(jobDetails.budget);
        const agreedAmount = parseAmount(jobDetails.agreedAmount);
        const myBidAmount = parseAmount(myBid?.amount);
        const currency = "Pula";

        return (
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                 {/* Display Action Errors */}
                 {actionError && (
                      <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
                          {actionError}
                      </Alert>
                  )}

                <Paper elevation={3} sx={{ p: { xs: 2, md: 3 } }}>
                    {/* Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                        <Typography variant="h4" component="h1" sx={{ mr: 2, flexGrow: 1 }}>
                            {jobDetails.title}
                        </Typography>
                        {renderStatusChip(jobDetails.status)}
                    </Box>
                    <Divider sx={{ mb: 3 }} />

                    {/* Main Content Grid - Details & Seeker Info */}
                    <Grid container spacing={3} sx={{ mb: 4 }}> {/* Added bottom margin */}
                        {/* Left Column: Core Job Details */}
                        <Grid item xs={12} md={7}>
                            <Card variant="outlined">
                                <CardHeader title="Job Overview" avatar={<InfoIcon color="action"/>} titleTypographyProps={{variant: 'h6'}}/>
                                <CardContent>
                                    <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                        <NotesIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> Description
                                    </Typography>
                                    <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap', pl: 3.5 }}>
                                        {jobDetails.description || 'No description provided.'}
                                    </Typography>

                                    <Typography variant="subtitle1" sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                                        <CategoryIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                        <strong>Category:</strong>&nbsp;{jobDetails.category || 'N/A'}
                                    </Typography>

                                    <Typography variant="subtitle1" sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                                        <AttachMoneyIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                        <strong>Budget:</strong>&nbsp;{budgetAmount !== 'N/A' ? `P${budgetAmount}` : 'N/A'}
                                    </Typography>

                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                                        <EventIcon fontSize="small" sx={{ mr: 1 }} />
                                        Posted: {formatDistanceToNow(new Date(jobDetails.createdAt), { addSuffix: true })} ({format(new Date(jobDetails.createdAt), 'PP')})
                                    </Typography>

                                    {/* Display Agreed Amount if job is assigned */}
                                    {isMyAssignedJob && agreedAmount !== 'N/A' && (
                                         <Typography variant="subtitle1" sx={{ mt: 1, fontWeight: 'bold', color: 'success.main', display: 'flex', alignItems: 'center' }}>
                                            <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} />
                                            Agreed Amount:&nbsp;{currency} {agreedAmount}
                                        </Typography>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Requirements / Specifications */}
                            {jobDetails.attributes && Object.keys(jobDetails.attributes).length > 0 && (
                                <Card variant="outlined" sx={{ mt: 3 }}>
                                     <CardHeader title="Requirements / Specifications" avatar={<BuildIcon color="action"/>} titleTypographyProps={{variant: 'h6'}}/>
                                     <CardContent sx={{ pt: 0 }}>
                                        <List dense disablePadding>
                                            {Object.entries(jobDetails.attributes).map(([key, value]) => (
                                                <ListItem key={key} disableGutters sx={{ pb: 0.5 }}>
                                                    <ListItemText primaryTypographyProps={{ fontWeight: 'medium' }} secondaryTypographyProps={{ color: 'text.primary' }}
                                                        primary={`${key}:`}
                                                        secondary={value}
                                                    />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </CardContent>
                                </Card>
                            )}
                        </Grid>

                        {/* Right Column: Seeker & Provider Bid Info */}
                        <Grid item xs={12} md={5}>
                             {/* Seeker Details */}
                             <Card variant="outlined" sx={{ mb: 3 }}>
                                 <CardHeader title="Job Seeker" avatar={<AccountCircleIcon color="action"/>} titleTypographyProps={{variant: 'h6'}}/>
                                 <CardContent>
                                     {seekerDetails ? (
                                         <>
                                             <Typography variant="body1">
                                                 <strong>Name:</strong> {seekerDetails.firstName || ''} {seekerDetails.lastName || ''}
                                             </Typography>
                                             {/* Conditionally show contact info based on job status and your app's rules */}
                                             {(isMyAssignedJob || jobDetails.status === 'In Progress' || jobDetails.status === 'Completed') && seekerDetails.email && (
                                                  <Typography variant="body2" sx={{ mt: 1 }}>
                                                      <strong>Email:</strong> <MuiLink href={`mailto:${seekerDetails.email}`}>{seekerDetails.email}</MuiLink>
                                                  </Typography>
                                             )}
                                             {(isMyAssignedJob || jobDetails.status === 'In Progress' || jobDetails.status === 'Completed') && seekerDetails.phoneNumber && (
                                                  <Typography variant="body2" sx={{ mt: 1 }}>
                                                      <strong>Phone:</strong> <MuiLink href={`tel:${seekerDetails.phoneNumber}`}>{seekerDetails.phoneNumber}</MuiLink>
                                                  </Typography>
                                             )}
                                             {!(seekerDetails.firstName || seekerDetails.lastName) && <Typography color="text.secondary">Seeker details limited.</Typography>}
                                         </>
                                     ) : (
                                         <Typography color="text.secondary">Loading seeker details...</Typography>
                                     )}
                                 </CardContent>
                             </Card>

                             {/* Provider's Bid Info (Only if job is Open and bid exists) */}
                             {jobDetails.status === 'Open' && myBid && (
                                 <Card variant="outlined" sx={{ backgroundColor: 'info.lightest' }}> {/* Highlight this section */}
                                     <CardHeader title="Your Bid" avatar={<AttachMoneyIcon color="info"/>} titleTypographyProps={{variant: 'h6'}}/>
                                     <CardContent>
                                         <Typography variant="h5" sx={{ mb: 1 }}>
                                             {currency} {myBidAmount}
                                         </Typography>
                                         <Typography variant="body2" color="text.secondary">
                                             Submitted: {formatDistanceToNow(new Date(myBid.createdAt), { addSuffix: true })}
                                         </Typography>
                                         {/* Add Withdraw Bid button if functionality exists */}
                                         {/* <Button variant="outlined" color="warning" size="small" sx={{mt: 1}}>Withdraw Bid</Button> */}
                                     </CardContent>
                                 </Card>
                             )}

                             {/* Confirmation if job is assigned */}
                             {isMyAssignedJob && (
                                 <Alert severity="success" icon={<CheckCircleIcon fontSize="inherit" />} sx={{ mt: 2 }}>
                                     This job is assigned to you.
                                 </Alert>
                             )}

                             {/* Action Button: Mark Completed */}
                             {isMyAssignedJob && jobDetails.status === 'In Progress' && (
                                 <Button
                                     variant="contained"
                                     color="success"
                                     startIcon={<CheckCircleIcon />}
                                     onClick={handleCompleteJob}
                                     disabled={loading} // Disable while loading
                                     fullWidth
                                     sx={{ mt: 3, py: 1.5 }} // Make button prominent
                                 >
                                     Mark Job as Completed
                                 </Button>
                             )}

                        </Grid>
                    </Grid> {/* End Main Content Grid */}

                    {/* Map Section - Moved to the bottom */}
                    <Divider sx={{ my: 3 }} />
                    <Box sx={{ mt: 3 }}>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                            <LocationOnIcon sx={{ mr: 1, color: 'text.secondary' }}/> Job Location
                        </Typography>
                        {mapLoadError ? (
                            <Alert severity="error" sx={{ mt: 1 }}>Map cannot be loaded. Please check the Google Maps API key configuration.</Alert>
                        ) : !isMapLoaded ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: mapContainerStyle.height, border: '1px dashed grey', borderRadius: '8px' }}>
                                <CircularProgress size={30} sx={{ mr: 1 }}/>
                                <Typography color="text.secondary">Loading map...</Typography>
                            </Box>
                        ) : jobDetails.location?.coordinates ? (
                            <Box sx={{ ...mapContainerStyle, position: 'relative', mt: 1 }}>
                                <GoogleMap
                                    mapContainerStyle={{ width: '100%', height: '100%' }}
                                    center={mapCenter}
                                    zoom={14} // Adjust zoom level as needed
                                    options={{ // Readonly options suitable for display
                                        draggable: true, // Allow dragging
                                        zoomControl: true,
                                        scrollwheel: true, // Allow scroll zoom
                                        disableDoubleClickZoom: false,
                                        streetViewControl: true, // Show street view pegman
                                        mapTypeControl: true, // Allow switching map types
                                        fullscreenControl: true,
                                    }}
                                >
                                    <MarkerF position={mapCenter} title={jobDetails.title} />
                                </GoogleMap>
                            </Box>
                        ) : (
                            <Alert severity="info" sx={{ mt: 1 }}>Location coordinates are not specified for this job.</Alert>
                        )}
                        {/* Get Directions Button */}
                        {jobDetails.location?.coordinates && (
                            <Button
                                variant="contained" // Make it more prominent
                                startIcon={<DirectionsIcon />}
                                onClick={handleGetDirections}
                                sx={{ mt: 2 }}
                                fullWidth={false} // Don't make it full width if map is large
                            >
                                Get Directions
                            </Button>
                        )}
                    </Box>

                </Paper>
            </Container>
        );
    }

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            {/* *** Ensure this is the Provider Sidebar *** */}
            <Sidebar />
            {renderContent()}
        </Box>
    );
};

export default JobDetailsProviderView;
