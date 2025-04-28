"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Drawer, List, ListItem, ListItemText, IconButton, Box, Divider, Button, Typography } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import Image from "next/image";

//Import the logo.
import logo from '../../public/globe.svg'

const drawerWidth = 240;

const ProviderSidebar = () => {
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
        <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Image src={logo} alt="Logo" width={40} height={40} />
          <IconButton onClick={() => setOpen(false)} sx={{ color: "white" }}>
          <MenuIcon />
        </IconButton>
        </Box>

        <Divider sx={{ bgcolor: "rgba(255, 255, 255, 0.12)" }} />

        <List>
          <ListItem component={Link} href="/provider/dashboard" sx={{ "&:hover": { bgcolor: "rgba(255, 255, 255, 0.1)" } }}>
              <ListItemText primary="Dashboard" />
            </ListItem>
          <ListItem component={Link} href="/provider/find-jobs" sx={{ "&:hover": { bgcolor: "rgba(255, 255, 255, 0.1)" } }}>
            <ListItemText primary="Find Work" />
           </ListItem>
          <ListItem component={Link} href="/provider/view-jobs" sx={{ "&:hover": { bgcolor: "rgba(255, 255, 255, 0.1)" } }}>
            <ListItemText primary="Job History" />
            </ListItem>
        </List>

        <Box sx={{ mt: "auto", p: 2 }}>
        <Button
            variant="contained"
            color="error"
            startIcon={<LogoutIcon />}
          onClick={handleSignOut}
          fullWidth
        >
          Sign Out
        </Button>
        </Box>
      </Drawer>
    </Box>
  );
};

export default ProviderSidebar;