"use client";

import React, { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import axios from "axios";
import {
  Modal,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TablePagination,
  CircularProgress,
  Alert,
  AlertTitle,
  Divider
} from "@mui/material";
import { useUser } from "@clerk/nextjs";
import dynamic from "next/dynamic";
import { formatDistanceToNow } from 'date-fns';
import { Info, HelpCircle, List, CheckCircle, Clock, MapPin } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useRouter } from 'next/navigation';

// Lazy load Map component
const MapComponent = dynamic(() => import("@/components/MapWithDraggableMarker"), { ssr: false });

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "80%",
  bgcolor: "background.paper",
  boxShadow: 24,
  p: 4,
  maxHeight: "90vh",
  overflowY: "auto",
};

interface Job {
  _id: string;
  title: string;
  description: string;
  budget: { $numberDecimal: string } | null;
  status: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  createdAt: string;
}

const SeekerDashboard = () => {
  const { user } = useUser();
  const [seekerId, setSeekerId] = useState<string | null>(null);
  const [data, setData] = useState({ openJobs: 0, completedJobs: 0, inProgressJobs: 0 });
  const [selectedJobs, setSelectedJobs] = useState<Job[]>([]);
  const [modalTitle, setModalTitle] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const currency = "Pula";
  const router = useRouter();

  const userId = user?.id;

  // Initialize Socket.IO connection
  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:3001');
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Fetch seekerId
  useEffect(() => {
    const fetchSeekerId = async () => {
      if (!userId) return;
      try {
        setLoading(true);
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/getUserByClerkId/${userId}`
        );
        setSeekerId(response.data._id);
      } catch (error: any) {
        console.error("Error fetching seekerId:", error);
        setError(error.message || "Failed to fetch user data.");
      } finally {
        setLoading(false);
      }
    };

    fetchSeekerId();
  }, [userId]);

  // Fetch dashboard data and listen for Socket.IO events
  useEffect(() => {
    if (!seekerId || !socket) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/seeker/dashboard/${seekerId}`
        );
        setData(response.data);
      } catch (error: any) {
        console.error("Error fetching dashboard data:", error);
        setError(error.message || "Failed to fetch dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const handleDataChange = () => {
      console.log("Socket.IO event received! Refreshing data...");
      fetchData();
    };

    socket.on('jobCompleted', handleDataChange); // Corrected event name
    socket.on('job-created', handleDataChange);
    socket.on('job-updated', handleDataChange);
    socket.on('bid-created', handleDataChange);
    socket.on('message', handleDataChange);

    return () => {
      socket.off('jobCompleted', handleDataChange);  // Corrected event name
      socket.off('job-created', handleDataChange);
      socket.off('job-updated', handleDataChange);
      socket.off('bid-created', handleDataChange);
      socket.off('message', handleDataChange);
    };
  }, [seekerId, socket]);

  const fetchJobs = useCallback(async (status: string) => {
    if (!seekerId) return;
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/seeker/jobs?seekerId=${seekerId}&status=${status}`
      );
      setSelectedJobs(response.data);
      setModalTitle(
        status === "Open"
          ? "Open Jobs"
          : status === "Completed"
            ? "Completed Jobs"
            : "In Progress Jobs"
      );
      setModalOpen(true);
    } catch (error: any) {
      console.error(`Error fetching ${status} jobs:`, error);
      setError(error.message || `Failed to fetch ${status} jobs.`);
    } finally {
      setLoading(false);
    }
  }, [seekerId]);

  const handleOpenModal = (status: string) => {
    fetchJobs(status);
  };

  const handleRowClick = (job: Job) => {
    setSelectedJob(job);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedJob(null);
  };

  const handleChangePage = (event: React.ChangeEvent<unknown>, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleJobDetailsNavigation = (jobId: string) => {
    router.push(`/jobDetails?id=${jobId}`);
  };

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-6 ml-16 md:ml-64">
        {loading && (
          <div className="flex items-center justify-center h-screen">
            <CircularProgress />
          </div>
        )}
        {error && (
          <Alert severity="error">
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        )}

        {!loading && !error && (
          <>
            <Typography variant="h4" gutterBottom>
              Welcome, {user?.firstName} {user?.lastName}!
            </Typography>

            {/* "Get Help" Button and Explanation */}
            <div className="mb-6 p-4 bg-white rounded-lg shadow-md border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <HelpCircle className="text-blue-500" size={20} />
                <Typography variant="h6" className="font-semibold">
                  Need Help?
                </Typography>
              </div>
              <Typography variant="body1" className="mb-4">
                Click the button below to post a job and get assistance from service providers.
                This will open a form where you can describe your needs.
              </Typography>
              <button className="bg-blue-600 text-white px-6 py-3 rounded-lg text-xl font-bold shadow-lg hover:bg-blue-700 transition">
                <a href="/add-job">GET HELP!</a>
              </button>
            </div>

            {/* Dashboard Cards */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                className="p-6 bg-white shadow rounded-lg cursor-pointer transition-transform hover:scale-105"
                onClick={() => handleOpenModal("Open")}
              >
                <div className="flex items-center gap-2 mb-2">
                  <List className="text-blue-500" size={20} />
                  <h3 className="text-lg font-semibold">Open Jobs</h3>
                </div>
                <p className="text-2xl font-bold text-blue-600">{data.openJobs}</p>
                <Typography variant="body2" className="text-gray-500 mt-2">
                  Click to view open jobs.
                </Typography>
              </div>
              <div
                className="p-6 bg-white shadow rounded-lg cursor-pointer transition-transform hover:scale-105"
                onClick={() => handleOpenModal("Completed")}
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="text-green-500" size={20} />
                  <h3 className="text-lg font-semibold">Completed Jobs</h3>
                </div>
                <p className="text-2xl font-bold text-green-600">{data.completedJobs}</p>
                <Typography variant="body2" className="text-gray-500 mt-2">
                  Click to view completed jobs.
                </Typography>
              </div>
              <div
                className="p-6 bg-white shadow rounded-lg cursor-pointer transition-transform hover:scale-105"
                onClick={() => handleOpenModal("In Progress")}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="text-yellow-500" size={20} />
                  <h3 className="text-lg font-semibold">In Progress Jobs</h3>
                </div>
                <p className="text-2xl font-bold text-yellow-600">{data.inProgressJobs}</p>
                <Typography variant="body2" className="text-gray-500 mt-2">
                  Click to view jobs in progress.
                </Typography>
              </div>
            </div>

            {/* Modal for Jobs */}
            <Modal open={modalOpen} onClose={handleCloseModal}>
              <Box sx={modalStyle}>
                <Typography variant="h6" gutterBottom>
                  {modalTitle}
                </Typography>
                <Typography variant="body2" className="mb-4">
                  {modalTitle === "Open Jobs" &&
                    "This table shows the jobs you have posted that are currently open and accepting bids."}
                  {modalTitle === "Completed Jobs" &&
                    "This table displays the jobs you have marked as completed."}
                  {modalTitle === "In Progress Jobs" &&
                    "Click on a job row to view its details."}
                </Typography>

                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Title</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Budget</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Posted</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedJobs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} align="center">
                            <Typography variant="body1">No jobs available.</Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedJobs
                          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                          .map((job) => (
                            <TableRow
                              key={job._id}
                              onClick={() => handleJobDetailsNavigation(job._id)}
                              hover
                              style={{ cursor: 'pointer' }}
                            >
                              <TableCell>{job.title}</TableCell>
                              <TableCell>{job.description}</TableCell>
                              <TableCell>{currency} {job.budget?.$numberDecimal || "N/A"}</TableCell>
                              <TableCell>{job.status}</TableCell>
                              <TableCell>{formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}</TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Pagination */}
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25]}
                  component="div"
                  count={selectedJobs.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                />

                {/* Job Details Section (Remains for other modals if needed) */}
                {selectedJob && modalTitle !== "In Progress Jobs" && (
                  <Box
                    id="jobDetailsSection"
                    sx={{
                      mt: 2,
                      p: 2,
                      bgcolor: "background.default",
                      borderRadius: 2,
                      maxHeight: "40vh",
                      overflowY: "auto",
                      position: "relative"
                    }}
                  >
                    <Typography variant="h6">Job Details</Typography>
                    <Typography sx={{ mb: 1 }}><strong>Title:</strong> {selectedJob.title}</Typography>
                    <Typography sx={{ mb: 1 }}><strong>Description:</strong> {selectedJob.description}</Typography>
                    <Typography sx={{ mb: 1 }}><strong>Budget:</strong> P{selectedJob.budget?.$numberDecimal || "N/A"}</Typography>
                    <Typography sx={{ mb: 1 }}><strong>Status:</strong> {selectedJob.status}</Typography>
                    <Typography sx={{ mb: 1 }}><strong>Posted:</strong> {formatDistanceToNow(new Date(selectedJob.createdAt), { addSuffix: true })}</Typography>

                    {/* Map Section */}
                    {selectedJob?.location && selectedJob.location.latitude && selectedJob.location.longitude && (
                      <div className="mt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="text-blue-500" size={20} />
                          <Typography variant="subtitle1" className="font-semibold">
                            Location
                          </Typography>
                        </div>
                        <Typography variant="body2" className="mb-2">
                          This map shows the location where the job needs to be performed.
                        </Typography>
                        <Box sx={{
                          width: "100%",
                          height: "300px",
                          borderRadius: 2,
                          overflow: "hidden",
                        }}>
                          <MapComponent
                            initialLocation={{
                              latitude: selectedJob.location.latitude,
                              longitude: selectedJob.location.longitude,
                            }}
                            isDraggable={false}
                          />
                        </Box>
                      </div>
                    )}
                  </Box>
                )}

                <Button variant="contained" color="primary" onClick={handleCloseModal} sx={{ mt: 2 }}>
                  Close
                </Button>
              </Box>
            </Modal>
          </>
        )}
      </main>
    </div>
  );
};

export default SeekerDashboard;