"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Drawer, List, ListItem, ListItemText, IconButton, Box, Divider, Button, Typography } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import Image from "next/image"; // Import the Image component

//Import the logo.
import logo from '../../public/globe.svg'

const Sidebar = () => {
  const [open, setOpen] = useState(true);
  const { signOut } = useAuth();
  const router = useRouter();
  const drawerRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (open && drawerRef.current && !drawerRef.current.contains(event.target as Node) && (event.target as HTMLElement).id !== "menu-icon") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Toggle Button (Appears when Sidebar is Closed) */}
      {!open && (
        <IconButton onClick={() => setOpen(true)} sx={{ position: "absolute", top: 20, left: 20, bgcolor: "blue", color: "red" }} id="menu-icon">
          <MenuIcon />
        </IconButton>
      )}

      <Drawer
        variant="permanent"
        open={open}
        ref={drawerRef}
        sx={{
          "& .MuiDrawer-paper": {
            width: open ? 240 : 0,
            transition: "width 0.3s ease-in-out",
            bgcolor: "#0D47A1",
            color: "white",
          },
        }}
      >
        {/* Close Button (Inside Sidebar) */}
        <IconButton onClick={() => setOpen(false)} sx={{ color: "white", m: 2 }}>
          <MenuIcon />
        </IconButton>

        {/* Logo */}
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <Image src={logo} alt="TaskFinder Logo" width={100} height={50} />
        </Box>

        {/* Sidebar Title */}
        <Typography variant="h6" align="center" sx={{ my: 2 }}>
          🔧 TaskFinder
        </Typography>

        <Divider sx={{ bgcolor: "white", mb: 2 }} />

        {/* Sidebar Links */}
        <List>
          <Link href="/dashboard" passHref>
            <ListItem sx={{ "&:hover": { bgcolor: "red" } }}>
              <ListItemText primary="Dashboard" />
            </ListItem>
          </Link>

          <Link href="/add-job" passHref>
            <ListItem sx={{ "&:hover": { bgcolor: "red" } }}>
              <ListItemText primary="Add Job" />
            </ListItem>
          </Link>

          <Link href="/view-jobs" passHref>
            <ListItem sx={{ "&:hover": { bgcolor: "red" } }}>
              <ListItemText primary="Job History" />
            </ListItem>
          </Link>
        </List>

        <Divider sx={{ bgcolor: "white", my: 2 }} />

        {/* Sign Out Button */}
        <Button
          onClick={handleSignOut}
          startIcon={<LogoutIcon />}
          sx={{
            mx: "auto",
            display: "block",
            color: "white",
            bgcolor: "red",
            "&:hover": { bgcolor: "darkred" },
          }}
        >
          Sign Out
        </Button>
      </Drawer>
    </Box>
  );
};

export default Sidebar;