"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import axios from 'axios';
import {
  Box, Paper, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination,
  TextField, FormControl, InputLabel, Select, MenuItem,
  Slider, Chip, CircularProgress, Alert, Grid, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, Card, CardActions
} from '@mui/material';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/utils/axios';
import ProviderLayout from '@/app/provider/layout';
import { toast } from 'react-hot-toast';

interface Job {
  _id: string;
  title: string;
  description: string;
  categoryId: string;
  categoryName: string;
  price: number;
  location: {
    lat: number;
    lng: number;
  };
  requiredAttributes: Record<string, string>;
  createdAt: string;
  matchScore?: number;
  distance?: number;
  status?: string;
  myBid?: boolean;
  seekerId: string;
  hasBid?: boolean;
}

interface FilterState {
  priceRange: [number, number];
  category: string;
  searchText: string;
  maxDistance: number;
}

export default function FindJobsPage() {
  const { userId: clerkUserId, isLoaded, getToken } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBestMatches, setShowBestMatches] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [providerLocation, setProviderLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [categories, setCategories] = useState<{ _id: string; categoryName: string }[]>([]);
  const [mongoUserId, setMongoUserId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    priceRange: [0, 1000],
    category: '',
    searchText: '',
    maxDistance: 50 // Default 50km radius
  });
  const [bidModalOpen, setBidModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [bidLoading, setBidLoading] = useState(false);
  const [bidError, setBidError] = useState<string | null>(null);
  const [userBids, setUserBids] = useState<Record<string, boolean>>({});
  const [activeBids, setActiveBids] = useState<Set<string>>(new Set());

  // Get provider's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setProviderLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Unable to get your location. Some features may be limited.');
        }
      );
    }
  }, []);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axiosInstance.get('/getCategories');
        setCategories(response.data);
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch MongoDB user ID when component mounts
  useEffect(() => {
    const fetchMongoUserId = async () => {
      if (!clerkUserId) return;
      
      try {
        const token = await getToken();
        if (!token) {
          console.error('No auth token available');
          return;
        }

        const response = await axiosInstance.get(`/getUserByClerkId/${clerkUserId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data?._id) {
          setMongoUserId(response.data._id);
        } else {
          console.error('Could not find MongoDB user ID');
          setError('Could not find your user profile');
        }
      } catch (error) {
        console.error('Error fetching MongoDB user ID:', error);
        setError('Failed to load your user profile');
      }
    };

    fetchMongoUserId();
  }, [clerkUserId, getToken]);

  // Add this function to fetch user's bids
  const fetchUserBids = async () => {
    try {
      if (!mongoUserId) {
        console.log("No MongoDB user ID available");
        return;
      }

      console.log("Fetching bids for provider:", mongoUserId);
      const response = await axiosInstance.get(`/getBidsByProvider/${mongoUserId}`);
      console.log("Bids response:", response.data);

      const bidSet = new Set<string>();
      response.data.forEach((bid: any) => {
        bidSet.add(bid.jobId);
        console.log(`Provider has bid on job ${bid.jobId} with amount ${bid.amount}`);
      });

      if (bidSet.size === 0) {
        console.log("Provider has no active bids");
      } else {
        console.log(`Provider has ${bidSet.size} active bids`);
      }

      setActiveBids(bidSet);
    } catch (error) {
      console.error("Error fetching user bids:", error);
    }
  };

  // Update the useEffect that fetches jobs to also fetch bids
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        if (!isLoaded) {
          console.log("Auth is still loading...");
          return;
        }

        if (!clerkUserId) {
          console.log("No userId found, redirecting to sign in...");
          router.push('/sign-in');
          return;
        }

        console.log("Fetching jobs...");
        const jobsResponse = await axiosInstance.get("/getJobs");
        console.log("Raw jobs response:", jobsResponse.data);
        
        let jobs: Job[] = jobsResponse.data.filter((job: Job) => {
          console.log("Checking job status:", job.status);
          return job.status === 'Open';
        }).map((job: any) => ({
          ...job,
          categoryName: job.category || 'Uncategorized',
          price: job.budget?.$numberDecimal ? parseFloat(job.budget.$numberDecimal) : 0,
          requiredAttributes: job.attributes || {}
        }));
        
        console.log("Filtered and mapped jobs:", jobs);
        setJobs(jobs);

        // Fetch user's bids after jobs are loaded
        await fetchUserBids();
      } catch (error) {
        console.error("Error in fetchJobs:", error);
        setError("Error fetching jobs. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [clerkUserId, isLoaded, router, mongoUserId]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleFilterChange = (field: keyof FilterState, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const filteredJobs = jobs
    .filter(job => {
      // Filter by price range
      if (job.price < filters.priceRange[0] || job.price > filters.priceRange[1]) return false;
      
      // Filter by category
      if (filters.category && job.categoryId !== filters.category) return false;
      
      // Filter by search text
      if (filters.searchText && 
          !job.title.toLowerCase().includes(filters.searchText.toLowerCase()) &&
          !job.description.toLowerCase().includes(filters.searchText.toLowerCase())) return false;
      
      // Filter by distance
      if (job.distance && job.distance > filters.maxDistance) return false;
      
      return true;
    })
    .sort((a, b) => {
      // Sort by match score (descending)
      if (a.matchScore !== b.matchScore) {
        return (b.matchScore || 0) - (a.matchScore || 0);
      }
      // Then by distance (ascending)
      if (a.distance !== b.distance) {
        return (a.distance || 0) - (b.distance || 0);
      }
      // Then by date (descending)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleBestMatches = async () => {
    try {
      if (!clerkUserId) return;

      // Get user details
      const userResponse = await axios.get(`http://localhost:5000/api/getUserByClerkId/${clerkUserId}`);
      const user = userResponse.data;
      
      if (!user || !user.location) {
        setError("Location information not found. Please update your profile.");
        return;
      }

      // Calculate distances and match scores for all jobs
      const jobsWithScores = await Promise.all(
        jobs.map(async (job: Job) => {
          // Calculate distance
          const distance = calculateDistance(
            user.location.lat,
            user.location.lng,
            job.location.lat,
            job.location.lng
          );

          // Get match score
          const scoreResponse = await axios.get(
            `http://localhost:5000/api/calculateMatchScore/${job._id}/${clerkUserId}`
          );
          const matchScore = scoreResponse.data.score;

          return {
            ...job,
            distance,
            matchScore,
          };
        })
      );

      // Sort by match score and distance
      jobsWithScores.sort((a: Job, b: Job) => {
        if (a.matchScore !== b.matchScore) {
          return (b.matchScore || 0) - (a.matchScore || 0);
        }
        return (a.distance || 0) - (b.distance || 0);
      });

      setJobs(jobsWithScores);
      setShowBestMatches(true);
    } catch (error) {
      console.error("Error calculating best matches:", error);
      setError("Error calculating best matches. Please try again later.");
    }
  };

  const handleBidClick = (job: Job) => {
    console.log('Opening bid modal for job:', job._id);
    if (job.myBid) {
      console.log('Bid already exists for job:', job._id);
      return;
    }
    setSelectedJob(job);
    setBidAmount(job.price);
    setBidModalOpen(true);
  };

  // Update handleQuickBid to log bid status
  const handleQuickBid = async (job: Job) => {
    if (activeBids.size > 0) {
      console.log("Provider already has an active bid, cannot place another");
      toast.error("You already have an active bid. Please cancel it before placing a new one.");
      return;
    }

    try {
      console.log(`Attempting to place bid on job ${job._id} with amount ${job.price}`);
      const bidData = {
        jobId: job._id,
        providerId: mongoUserId,
        seekerId: job.seekerId,
        amount: job.price
      };

      const response = await axiosInstance.post(
        '/addBid',
        bidData,
        { 
          headers: { 
            Authorization: `Bearer ${await getToken()}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      
      if (response.data._id) {
        console.log(`Successfully placed bid on job ${job._id}`);
        setActiveBids(prev => new Set(prev).add(job._id));
        toast.success("Bid placed successfully!");
      } else {
        console.error('Bid failed:', response.data.message);
        setBidError(response.data.message || 'Failed to place bid');
      }
    } catch (error: any) {
      console.error('Error placing bid:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setBidError(error.response?.data?.message || 'Failed to place bid. Please try again.');
    }
  };

  const handleRaiseBudget = async () => {
    console.log('Starting custom bid process for job:', selectedJob?._id);
    if (!selectedJob || !clerkUserId) {
      console.error('Missing required data:', { selectedJob, clerkUserId });
      return;
    }
    
    setBidLoading(true);
    setBidError(null);
    
    try {
      console.log('Getting auth token...');
      const token = await getToken();
      if (!token) {
        console.error('No auth token available');
        setBidError('Authentication failed. Please try again.');
        return;
      }

      console.log('Preparing bid data:', {
        jobId: selectedJob._id,
        providerId: clerkUserId,
        seekerId: selectedJob.seekerId,
        amount: bidAmount
      });

      const response = await axiosInstance.post(
        '/addBid',
        { 
          jobId: selectedJob._id,
          providerId: clerkUserId,
          seekerId: selectedJob.seekerId,
          amount: bidAmount 
        },
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      
      console.log('Bid response:', response.data);
      
      if (response.data.success) {
        // Update the job in the list to show it's been bid on
        setJobs(jobs.map(j => 
          j._id === selectedJob._id 
            ? { ...j, myBid: true }
            : j
        ));
        
        setBidModalOpen(false);
        console.log('Custom bid placed successfully for job:', selectedJob._id);
      } else {
        console.error('Bid failed:', response.data.message);
        setBidError(response.data.message || 'Failed to place bid');
      }
    } catch (error: any) {
      console.error('Error placing bid:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setBidError(error.response?.data?.message || 'Failed to place bid. Please try again.');
    } finally {
      setBidLoading(false);
    }
  };

  const calculateBidOptions = (basePrice: number) => {
    return [
      { value: basePrice * 1.1, label: '10% increase (P' + (basePrice * 1.1).toFixed(2) + ')' },
      { value: basePrice * 1.2, label: '20% increase (P' + (basePrice * 1.2).toFixed(2) + ')' },
      { value: basePrice * 1.3, label: '30% increase (P' + (basePrice * 1.3).toFixed(2) + ')' },
      { value: basePrice * 1.4, label: '40% increase (P' + (basePrice * 1.4).toFixed(2) + ')' },
      { value: basePrice * 1.5, label: '50% increase (P' + (basePrice * 1.5).toFixed(2) + ')' }
    ];
  };

  // Update handleCancelBid to log cancellation status
  const handleCancelBid = async (jobId: string) => {
    if (!activeBids.has(jobId)) {
      console.log(`No active bid found for job ${jobId}`);
      toast.error("You haven't placed a bid on this job yet");
      return;
    }

    try {
      console.log(`Attempting to cancel bid for job ${jobId}`);
      const response = await axiosInstance.delete(`/deleteBid/${jobId}/${mongoUserId}`);
      if (response.data.success) {
        console.log(`Successfully cancelled bid for job ${jobId}`);
        setActiveBids(prev => {
          const newSet = new Set(prev);
          newSet.delete(jobId);
          return newSet;
        });
        toast.success("Bid cancelled successfully");
      }
    } catch (error) {
      console.error("Error cancelling bid:", error);
      toast.error("Failed to cancel bid");
    }
  };

  const renderJobCard = (job: Job) => {
    const hasActiveBid = activeBids.has(job._id);
    
    return (
      <Card key={job._id}>
        {/* ... existing card content ... */}
        <CardActions>
          {hasActiveBid ? (
            <Button 
              variant="contained" 
              color="error"
              onClick={() => handleCancelBid(job._id)}
            >
              Cancel Bid
            </Button>
          ) : (
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => handleQuickBid(job)}
            >
              Place Bid
            </Button>
          )}
        </CardActions>
      </Card>
    );
  };

  if (!isLoaded) {
    return (
      <ProviderLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
          <CircularProgress />
        </Box>
      </ProviderLayout>
    );
  }

  return (
    <ProviderLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">
            Find Jobs
        </Typography>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleBestMatches}
            disabled={loading}
          >
            {showBestMatches ? 'Show All Jobs' : 'Best for Me'}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Search Jobs"
                value={filters.searchText}
                onChange={(e) => handleFilterChange('searchText', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={filters.category}
                  label="Category"
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {categories.map(category => (
                    <MenuItem key={category._id} value={category._id}>
                      {category.categoryName}
                    </MenuItem>
            ))}
          </Select>
        </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography gutterBottom>Price Range</Typography>
              <Slider
                value={filters.priceRange}
                onChange={(_, newValue) => handleFilterChange('priceRange', newValue)}
                valueLabelDisplay="auto"
                min={0}
                max={1000}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography gutterBottom>Maximum Distance (km)</Typography>
              <Slider
                value={filters.maxDistance}
                onChange={(_, newValue) => handleFilterChange('maxDistance', newValue)}
                valueLabelDisplay="auto"
                min={1}
                max={100}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Jobs Table */}
        <TableContainer component={Paper}>
          <Table>
              <TableHead>
                <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Price</TableCell>
                {showBestMatches && <TableCell>Distance</TableCell>}
                {showBestMatches && <TableCell>Match Score</TableCell>}
                <TableCell>Required Attributes</TableCell>
                <TableCell>Posted</TableCell>
                <TableCell>Bid</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
              {filteredJobs
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((job) => (
                    <TableRow
                    key={job._id}
                      hover
                    onClick={() => router.push(`/provider/jobDetails?id=${job._id}`)}
                    sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{job.title}</TableCell>
                    <TableCell>{job.categoryName}</TableCell>
                    <TableCell>P{job.price}</TableCell>
                    {showBestMatches && (
                      <TableCell>{job.distance?.toFixed(1)} km</TableCell>
                    )}
                    {showBestMatches && (
                      <TableCell>
                        <Chip 
                          label={`${job.matchScore}%`}
                          color={job.matchScore && job.matchScore >= 80 ? 'success' : 
                                 job.matchScore && job.matchScore >= 60 ? 'warning' : 'error'}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      {Object.entries(job.requiredAttributes || {}).map(([key, value]) => (
                        <Chip 
                          key={key}
                          label={`${key}: ${value}`}
                          size="small"
                          sx={{ m: 0.5 }}
                        />
                      ))}
                    </TableCell>
                    <TableCell>
                      {new Date(job.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {activeBids.has(job._id) ? (
                        <Button
                          variant="contained"
                          color="error"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelBid(job._id);
                          }}
                        >
                          Cancel Bid
                        </Button>
                      ) : (
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickBid(job);
                          }}
                        >
                          Place Bid
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredJobs.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
          </TableContainer>
      </Box>

      {/* Add Bid Modal */}
      <Dialog open={bidModalOpen} onClose={() => setBidModalOpen(false)}>
        <DialogTitle>Place Bid</DialogTitle>
        <DialogContent>
          {bidError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {bidError}
            </Alert>
          )}
          <Typography variant="subtitle1" gutterBottom>
            Original Budget: P{selectedJob?.price.toFixed(2)}
        </Typography>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Select Bid Amount</InputLabel>
            <Select
              value={bidAmount}
              onChange={(e) => setBidAmount(Number(e.target.value))}
              label="Select Bid Amount"
            >
              {selectedJob && calculateBidOptions(selectedJob.price).map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBidModalOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleRaiseBudget} 
            variant="contained" 
            disabled={bidLoading}
          >
            {bidLoading ? 'Placing Bid...' : 'Place Bid'}
          </Button>
        </DialogActions>
      </Dialog>
    </ProviderLayout>
  );
}
