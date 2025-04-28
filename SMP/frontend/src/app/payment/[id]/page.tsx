"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useAuth } from "@clerk/nextjs";
import Sidebar from "@/components/Sidebar";
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Container,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { formatDistanceToNow, format } from 'date-fns';

interface Job {
  _id: string;
  title: string;
  description: string;
  budget?: { $numberDecimal: string } | null;
  status?: string;
  createdAt: string;
}

const PaymentPage = ({ params }: { params: { id: string } }) => {
  const jobId = params.id;
  const router = useRouter();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobDetails, setJobDetails] = useState<Job | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  useEffect(() => {
    const fetchJobDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        const jobResponse = await axios.get(`${API_BASE_URL}/getJob/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (jobResponse.status === 200) {
          setJobDetails(jobResponse.data);
        } else {
          setError("Failed to fetch job details.");
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to fetch details.");
      } finally {
        setLoading(false);
      }
    };

    if(jobId){
      fetchJobDetails();
    }
  }, [jobId, getToken, API_BASE_URL]);

  const handlePaymentSubmit = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update job status to completed
      await axios.put(
        `${API_BASE_URL}/jobs/${jobId}/status`,
        { status: 'Completed' },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setShowSuccess(true);
      // Wait for success animation
      await new Promise(resolve => setTimeout(resolve, 2000));
      router.push(`/jobDetails?id=${jobId}`);
    } catch (error: any) {
      console.error("Error completing job:", error);
      setError(error.response?.data?.error || error.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !showSuccess) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md">
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Complete Payment
          </Typography>

          {jobDetails && (
            <Box mb={3}>
              <Typography variant="h6" gutterBottom>
                Job Details
              </Typography>
              <Typography>Title: {jobDetails.title}</Typography>
              <Typography>Amount: P{jobDetails.budget?.$numberDecimal}</Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Payment Method</InputLabel>
              <Select
                value={paymentMethod}
                label="Payment Method"
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <MenuItem value="card">Credit/Debit Card</MenuItem>
                <MenuItem value="bank">Bank Transfer</MenuItem>
                <MenuItem value="mobile">Mobile Money</MenuItem>
              </Select>
            </FormControl>

            {paymentMethod === 'card' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Card Number"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="1234 5678 9012 3456"
                />
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Expiry Date"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    placeholder="MM/YY"
                  />
                  <TextField
                    fullWidth
                    label="CVV"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    placeholder="123"
                  />
                </Box>
              </Box>
            )}

            {paymentMethod === 'bank' && (
              <Typography variant="body2" color="text.secondary">
                Please transfer the amount to:
                <br />
                Bank: Demo Bank
                <br />
                Account: 1234567890
                <br />
                Reference: Job-{jobId}
              </Typography>
            )}

            {paymentMethod === 'mobile' && (
              <Typography variant="body2" color="text.secondary">
                Please send the amount to:
                <br />
                Mobile Money: +267 1234567
                <br />
                Reference: Job-{jobId}
              </Typography>
            )}

            <Button
              variant="contained"
              color="primary"
              onClick={handlePaymentSubmit}
              disabled={loading}
              fullWidth
            >
              {loading ? 'Processing...' : 'Complete Payment'}
            </Button>
          </Box>
        </Paper>
      </Container>

      <Dialog
        open={showSuccess}
        aria-labelledby="success-dialog-title"
        aria-describedby="success-dialog-description"
      >
        <DialogContent sx={{ textAlign: 'center', p: 3 }}>
          <CheckCircleOutlineIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
          <DialogTitle id="success-dialog-title">Payment Successful!</DialogTitle>
          <DialogContentText id="success-dialog-description">
            Your payment has been processed successfully.
            <br />
            The job has been marked as completed.
          </DialogContentText>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default PaymentPage;