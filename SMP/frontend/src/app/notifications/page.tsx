"use client";
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import io from "socket.io-client";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Badge,
  Divider,
  Button,
  styled,
  keyframes
} from "@mui/material";
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { formatDistanceToNow } from 'date-fns';

// Socket initialization
const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000");

// Animation for new notifications
const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(25, 118, 210, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(25, 118, 210, 0); }
  100% { box-shadow: 0 0 0 0 rgba(25, 118, 210, 0); }
`;

const PulsingBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    animation: `${pulse} 2s infinite`,
  },
}));

interface Notification {
  _id: string;
  userId: string;
  type: 'job_update' | 'bid_update' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: {
    jobId?: string;
    bidId?: string;
    [key: string]: any;
  };
}

const NotificationsPage = () => {
  const { userId: clerkUserId } = useAuth();
  const { user } = useUser();
  const [mongoUserId, setMongoUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  // Fetch MongoDB user ID
  useEffect(() => {
    if (user?.id) {
      axios.get(`${API_BASE_URL}/getUserByClerkId/${user.id}`)
        .then(res => {
          if (res.data?._id) {
            setMongoUserId(res.data._id);
          } else {
            setError("Failed to load user profile");
            setLoading(false);
          }
        })
        .catch(err => {
          setError(`Failed to load user profile: ${err.message}`);
          setLoading(false);
        });
    }
  }, [user?.id, API_BASE_URL]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!mongoUserId) return;

    try {
      const response = await axios.get(`${API_BASE_URL}/notifications/${mongoUserId}`);
      const fetchedNotifications = response.data;
      setNotifications(fetchedNotifications);
      setUnreadCount(fetchedNotifications.filter((n: Notification) => !n.read).length);
    } catch (err: any) {
      setError(`Failed to fetch notifications: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [mongoUserId, API_BASE_URL]);

  // Initial fetch
  useEffect(() => {
    if (mongoUserId) {
      fetchNotifications();
    }
  }, [mongoUserId, fetchNotifications]);

  // Socket event handlers
  useEffect(() => {
    if (!mongoUserId) return;

    const handleNewNotification = (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    };

    socket.on('newNotification', handleNewNotification);

    return () => {
      socket.off('newNotification', handleNewNotification);
    };
  }, [mongoUserId]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await axios.patch(`${API_BASE_URL}/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => prev - 1);
    } catch (err: any) {
      setError(`Failed to mark notification as read: ${err.message}`);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await axios.patch(`${API_BASE_URL}/notifications/${mongoUserId}/read-all`);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err: any) {
      setError(`Failed to mark all notifications as read: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container>
        <Box mt={4}>
          <Typography color="error">{error}</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box mt={4} mb={4}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h4" component="h1">
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Button 
              variant="outlined" 
              startIcon={<CheckCircleIcon />}
              onClick={markAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </Box>

        <List>
          {notifications.length === 0 ? (
            <ListItem>
              <ListItemText primary="No notifications" />
            </ListItem>
          ) : (
            notifications.map((notification) => (
              <React.Fragment key={notification._id}>
                <ListItem
                  sx={{
                    bgcolor: notification.read ? 'inherit' : 'action.hover',
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  <ListItemIcon>
                    <PulsingBadge
                      color="primary"
                      variant="dot"
                      invisible={notification.read}
                    >
                      <NotificationsIcon />
                    </PulsingBadge>
                  </ListItemIcon>
                  <ListItemText
                    primary={notification.title}
                    secondary={
                      <>
                        <Typography component="span" variant="body2">
                          {notification.message}
                        </Typography>
                        <br />
                        <Typography component="span" variant="caption" color="text.secondary">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </Typography>
                      </>
                    }
                  />
                  {!notification.read && (
                    <IconButton onClick={() => markAsRead(notification._id)}>
                      <CheckCircleIcon />
                    </IconButton>
                  )}
                </ListItem>
                <Divider />
              </React.Fragment>
            ))
          )}
        </List>
      </Box>
    </Container>
  );
};

export default NotificationsPage; 