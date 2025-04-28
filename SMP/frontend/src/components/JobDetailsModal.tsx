"use client";
import React from 'react';
import {
  Modal,
  Box,
  Typography,
  Button,
  Paper,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';

interface Location {
  type: 'Point';
  coordinates: [number, number];
}

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

interface Job {
  _id: string;
  title: string;
  description: string;
  categoryId: string;
  category?: string;
  budget?: { $numberDecimal: string } | string | number | null;
  status?: 'Open' | 'In Progress' | 'Completed' | 'Cancelled';
  createdAt: string;
  updatedAt?: string;
  providerId?: string;
  seekerId: string;
  location?: Location;
  agreedAmount?: { $numberDecimal: string } | string | number | null;
  completedAt?: string;
  seekerInfo?: {
    firstName?: string;
    lastName?: string;
  };
  bids?: Bid[];
}

interface JobDetailsModalProps {
  open: boolean;
  onClose: () => void;
  job: Job | null;
  onAcceptBid?: (jobId: string, bidId: string) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  currency?: string;
}

const modalStyle = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90%',
  maxWidth: 800,
  maxHeight: '90vh',
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  overflow: 'auto',
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

const JobDetailsModal: React.FC<JobDetailsModalProps> = ({
  open,
  onClose,
  job,
  onAcceptBid,
  loading = false,
  error = null,
  currency = 'Pula'
}) => {
  if (!job) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="job-details-modal"
      aria-describedby="job-details-description"
    >
      <Paper sx={modalStyle}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="h5" component="h2" gutterBottom>
          {job.title}
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
            <Typography variant="subtitle1" color="text.secondary">
              Status
            </Typography>
            <Typography variant="body1" gutterBottom>
              {job.status || 'N/A'}
            </Typography>

            <Typography variant="subtitle1" color="text.secondary">
              Category
            </Typography>
            <Typography variant="body1" gutterBottom>
              {job.category || 'N/A'}
            </Typography>

            <Typography variant="subtitle1" color="text.secondary">
              Budget
            </Typography>
            <Typography variant="body1" gutterBottom>
              {currency} {parseAmount(job.budget)}
            </Typography>

            {job.agreedAmount && (
              <>
                <Typography variant="subtitle1" color="text.secondary">
                  Agreed Amount
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {currency} {parseAmount(job.agreedAmount)}
                </Typography>
              </>
            )}
          </Box>

          <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
            <Typography variant="subtitle1" color="text.secondary">
              Posted
            </Typography>
            <Typography variant="body1" gutterBottom>
              {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
            </Typography>

            {job.seekerInfo && (
              <>
                <Typography variant="subtitle1" color="text.secondary">
                  Posted By
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {`${job.seekerInfo.firstName || ''} ${job.seekerInfo.lastName || ''}`.trim() || 'N/A'}
                </Typography>
              </>
            )}

            {job.location && (
              <>
                <Typography variant="subtitle1" color="text.secondary">
                  Location
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {`${job.location.coordinates[1]}, ${job.location.coordinates[0]}`}
                </Typography>
              </>
            )}
          </Box>

          <Box sx={{ width: '100%' }}>
            <Typography variant="subtitle1" color="text.secondary">
              Description
            </Typography>
            <Typography variant="body1" paragraph>
              {job.description}
            </Typography>
          </Box>

          {job.bids && job.bids.length > 0 && (
            <Box sx={{ width: '100%' }}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Bids
              </Typography>
              {job.bids.map((bid) => (
                <Box
                  key={bid._id}
                  sx={{
                    p: 2,
                    mb: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                    <Box sx={{ flex: '2 1 200px', minWidth: 0 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Provider
                      </Typography>
                      <Typography>
                        {bid.providerInfo
                          ? `${bid.providerInfo.firstName || ''} ${bid.providerInfo.lastName || ''}`.trim()
                          : 'N/A'}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: '1 1 100px', minWidth: 0 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Amount
                      </Typography>
                      <Typography>
                        {currency} {parseAmount(bid.amount)}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: '1 1 100px', minWidth: 0 }}>
                      {onAcceptBid && bid.status === 'Pending' && (
                        <Button
                          variant="contained"
                          color="primary"
                          fullWidth
                          onClick={() => onAcceptBid(job._id, bid._id)}
                          disabled={loading}
                        >
                          Accept Bid
                        </Button>
                      )}
                      {bid.status !== 'Pending' && (
                        <Typography
                          color={bid.status === 'Accepted' ? 'success.main' : 'text.secondary'}
                          fontWeight="bold"
                        >
                          {bid.status}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={onClose} variant="outlined">
            Close
          </Button>
        </Box>
      </Paper>
    </Modal>
  );
};

export default JobDetailsModal; 