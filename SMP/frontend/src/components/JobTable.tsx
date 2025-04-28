"use client";
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  TableFooter
} from '@mui/material';
import { Job } from '@/types/job';

interface Column {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
}

interface JobTableProps {
  jobs: Job[];
  columns: Column[];
  renderCell: (job: Job, columnId: string) => React.ReactNode;
  onRowClick?: (jobId: string) => void;
  emptyMessage?: string;
  footerContent?: React.ReactNode;
}

const JobTable: React.FC<JobTableProps> = ({
  jobs,
  columns,
  renderCell,
  onRowClick,
  emptyMessage = "No data available.",
  footerContent,
}) => {
  const handleRowClick = (job: Job) => {
    if (onRowClick) {
      onRowClick(job._id);
  }
  };

  return (
    <TableContainer component={Paper} sx={{ mb: 2 }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell
                key={column.id}
                align={column.align}
                style={{ minWidth: column.minWidth }}
              >
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {jobs.length > 0 ? (
            jobs.map((job) => (
            <TableRow
              hover
              key={job._id}
                onClick={() => handleRowClick(job)}
                sx={{
                  cursor: onRowClick ? 'pointer' : 'default',
                  '&:last-child td, &:last-child th': { border: 0 },
                }}
            >
              {columns.map((column) => (
                  <TableCell key={column.id} align={column.align}>
                    {renderCell(job, column.id)}
                </TableCell>
              ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} align="center">
                <Box sx={{ py: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    {emptyMessage}
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        {footerContent && (
          <TableFooter>
            {footerContent}
          </TableFooter>
        )}
      </Table>
    </TableContainer>
  );
};

export default JobTable;
