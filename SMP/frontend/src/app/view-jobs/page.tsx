"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import io from "socket.io-client";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from 'next/navigation'; // Corrected import for App Router
import Sidebar from "@/components/Sidebar";
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Button,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableFooter, // Added for total row
  Tooltip,    // Added for tab hover text
  IconButton, // Added for refresh button icon
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import RefreshIcon from '@mui/icons-material/Refresh'; // Added for refresh button icon
import { formatDistanceToNow } from 'date-fns';
import JobTable from '@/components/JobTable';
import { Job } from '@/components/JobTable';
import JobDetailsModal from '@/components/JobDetailsModal';

// Initialize Socket.IO connection (ensure the URL is correct for your environment)
// Consider moving this URL to environment variables for production
const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000");

// Interface definitions
interface Bid {
    _id: string;
  providerId: string;
  amount: { $numberDecimal: string } | number;
  createdAt: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
  providerInfo?: {
    firstName?: string;
    lastName?: string;
  };
}

const ViewJobs = () => {
  const { userId: clerkUserId, getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [mongoUserId, setMongoUserId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [currency] = useState("Pula");

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  // Fetch MongoDB User ID
  useEffect(() => {
    if (user?.id) {
      axios.get(`${API_BASE_URL}/getUserByClerkId/${user.id}`)
        .then(res => {
          if (res.data?._id) {
            setMongoUserId(res.data._id);
          } else {
            setLoadingError("Failed to load user profile. User data missing.");
            setLoading(false);
          }
        })
        .catch(err => {
          setLoadingError(`Failed to load user profile: ${err.message}`);
          setLoading(false);
        });
    } else if (user !== undefined) {
      setLoadingError("User not logged in.");
      setLoading(false);
    }
  }, [user?.id, API_BASE_URL]);

  // Fetch Jobs
  const fetchJobs = useCallback(async () => {
    if (!mongoUserId) return;

    setLoading(true);
    setLoadingError(null);
    setActionError(null);

    try {
        const response = await axios.get<Job[]>(`${API_BASE_URL}/seeker/jobs`, {
            params: {
                seekerId: mongoUserId,
                status: activeTab === 0 ? 'Open' : activeTab === 1 ? 'In Progress' : 'Completed'
            }
        });
        setJobs(response.data);
    } catch (error: any) {
        setLoadingError(`Failed to fetch jobs: ${error.message}`);
    } finally {
        setLoading(false);
    }
  }, [mongoUserId, API_BASE_URL, activeTab]);

  useEffect(() => {
    if (mongoUserId) {
      fetchJobs();
    }
  }, [mongoUserId, fetchJobs]);

  // Handle Tab Change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Handle Row Click
  const handleRowClick = useCallback((jobId: string) => {
    const job = jobs.find(j => j._id === jobId);
    if (job) {
      setSelectedJob(job);
      setModalOpen(true);
    }
  }, [jobs]);

  // Handle Accept Bid
  const handleAcceptBid = useCallback(async (jobId: string, bidId: string) => {
    setModalLoading(true);
    setModalError(null);

      try {
        const token = await getToken();
      await axios.post(
        `${API_BASE_URL}/acceptBid/${bidId}`,
        { jobId },
              { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh jobs list
      await fetchJobs();

      // Close modal
      setModalOpen(false);
      setSelectedJob(null);
    } catch (error: any) {
      setModalError(`Failed to accept bid: ${error.response?.data?.message || error.message}`);
    } finally {
      setModalLoading(false);
    }
  }, [API_BASE_URL, getToken, fetchJobs]);

  // Parse Amount Helper
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

  // Column Definitions
  const columns = [
    { id: 'title', label: 'Job Title', minWidth: 170 },
    { id: 'category', label: 'Category', minWidth: 100 },
    { id: 'budget', label: 'Budget (P)', minWidth: 100, align: 'right' as const },
    { id: 'status', label: 'Status', minWidth: 100 },
    { id: 'bids', label: 'Bids', minWidth: 100, align: 'right' as const },
    { id: 'posted', label: 'Posted', minWidth: 100 },
  ];

  const renderStatusChip = (status: string) => {
    const statusColors = {
      'Open': 'primary',
      'In Progress': 'warning',
      'Completed': 'success',
      'Cancelled': 'error'
    } as const;

    return (
      <Chip
        label={status}
        color={statusColors[status as keyof typeof statusColors] || 'default'}
        size="small"
      />
    );
  };

  // Render Cell Content
  const renderCellContent = useCallback((job: Job, columnId: string): React.ReactNode => {
    switch (columnId) {
      case 'title':
        return <Typography variant="body2">{job.title}</Typography>;
      case 'category':
        return <Typography variant="body2">{job.category || 'N/A'}</Typography>;
      case 'budget':
        return <Typography variant="body2" align="right">{parseAmount(job.budget)}</Typography>;
      case 'status':
        return renderStatusChip(job.status || 'N/A');
      case 'bids':
        return <Typography variant="body2" align="right">{job.bids?.length || 0}</Typography>;
      case 'posted':
        return <Typography variant="body2">{new Date(job.createdAt).toLocaleDateString()}</Typography>;
      default:
        return <Typography variant="body2">N/A</Typography>;
    }
  }, []);

  // Filter Jobs Based on Active Tab
  const filteredJobs = useMemo(() => {
    switch (activeTab) {
      case 0: // Open
        return jobs.filter(job => job.status === 'Open');
      case 1: // In Progress
        return jobs.filter(job => job.status === 'In Progress');
      case 2: // Completed
        return jobs.filter(job => job.status === 'Completed');
      default:
        return jobs;
    }
  }, [jobs, activeTab]);

  // Render Content
  if (!mongoUserId && !loadingError && loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading User Profile...</Typography>
      </Box>
    );
  }

  if (loadingError) {
    return (
      <Box sx={{ p: 3 }}>
        <Container maxWidth="xl">
          <Alert severity="error">{loadingError}</Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flexGrow: 1, p: 3 }}>
        <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" component="h1">My Jobs</Typography>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={fetchJobs}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh Jobs'}
            </Button>
        </Box>

          {actionError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
              {actionError}
            </Alert>
          )}

        <Tabs
          value={activeTab}
            onChange={handleTabChange}
          aria-label="job status tabs"
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
          >
            <Tab label={`Open (${jobs.filter(j => j.status === 'Open').length})`} />
            <Tab label={`In Progress (${jobs.filter(j => j.status === 'In Progress').length})`} />
            <Tab label={`Completed (${jobs.filter(j => j.status === 'Completed').length})`} />
        </Tabs>

          <JobTable
            jobs={filteredJobs}
            columns={columns}
            renderCell={renderCellContent}
            onRowClick={handleRowClick}
            emptyMessage={`No ${activeTab === 0 ? 'open' : activeTab === 1 ? 'in progress' : 'completed'} jobs found.`}
          />

          <JobDetailsModal
            open={modalOpen}
            onClose={() => {
              setModalOpen(false);
              setSelectedJob(null);
              setModalError(null);
            }}
            job={selectedJob}
            onAcceptBid={handleAcceptBid}
            loading={modalLoading}
            error={modalError}
            currency={currency}
          />
        </Container>
            </Box>
    </Box>
  );
};

export default ViewJobs;