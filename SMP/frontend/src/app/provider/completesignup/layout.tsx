"use client";

import { Box } from '@mui/material';

export default function ProviderCompleteSignupLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <Box sx={{ 
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.default',
            p: 3
        }}>
            {children}
        </Box>
    );
} 