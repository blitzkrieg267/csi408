import React, { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Bell, Check } from 'lucide-react';
import { Badge, IconButton, Menu, MenuItem, Typography } from '@mui/material';
import axios from 'axios';

interface Notification {
  _id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  jobId: string;
}

export const NotificationComponent = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { userId } = useAuth();

  useEffect(() => {
    if (userId) {
      fetchNotifications();
      // Set up WebSocket connection for real-time updates
      const ws = new WebSocket(`ws://localhost:3001/notifications/${userId}`);
      
      ws.onmessage = (event) => {
        const newNotification = JSON.parse(event.data);
        setNotifications(prev => [newNotification, ...prev]);
      };

      return () => ws.close();
    }
  }, [userId]);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`/api/notifications/${userId}`);
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await axios.put(`/api/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div>
      <IconButton onClick={handleClick}>
        <Badge badgeContent={unreadCount} color="error">
          <Bell />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        {notifications.map((notification) => (
          <MenuItem 
            key={notification._id}
            onClick={() => markAsRead(notification._id)}
            sx={{ 
              backgroundColor: notification.read ? 'inherit' : '#f0f0f0',
              minWidth: '300px'
            }}
          >
            <div>
              <Typography variant="body2">{notification.message}</Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(notification.createdAt).toLocaleString()}
              </Typography>
            </div>
            {!notification.read && <Check size={16} />}
          </MenuItem>
        ))}
      </Menu>
    </div>
  );
};
