"use client";

import React from "react";
import { Box, Button, Typography, Paper } from "@mui/material";
import { useRouter } from "next/navigation";

export default function SelectTypePage() {
  const router = useRouter();

  const handleSeekerClick = () => {
    router.push("/completesignup?type=Seeker");
  };

  const handleProviderClick = () => {
    router.push("/completesignup?type=Provider");
  };

  return (
          <Box
            sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        p: 2,
        bgcolor: "background.default",
      }}
    >
      <Paper
        elevation={3}
            sx={{
              p: 4,
          maxWidth: 500,
          width: "100%",
              textAlign: "center",
            }}
          >
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome to Service Marketplace
            </Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
          Please select your role to continue
            </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Button
              variant="contained"
            size="large"
            onClick={handleSeekerClick}
            sx={{ py: 2 }}
          >
            I'm a Service Seeker
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={handleProviderClick}
            sx={{ py: 2 }}
            >
            I'm a Service Provider
            </Button>
        </Box>
      </Paper>
    </Box>
  );
}