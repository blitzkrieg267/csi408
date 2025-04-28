"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { useAuth, useUser } from '@clerk/nextjs';
import {
    Container, Box, Typography, CircularProgress, Alert, Paper, Grid, Button,
    List, ListItem, ListItemText, Divider, Chip, Link as MuiLink, IconButton, Card, CardContent, CardHeader, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, DialogContentText
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import DirectionsIcon from '@mui/icons-material/Directions';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import EventIcon from '@mui/icons-material/Event';
import CategoryIcon from '@mui/icons-material/Category';
import InfoIcon from '@mui/icons-material/Info';
import NotesIcon from '@mui/icons-material/Notes';
import BuildIcon from '@mui/icons-material/Build';
import Sidebar from '@/components/Sidebar';
import { formatDistanceToNow, format } from 'date-fns';
import { GoogleMap, MarkerF, useLoadScript } from '@react-google-maps/api';
import { Job, Bid } from '@/types/job';
import { io } from 'socket.io-client';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import WorkIcon from '@mui/icons-material/Work';
import Timer from '@/components/Timer';

const libraries: ("places")[] = ["places"];
const mapContainerStyle = {
    height: '400px',
    width: '100%',
    borderRadius: '8px',
    border: '1px solid #eee'
};
const defaultMapCenter = { lat: -24.6282, lng: 25.9231 };

interface Location {
    type: 'Point';
    coordinates: [number, number];
}

const JobDetails = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { getToken, userId: clerkUserId } = useAuth();
    const { user } = useUser();

    const [job, setJob] = useState<Job | null>(null);
    const [bids, setBids] = useState<Bid[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [mapCenter, setMapCenter] = useState(defaultMapCenter);
    const [selectedBid, setSelectedBid] = useState<Bid | null>(null);
    const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [currency] = useState("Pula");
    const [socket, setSocket] = useState<any>(null);

    const jobId = searchParams.get('id');
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

    const { isLoaded: isMapLoaded, loadError: mapLoadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries,
    });

    const fetchProviderInfo = useCallback(async (providerId: string | { _id: string }, token: string) => {
        try {
            // Extract the actual ID if providerId is an object
            const actualProviderId = typeof providerId === 'string' ? providerId : providerId._id;
            
            if (!actualProviderId) {
                console.error('Invalid providerId:', providerId);
                return null;
            }

            const providerRes = await axios.get(`${API_BASE_URL}/getUser/${actualProviderId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return {
                firstName: providerRes.data.firstName,
                lastName: providerRes.data.lastName,
                email: providerRes.data.email
            };
        } catch (err) {
            console.error('Error fetching provider info:', err);
            return null;
        }
    }, [API_BASE_URL]);

    const fetchJobDetails = useCallback(async () => {
        if (!jobId) {
            setError("Job ID is missing from URL.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        setActionError(null);

        try {
            const token = await getToken();
            if (!token) throw new Error("Authentication token not available.");

            // Fetch Job Details
            const jobRes = await axios.get<Job>(`${API_BASE_URL}/getJob/${jobId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setJob(jobRes.data);

            // Set map center
            if (jobRes.data.location?.coordinates) {
                setMapCenter({
                    lat: jobRes.data.location.coordinates[1],
                    lng: jobRes.data.location.coordinates[0]
                });
            }

            // Fetch Bids if job is Open
            if (jobRes.data.status === 'Open') {
                const bidsRes = await axios.get<Bid[]>(`${API_BASE_URL}/getBids/${jobId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                // Fetch provider details for each bid
                const bidsWithProviderInfo = await Promise.all(
                    bidsRes.data.map(async (bid) => {
                        if (!bid.providerId) {
                            console.error('Bid missing providerId:', bid);
                            return bid;
                        }
                        const providerInfo = await fetchProviderInfo(bid.providerId, token);
                        return {
                            ...bid,
                            providerInfo
                        };
                    })
                );

                // Sort bids by creation date, newest first
                const sortedBids = bidsWithProviderInfo.sort((a, b) => 
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
                setBids(sortedBids);
            }

        } catch (err: any) {
            setError(err.response?.data?.message || err.message || "Failed to load job details.");
        } finally {
            setLoading(false);
        }
    }, [jobId, API_BASE_URL, fetchProviderInfo]);

    // Initialize socket connection
    useEffect(() => {
        const newSocket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            path: '/socket.io',
            reconnection: true,
            reconnectionAttempts: 5,
            withCredentials: true,
            extraHeaders: {
                "Access-Control-Allow-Origin": "*"
            }
        });

        newSocket.on('connect_error', (error) => {
            console.log('Socket connection error:', error);
        });

        newSocket.on('connect_timeout', () => {
            console.log('Socket connection timeout');
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [SOCKET_URL]);

    // Listen for bid updates
    useEffect(() => {
        if (!socket || !jobId) return;

        const handleBidUpdate = async (updatedBid: Bid) => {
            if (updatedBid.jobId === jobId) {
                try {
                    const token = await getToken();
                    if (!token) return;

                    if (!updatedBid.providerId) {
                        console.error('Updated bid missing providerId:', updatedBid);
                        return;
                    }

                    const providerInfo = await fetchProviderInfo(updatedBid.providerId, token);
                    const bidWithProviderInfo = {
                        ...updatedBid,
                        providerInfo
                    };

                    setBids(prevBids => {
                        const existingBidIndex = prevBids.findIndex(b => b._id === updatedBid._id);
                        if (existingBidIndex >= 0) {
                            const newBids = [...prevBids];
                            newBids[existingBidIndex] = bidWithProviderInfo;
                            return newBids.sort((a, b) => 
                                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                            );
                        }
                        return [...prevBids, bidWithProviderInfo].sort((a, b) => 
                            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                        );
                    });
                } catch (err) {
                    console.error('Error handling bid update:', err);
                }
            }
        };

        socket.on('bidUpdate', handleBidUpdate);
        socket.on('bidDeleted', (deletedBidId: string) => {
            setBids(prevBids => prevBids.filter(bid => bid._id !== deletedBidId));
        });

        return () => {
            socket.off('bidUpdate', handleBidUpdate);
            socket.off('bidDeleted');
        };
    }, [socket, jobId, fetchProviderInfo]);

    const handleBidRowClick = (bid: Bid) => {
        // Extract the provider ID from the bid object
        const providerId = typeof bid.providerId === 'string' ? bid.providerId : bid.providerId._id;
        if (providerId) {
            router.push(`/view-profile?id=${providerId}`);
        }
    };

    useEffect(() => {
        fetchJobDetails();
    }, [fetchJobDetails]);

    const handleAcceptBid = async (bidId: string) => {
        console.log('Starting accept bid process for bid:', bidId);
        setActionError(null);
        setLoading(true);
        
        try {
            const token = await getToken();
            if (!token) {
                console.error('No auth token available');
                throw new Error("Authentication token not available.");
            }

            if (!selectedBid) {
                console.error('No bid selected');
                throw new Error("No bid selected.");
            }

            console.log('Preparing accept bid request:', {
                bidId,
                jobId,
                newBudget: selectedBid.amount,
                providerId: selectedBid.providerId
            });

            const response = await axios.post(
                `${API_BASE_URL}/acceptBid/${bidId}`,
                { 
                    jobId,
                    newBudget: selectedBid.amount,
                    providerId: selectedBid.providerId
                },
                { 
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    } 
                }
            );

            console.log('Accept bid response:', response.data);

            if (response.data.success) {
                // Update the job with new provider and budget
                setJob(prevJob => prevJob && {
                    ...prevJob,
                    assignedProvider: selectedBid.providerInfo,
                    budget: selectedBid.amount
                });
                
                // Remove the bids section since a bid has been accepted
                setBids([]);

                setAcceptDialogOpen(false);
                setSelectedBid(null);
                console.log('Bid accepted successfully');
        } else {
                console.error('Failed to accept bid:', response.data.message);
                setActionError(response.data.message || 'Failed to accept bid');
            }
        } catch (err: any) {
            console.error('Error accepting bid:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status
            });
            setActionError(err.response?.data?.message || err.message || 'Failed to accept bid');
        } finally {
            setLoading(false);
        }
    };

    const handleRejectBid = async (bidId: string) => {
        setActionError(null);
        setLoading(true);
        try {
            const token = await getToken();
            if (!token) throw new Error("Authentication token not available.");
            await axios.post(
                `${API_BASE_URL}/rejectBid/${bidId}`,
                { jobId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            await fetchJobDetails();
            setRejectDialogOpen(false);
            setSelectedBid(null);
        } catch (err: any) {
            setActionError(err.response?.data?.message || err.message || 'Failed to reject bid');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelJob = async () => {
        setActionError(null);
        setLoading(true);
        try {
            const token = await getToken();
            if (!token) throw new Error("Authentication token not available.");
            await axios.post(
                `${API_BASE_URL}/cancelJob/${jobId}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            await fetchJobDetails();
            setCancelDialogOpen(false);
        } catch (err: any) {
            setActionError(err.response?.data?.message || err.message || 'Failed to cancel job');
        } finally {
            setLoading(false);
        }
    };

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

    const renderStatusChip = (status?: string) => {
        const statusColors = {
            'Pending': 'default',
            'Open': 'primary',
            'In Progress': 'warning',
            'Completed': 'success',
            'Cancelled': 'error'
        };

        return (
            <Chip
                label={status || 'Unknown'}
                color={statusColors[status as keyof typeof statusColors] as any}
                size="small"
            />
        );
    };

    const handleReportUser = () => {
        router.push(`/report-user?id=${job?.providerId}`);
    };

    const handleCompleteJob = () => {
        router.push(`/payment/${job?._id}`);
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Container>
                        <Alert severity="error">{error}</Alert>
                    </Container>
        );
    }

    if (!job) {
        return (
            <Container>
                <Alert severity="error">Job not found</Alert>
                    </Container>
        );
    }

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <Box sx={{ 
                flexGrow: 1, 
                p: 3,
                ml: '240px', // Account for sidebar width
                maxWidth: 'calc(100% - 240px)', // Prevent content from going under sidebar
                margin: '0 auto' // Center the content
            }}>
                <Container maxWidth="lg" sx={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3
                }}>
                    {actionError && (
                        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
                            {actionError}
                        </Alert>
                    )}

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h4" component="h1">
                            {job.title}
                        </Typography>
                        {job.status === 'Open' && (
                            <Button
                                variant="contained"
                                color="error"
                                onClick={() => setCancelDialogOpen(true)}
                            >
                                Cancel Job
                            </Button>
                        )}
                    </Box>

                    {/* Job Details Section */}
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Job Details
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6} component="div">
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <InfoIcon sx={{ mr: 1 }} />
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Status
                                    </Typography>
                                </Box>
                                {renderStatusChip(job?.status)}
                            </Grid>
                            <Grid item xs={12} sm={6} component="div">
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <CategoryIcon sx={{ mr: 1 }} />
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Category
                            </Typography>
                                </Box>
                                <Typography>{job?.category || 'N/A'}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6} component="div">
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <AttachMoneyIcon sx={{ mr: 1 }} />
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Budget
                                        </Typography>
                                    </Box>
                                <Typography>{currency} {parseAmount(job?.budget)}</Typography>
                                </Grid>
                            <Grid item xs={12} sm={6} component="div">
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <EventIcon sx={{ mr: 1 }} />
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Posted
                                    </Typography>
                                    </Box>
                                <Typography>
                                    {job?.createdAt ? formatDistanceToNow(new Date(job.createdAt), { addSuffix: true }) : 'N/A'}
                                </Typography>
                                </Grid>
                            {job?.attributes && Object.keys(job.attributes).length > 0 && (
                                <Grid item xs={12} component="div">
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <WorkIcon sx={{ mr: 1 }} />
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Attributes
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {Object.entries(job.attributes).map(([key, value]) => (
                                            <Chip
                                                key={key}
                                                label={`${key}: ${value}`}
                                                variant="outlined"
                                                size="small"
                                            />
                                        ))}
                                </Box>
                                </Grid>
                            )}
                        </Grid>

                        <Box sx={{ mt: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <NotesIcon sx={{ mr: 1 }} />
                                <Typography variant="subtitle2" color="text.secondary">
                                    Description
                                </Typography>
                            </Box>
                            <Typography>{job.description}</Typography>
                        </Box>
                    </Paper>

                    {/* Provider Details Section */}
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Assigned Provider
                        </Typography>
                        {job.assignedProvider ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <PersonIcon />
                                <Box>
                                    <Typography variant="subtitle1">
                                        {job.assignedProvider.firstName} {job.assignedProvider.lastName}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {job.assignedProvider.email}
                                    </Typography>
                                </Box>
                                <Button
                                    variant="outlined"
                                    onClick={() => router.push(`/view-profile?id=${job.assignedProvider?._id}`)}
                                >
                                    View Profile
                                </Button>
                            </Box>
                        ) : (
                            <Typography color="text.secondary">
                                No provider assigned yet
                            </Typography>
                        )}
                    </Paper>

                    {/* Action Buttons for In Progress Jobs */}
                    {job.status === 'In Progress' && (
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                Job Actions
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <Button
                                    variant="contained"
                                    color="error"
                                    onClick={handleReportUser}
                                >
                                    Report Provider
                                </Button>
                                <Button
                                    variant="contained"
                                    color="success"
                                    onClick={handleCompleteJob}
                                >
                                    Complete Job
                                </Button>
                            </Box>
                        </Paper>
                    )}

                    {/* Timer Section for In Progress Jobs */}
                    {job.status === 'In Progress' && job.startedAt && (
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                Time Tracking
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <AccessTimeIcon />
                                <Timer startTime={new Date(job.startedAt)} />
                            </Box>
                        </Paper>
                    )}

                    {/* Bids Section */}
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Bids
                        </Typography>
                        <Box sx={{ overflowX: 'auto' }}>
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Provider</TableCell>
                                            <TableCell>Amount</TableCell>
                                            <TableCell>Submitted</TableCell>
                                            <TableCell>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {bids.length > 0 ? (
                                            bids.map((bid) => (
                                                <TableRow 
                                                    key={bid._id}
                                                    sx={{ '&:hover': { backgroundColor: 'action.hover' } }}
                                                >
                                                    <TableCell>
                                                        {bid.providerInfo?.firstName || bid.providerInfo?.lastName
                                                            ? `${bid.providerInfo.firstName || ''} ${bid.providerInfo.lastName || ''}`.trim()
                                                            : 'Loading...'}
                                                    </TableCell>
                                                    <TableCell>{currency} {parseAmount(bid.amount)}</TableCell>
                                                    <TableCell>
                                                        {formatDistanceToNow(new Date(bid.createdAt), { addSuffix: true })}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                                            <Button
                                                                variant="outlined"
                                                                size="small"
                                                                onClick={() => {
                                                                    const providerId = typeof bid.providerId === 'string' 
                                                                        ? bid.providerId 
                                                                        : bid.providerId._id;
                                                                    router.push(`/view-profile?id=${providerId}`);
                                                                }}
                                                            >
                                                                View Profile
                                                            </Button>
                                                            <Button
                                                                variant="contained"
                                                                color="success"
                                                                size="small"
                                                                onClick={() => {
                                                                    setSelectedBid(bid);
                                                                    setAcceptDialogOpen(true);
                                                                }}
                                                            >
                                                                Accept
                                                            </Button>
                                                            <Button
                                                                variant="outlined"
                                                                color="error"
                                                                size="small"
                                                                onClick={() => {
                                                                    setSelectedBid(bid);
                                                                    setRejectDialogOpen(true);
                                                                }}
                                                            >
                                                                Reject
                                                            </Button>
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} align="center">
                                                    <Typography color="text.secondary">
                                                        No bids have been placed yet
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                                        </Box>
                    </Paper>

                    {/* Map Section */}
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Location
                        </Typography>
                        {isMapLoaded ? (
                                            <GoogleMap
                                mapContainerStyle={mapContainerStyle}
                                                center={mapCenter}
                                                zoom={15}
                                            >
                                                <MarkerF position={mapCenter} />
                                            </GoogleMap>
                        ) : (
                            <Box sx={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CircularProgress />
                                        </Box>
                        )}
                    </Paper>

                    {/* Accept Bid Dialog */}
                    <Dialog
                        open={acceptDialogOpen}
                        onClose={() => setAcceptDialogOpen(false)}
                    >
                        <DialogTitle>Accept Bid</DialogTitle>
                        <DialogContent>
                            <DialogContentText>
                                {selectedBid && (
                                    <>
                                        <Typography variant="body1" gutterBottom>
                                            You are about to accept a bid from {selectedBid.providerInfo?.firstName} {selectedBid.providerInfo?.lastName}
                                        </Typography>
                                        <Typography variant="body1" gutterBottom>
                                            Original Budget: {currency} {parseAmount(job.budget)}
                                        </Typography>
                                        <Typography variant="body1" gutterBottom>
                                            Bid Amount: {currency} {parseAmount(selectedBid.amount)}
                                        </Typography>
                                        <Typography variant="body1" color="text.secondary">
                                            This will assign the provider to this job and update the job budget.
                                        </Typography>
                                    </>
                                )}
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setAcceptDialogOpen(false)}>Cancel</Button>
                            <Button
                                onClick={() => selectedBid && handleAcceptBid(selectedBid._id)}
                                color="success"
                                variant="contained"
                            >
                                Accept Bid
                            </Button>
                        </DialogActions>
                    </Dialog>

                    {/* Reject Bid Dialog */}
                    <Dialog
                        open={rejectDialogOpen}
                        onClose={() => setRejectDialogOpen(false)}
                    >
                        <DialogTitle>Reject Bid</DialogTitle>
                        <DialogContent>
                            <DialogContentText>
                                Are you sure you want to reject this bid?
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
                                        <Button
                                onClick={() => selectedBid && handleRejectBid(selectedBid._id)}
                                color="error"
                                variant="contained"
                            >
                                Reject
                                        </Button>
                        </DialogActions>
                    </Dialog>

                    {/* Cancel Job Dialog */}
                    <Dialog
                        open={cancelDialogOpen}
                        onClose={() => setCancelDialogOpen(false)}
                    >
                        <DialogTitle>Cancel Job</DialogTitle>
                        <DialogContent>
                            <DialogContentText>
                                Are you sure you want to cancel this job? This action cannot be undone.
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setCancelDialogOpen(false)}>Cancel</Button>
                            <Button
                                onClick={handleCancelJob}
                                color="error"
                                variant="contained"
                            >
                                Cancel Job
                            </Button>
                        </DialogActions>
                    </Dialog>
            </Container>
            </Box>
        </Box>
    );
};

export default JobDetails;

