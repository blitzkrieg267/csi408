"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import io from "socket.io-client";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from 'next/navigation';
import Sidebar from "@/components/ProviderSidebar"; // Assuming this is the PROVIDER sidebar
import JobTable from '@/components/JobTable';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Button,
  Tabs,
  Tab,
  TableFooter,
  TableRow,
  TableCell,
  Tooltip,
  IconButton,
  Alert,
  styled,
  keyframes
} from "@mui/material";
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import VisibilityIcon from '@mui/icons-material/Visibility'; // For View Details
import { formatDistanceToNow } from 'date-fns';

// --- Interfaces ---
interface Job {
  _id: string;
  title: string;
  description: string; // Keep description if needed for details page
  categoryId: string; // Keep for potential filtering/display
  category?: string; // Assuming category name might be populated/joined backend-side
  budget?: { $numberDecimal: string } | string | number | null; // Allow string/number for budget flexibility
  status?: 'In Progress' | 'Completed' | 'Cancelled'; // Reflecting getProviderJobHistory endpoint
  createdAt: string;
  updatedAt?: string; // Timestamp when status changed (e.g., assigned, completed)
  providerId?: string; // ID of the assigned provider (should match mongoUserId)
  seekerId: string; // ID of the job poster
  location?: { type: 'Point'; coordinates: [number, number]; }; // Keep for potential map features
  agreedAmount?: { $numberDecimal: string } | string | number | null; // Allow string/number flexibility
  completedAt?: string; // Timestamp when job was marked completed
  seekerInfo?: { firstName?: string; lastName?: string }; // Optional: Seeker details
}

// Socket, Animation, Styled Button (keep as before)
const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000");
const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(25, 118, 210, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(25, 118, 210, 0); }
  100% { box-shadow: 0 0 0 0 rgba(25, 118, 210, 0); }
`;
const PulsingButton = styled(Button)(({ theme }) => ({
  animation: `${pulse} 2s infinite`,
}));


const ViewProviderJobs = () => {
  const { userId: clerkUserId, getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [mongoUserId, setMongoUserId] = useState<string | null>(null);

  // State adjusted for available endpoints
  const [inProgressJobs, setInProgressJobs] = useState<Job[]>([]); // Jobs assigned to provider
  const [completedJobs, setCompletedJobs] = useState<Job[]>([]); // Jobs completed by provider
  const [totalEarned, setTotalEarned] = useState<number>(0); // Fetched from API
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null); // Separate state for loading errors
  const [actionError, setActionError] = useState<string | null>(null); // Separate state for action errors
  const [activeTab, setActiveTab] = useState(0); // Default to 'In Progress' tab (index 0 now)
  const [currency] = useState("Pula"); // Or fetch dynamically if needed

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  // --- Debugging Helper ---
  const log = (...args: any[]) => console.log("[ViewProviderJobs]", ...args);

  // 1. Fetch Provider's MongoDB User ID from Clerk ID
  useEffect(() => {
    log("Component Mounted. Checking user...");
    if (user?.id) {
      log("Clerk user ID found:", user.id);
      axios.get(`${API_BASE_URL}/getUserByClerkId/${user.id}`)
        .then(res => {
          if (res.data?._id) {
            log("MongoDB user ID fetched:", res.data._id);
            setMongoUserId(res.data._id);
          } else {
            log("Error: MongoDB user ID not found in response", res.data);
            setLoadingError("Failed to load user profile. User data missing.");
            setLoading(false);
          }
        })
        .catch(err => {
          log("Error fetching MongoDB user ID:", err);
          setLoadingError(`Failed to load user profile: ${err.message}`);
          setLoading(false);
        });
    } else if (user !== undefined) {
      log("User not logged in.");
      setLoadingError("User not logged in.");
      setLoading(false);
    } else {
        log("User object is still undefined (loading).");
    }
  }, [user?.id, API_BASE_URL]); // Removed router dependency as redirect is commented out

  // 2. Fetch Job History and Total Earned
  const fetchProviderData = useCallback(async () => {
    if (!mongoUserId) {
      log("fetchProviderData aborted: mongoUserId not available yet.");
      return;
    }
    log("Starting to fetch provider data for mongoUserId:", mongoUserId);
    setLoading(true);
    setLoadingError(null); // Clear previous loading errors
    setActionError(null); // Clear previous action errors

    try {
      // Fetch Job History (In Progress, Completed, Cancelled)
      log(`Fetching job history from: ${API_BASE_URL}/getProviderJobHistory/${mongoUserId}`);
      const historyResponse = await axios.get<{ data: Job[] } | Job[]>(`${API_BASE_URL}/getProviderJobHistory/${mongoUserId}`);
      // Check if data is nested under a 'data' property or directly the array
      const jobHistory: Job[] = Array.isArray(historyResponse.data)
          ? historyResponse.data
          : (historyResponse.data as { data: Job[] })?.data ?? [];

      log(`Fetched job history (${jobHistory.length} items):`, jobHistory);

      // Filter jobs into respective states
      const inProgress = jobHistory
        .filter(j => j.status === 'In Progress')
        .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
      const completed = jobHistory
        .filter(j => j.status === 'Completed')
        .sort((a, b) => new Date(b.completedAt || b.updatedAt || b.createdAt).getTime() - new Date(a.completedAt || a.updatedAt || a.createdAt).getTime());
        // const cancelled = jobHistory.filter(j => j.status === 'Cancelled'); // Handle if needed

      setInProgressJobs(inProgress);
      setCompletedJobs(completed);
      log("Filtered In Progress jobs:", inProgress);
      log("Filtered Completed jobs:", completed);
      // log("Filtered Cancelled jobs:", cancelled);

      // Fetch Total Amount Earned
      log(`Fetching total earned from: ${API_BASE_URL}/getProviderAmountEarned/${mongoUserId}`);
      const earnedResponse = await axios.get<{ amountEarned: number }>(`${API_BASE_URL}/getProviderAmountEarned/${mongoUserId}`);
      const earnedAmount = earnedResponse.data?.amountEarned ?? 0;
      setTotalEarned(earnedAmount);
      log("Fetched total earned:", earnedAmount);

    } catch (err: any) {
      log("Error fetching provider data:", err);
      const errorMsg = `Failed to fetch provider data: ${err.response?.data?.message || err.message || 'Unknown error'}`;
      log(errorMsg);
      setLoadingError(errorMsg); // Set the loading error state
    } finally {
      log("Finished fetching provider data.");
      setLoading(false);
    }
  }, [mongoUserId, API_BASE_URL]);

  // Trigger initial data fetch when mongoUserId is available
  useEffect(() => {
    if (mongoUserId) {
      fetchProviderData();
    }
  }, [mongoUserId, fetchProviderData]);

  // 3. Socket Event Handlers
  useEffect(() => {
    if (!mongoUserId) return;

    log("Setting up socket listeners for mongoUserId:", mongoUserId);

    const handleJobUpdate = (updatedJob: Job) => {
        log("Socket 'jobUpdated' received:", updatedJob);
        // Check if this update is relevant (job assigned to me)
        if (updatedJob.providerId === mongoUserId) {
            log(`Job ${updatedJob._id} update is relevant to me.`);
            // Remove from all lists first
            setInProgressJobs(prev => prev.filter(j => j._id !== updatedJob._id));
            setCompletedJobs(prev => prev.filter(j => j._id !== updatedJob._id));

            // Add to the correct list based on new status
            if (updatedJob.status === 'In Progress') {
                log(`Adding/Updating job ${updatedJob._id} in In Progress list.`);
                setInProgressJobs(prev => [updatedJob, ...prev].sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()));
            } else if (updatedJob.status === 'Completed') {
                log(`Adding/Updating job ${updatedJob._id} in Completed list.`);
                setCompletedJobs(prev => [updatedJob, ...prev].sort((a, b) => new Date(b.completedAt || b.updatedAt || b.createdAt).getTime() - new Date(a.completedAt || a.updatedAt || a.createdAt).getTime()));
                // Re-fetch total earned when a job is completed via socket
                fetchProviderData(); // Or just fetch the earned amount if preferred
            } else if (updatedJob.status === 'Cancelled') {
                 log(`Job ${updatedJob._id} was cancelled.`);
                 // Optionally handle cancelled jobs (e.g., remove from In Progress if it was there)
            }
        } else {
             log(`Job ${updatedJob._id} update not relevant (providerId: ${updatedJob.providerId})`);
        }
    };

    const handleJobDelete = (deletedJobId: string) => {
        log("Socket 'jobDeleted' received for ID:", deletedJobId);
        // Remove the job if it exists in either list
        const wasInProgress = inProgressJobs.some(j => j._id === deletedJobId);
        const wasCompleted = completedJobs.some(j => j._id === deletedJobId);

        if(wasInProgress) {
            log(`Removing deleted job ${deletedJobId} from In Progress list.`);
            setInProgressJobs(prev => prev.filter(j => j._id !== deletedJobId));
        }
        if(wasCompleted) {
            log(`Removing deleted job ${deletedJobId} from Completed list.`);
            setCompletedJobs(prev => prev.filter(j => j._id !== deletedJobId));
            // Re-fetch total earned if a completed job is deleted
             fetchProviderData(); // Or just fetch the earned amount
        }
    };

    socket.on('jobUpdated', handleJobUpdate);
    socket.on('jobDeleted', handleJobDelete);

    return () => {
        log("Cleaning up socket listeners.");
        socket.off('jobUpdated', handleJobUpdate);
        socket.off('jobDeleted', handleJobDelete);
    };
  }, [mongoUserId, fetchProviderData, inProgressJobs, completedJobs]); // Added state lists to dependencies

  // 4. API Action Helper
  const handleApiAction = useCallback(async (action: () => Promise<any>, successMessage: string, errorMessage: string) => {
    log(`Performing action: ${successMessage}`);
    setActionError(null); // Clear previous action errors
    try {
      await action();
      log(`Action successful: ${successMessage}`);
      // Re-fetch data to ensure UI consistency after action
      await fetchProviderData(); // Refresh data (jobs and total earned)
      // Optional: Show a success notification toast
    } catch (error: any) {
      log(`Action failed: ${errorMessage}`, error);
      const errorMsg = `${errorMessage}: ${error.response?.data?.message || error.message || 'Unknown error'}`;
      setActionError(errorMsg); // Set action error state
      // Optional: Show an error notification toast
    }
  }, [getToken, fetchProviderData]); // Depends on fetchProviderData now

  // 5. Provider-Specific Actions
  const handleCompleteJob = useCallback(async (jobId: string) => {
    log(`Attempting to mark job ${jobId} as complete.`);
    // Optional: Add confirmation dialog
    if (!window.confirm("Mark this job as completed?")) return;
    await handleApiAction(
      async () => {
        const token = await getToken();
        log(`Sending complete request for job ${jobId} with token.`);
        // Use the correct endpoint for completing a job (assuming it exists)
        // This endpoint was NOT provided, assuming a standard one like below.
        // **** YOU MIGHT NEED TO ADJUST THIS ENDPOINT ****
        return axios.post(`${API_BASE_URL}/completeJob/${jobId}`, // Or /jobs/complete/{jobId} etc.
         {},
         { headers: { Authorization: `Bearer ${token}` } });
      },
      `Job ${jobId} marked as completed request sent.`, // Adjusted message as backend might have confirmation step
      "Failed to send request to mark job as completed"
    );
  }, [handleApiAction, getToken, API_BASE_URL]);

  // Action to view job details
  const handleRowClick = useCallback((jobId: string) => {
    log(`Navigating to job details for job ID: ${jobId}`);
    router.push(`/provider/jobDetails?id=${jobId}`);
  }, [router]);

  // Handle tab changes
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    log(`Tab changed to index: ${newValue}`);
    setActiveTab(newValue);
  };

  // --- Column Definitions ---
  const inProgressJobColumns = useMemo(() => [
    { id: 'title', label: 'Job Title', minWidth: 170 },
    { id: 'category', label: 'Category', minWidth: 100 },
    // { id: 'seeker', label: 'Seeker', minWidth: 120 }, // Uncomment if API provides seekerInfo
    { id: 'started', label: 'Assigned Approx.', minWidth: 100 },
    { id: 'agreedAmount', label: `Agreed Amount (${currency})`, minWidth: 100, align: 'right' },
    { id: 'actions', label: 'Actions', minWidth: 170, align: 'center' },
  ], [currency]);

  const completedJobColumns = useMemo(() => [
    { id: 'title', label: 'Job Title', minWidth: 170 },
    { id: 'category', label: 'Category', minWidth: 100 },
    // { id: 'seeker', label: 'Seeker', minWidth: 120 }, // Uncomment if API provides seekerInfo
    { id: 'completedOn', label: 'Completed On', minWidth: 100 },
    { id: 'finalAmount', label: `Final Amount (${currency})`, minWidth: 100, align: 'right' },
    { id: 'status', label: 'Status', minWidth: 100, align: 'center' },
    { id: 'actions', label: 'Actions', minWidth: 100, align: 'center' }, // Added actions column for consistency
  ], [currency]);


  // --- RenderCell Function ---
  const renderCellContent = useCallback((job: Job, columnId: string) => {
    // Helper to safely parse budget/amount which might be object, string, or number
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

    switch (columnId) {
      case 'title': return job.title;
      case 'category': return job.category || 'N/A'; // Display category if available
      case 'started': // When the job was assigned (updatedAt is a good guess)
          return formatDistanceToNow(new Date(job.updatedAt || job.createdAt), { addSuffix: true });
      case 'completedOn':
          return job.completedAt ? new Date(job.completedAt).toLocaleDateString() : (job.updatedAt ? new Date(job.updatedAt).toLocaleDateString() : 'N/A');
      case 'agreedAmount': // Show agreed amount for in-progress
          const agreed = parseAmount(job.agreedAmount);
          const budget = parseAmount(job.budget);
          // Show agreed amount, fallback to budget if agreed is N/A
          return agreed !== 'N/A' ? agreed : (budget !== 'N/A' ? `(Budget: ${budget})` : 'N/A');
      case 'finalAmount': // Show final amount for completed
          const final = parseAmount(job.agreedAmount); // Assume agreedAmount is the final amount
          const finalBudget = parseAmount(job.budget);
          return final !== 'N/A' ? final : (finalBudget !== 'N/A' ? `(Budget: ${finalBudget})` : 'N/A');
      // case 'seeker': // Uncomment if available
      //     return job.seekerInfo ? `${job.seekerInfo.firstName || ''} ${job.seekerInfo.lastName || ''}`.trim() : 'N/A';
      case 'status':
         if (job.status === 'Completed') { return <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 'bold' }}>Completed</Typography>; }
         // Should only show 'In Progress' or 'Completed' based on tabs, but handle just in case
         return job.status || 'N/A';
      case 'actions':
        // Actions for 'In Progress' Jobs (Tab 0)
        if (activeTab === 0) {
           return (
             <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
               <Tooltip title="View Job Details">
                 <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleRowClick(job._id); }}>
                     <VisibilityIcon />
                 </IconButton>
               </Tooltip>

               {/* Add Chat button if functionality exists */}
             </Box>
           );
        }
        // Actions for 'Completed' Jobs (Tab 1)
         if (activeTab === 1) {
            return (
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                 <Tooltip title="View Job Details">
                   <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleRowClick(job._id); }}>
                       <VisibilityIcon />
                   </IconButton>
                 </Tooltip>
                 {/* Maybe add "View Invoice" or similar action here */}
               </Box>
            );
         }
        return null;
      default:
        return (job as any)[columnId] || 'N/A';
    }
  }, [currency, handleRowClick, handleCompleteJob, activeTab]);

  // --- Footer for Completed Table ---
  const completedTableFooter = useMemo(() => (
    <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 'bold', borderTop: '2px solid rgba(224, 224, 224, 1)'} }}>
      {/* Adjust colSpan based on the number of visible columns in completedJobColumns */}
      <TableCell colSpan={4} sx={{ textAlign: 'right' }}> {/* Reduced colspan by 1 */}
          Total Earned (from API):
      </TableCell>
      <TableCell align="right">
          {currency} {totalEarned.toFixed(2)}
      </TableCell>
      <TableCell colSpan={2}/> {/* Adjusted colspan for remaining empty cells */}
    </TableRow>
  ), [currency, totalEarned]);


  // --- Render Logic ---
  const renderContent = () => {
      if (!mongoUserId && !loadingError && loading) {
         log("Render: Waiting for user profile...");
         return (
             <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}> {/* Adjust height as needed */}
               <CircularProgress />
               <Typography sx={{ ml: 2 }}>Loading User Profile...</Typography>
             </Box>
         );
      }

      if (loadingError) {
        log("Render: Displaying loading error message:", loadingError);
        return (
          <Box sx={{ flexGrow: 1, p: 3 }}>
            <Container maxWidth="xl">
              <Alert severity="error">{loadingError}</Alert>
              {/* Provide a retry button only if mongoUserId is available (means profile loaded but data fetch failed) */}
              {mongoUserId && <Button startIcon={<RefreshIcon />} onClick={fetchProviderData} sx={{ mt: 2 }}>Retry Fetching Data</Button>}
              {!mongoUserId && !user?.id && <Button onClick={() => router.push('/sign-in')} sx={{ mt: 2 }}>Go to Sign In</Button>}
            </Container>
          </Box>
        );
      }

       if (loading) {
         log("Render: Displaying loading indicator for jobs...");
         return (
             <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}> {/* Adjust height as needed */}
               <CircularProgress />
               <Typography sx={{ ml: 2 }}>Loading Your Jobs...</Typography>
             </Box>
         );
       }

      // --- Main Content Render ---
      log("Render: Displaying main content with tabs.");
      return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
             <Typography variant="h4" component="h1">My Jobs</Typography>
             <PulsingButton variant="contained" startIcon={<RefreshIcon />} onClick={fetchProviderData} disabled={loading}>
                 {loading ? 'Refreshing...' : 'Refresh Jobs'}
             </PulsingButton>
          </Box>

          {/* Display Action Errors */}
           {actionError && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
                    {actionError}
                </Alert>
            )}


          {/* Tabs Adjusted for Provider */}
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="provider job status tabs" sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
             <Tab label={`In Progress (${inProgressJobs.length})`} id="tab-inprogress" aria-controls="tabpanel-inprogress" />
             <Tab label={`Completed (${completedJobs.length})`} id="tab-completed" aria-controls="tabpanel-completed" />
          </Tabs>

          {/* Tab Panels using JobTable */}
          <Box role="tabpanel" hidden={activeTab !== 0} id="tabpanel-inprogress" aria-labelledby="tab-inprogress">
            {activeTab === 0 && (
              <JobTable
                jobs={inProgressJobs}
                columns={inProgressJobColumns}
                renderCell={renderCellContent}
                onRowClick={handleRowClick}
                emptyMessage="You have no jobs currently in progress."
              />
            )}
          </Box>
          <Box role="tabpanel" hidden={activeTab !== 1} id="tabpanel-completed" aria-labelledby="tab-completed">
            {activeTab === 1 && (
              <JobTable
                jobs={completedJobs}
                columns={completedJobColumns}
                renderCell={renderCellContent}
                onRowClick={handleRowClick} // Keep row click even for completed for details view
                emptyMessage="You have not completed any jobs yet."
                footerContent={completedTableFooter} // Add the footer here
              />
            )}
          </Box>
        </Container>
      );
  }


  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Ensure this Sidebar is the Provider's sidebar */}
      <Sidebar />
      {renderContent()}
    </Box>
  );
};

export default ViewProviderJobs;
