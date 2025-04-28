import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@mui/material"
import { Badge } from "@mui/material"
import { cn } from "@/lib/utils"
import { Socket, io } from 'socket.io-client';

interface Notification {
  type: 'bid' | 'job' | 'completed';
  message: string;
  jobTitle?: string; // For bid and completed notifications
  bidAmount?: number; // For bid notifications
  providerName?: string; //for bid
  jobPoster?: string; // for completed
  createdAt: string;
}

const NotificationTable = ({ notifications, title, clearNotifications }: { notifications: Notification[], title: string, clearNotifications: () => void }) => {
  if (!notifications || notifications.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="absolute top-16 right-4 w-72 bg-white/10 backdrop-blur-md rounded-lg shadow-lg border border-white/10 p-4"
      >
        <p className="text-gray-400 text-sm">No new notifications.</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="absolute top-16 right-4 w-80 bg-white/10 backdrop-blur-md rounded-xl shadow-2xl border border-white/10 overflow-hidden"
    >
      <div className="px-4 py-2 bg-gray-800/50 border-b border-white/10">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      <div className="max-h-64 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-white text-sm">Message</TableHead>
              <TableHead className="text-white text-sm">Details</TableHead>
              <TableHead className="text-white text-sm">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notifications.map((notification, index) => (
              <TableRow key={index} className="hover:bg-gray-700/50 transition-colors">
                <TableCell className="text-gray-300 text-sm font-medium">
                  {notification.message}
                </TableCell>
                <TableCell className="text-gray-400 text-sm">
                  {notification.type === 'bid' && (
                    <>
                      <p>Bid: {notification.bidAmount} Pula</p>
                      <p>Provider: {notification.providerName}</p>
                      <p>Job: {notification.jobTitle}</p>
                    </>
                  )}
                  {notification.type === 'job' && (
                    <p>Job: {notification.jobTitle}</p>
                  )}
                   {notification.type === 'completed' && (
                    <>
                      <p>Job: {notification.jobTitle}</p>
                      <p>By: {notification.jobPoster}</p>
                    </>
                  )}
                </TableCell>
                <TableCell className="text-gray-500 text-xs">
                  {new Date(notification.createdAt).toLocaleTimeString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="p-2 border-t border-white/10">
        <Button
          variant="outlined"
          size="small"
          onClick={clearNotifications}
          className="w-full bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white border-gray-700"
        >
          Clear All
        </Button>
      </div>
    </motion.div>
  );
};

const SeekerNotificationListener = ({ seekerId }: { seekerId: string | null }) => {
  const [bidNotifications, setBidNotifications] = useState<Notification[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:3001');
    setSocket(newSocket);

     return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!seekerId || !socket) return;

    const handleBidNotification = (notification: Notification) => {
      if (notification.type === 'bid') {
        setBidNotifications(prev => [notification, ...prev]);
      }
    };

    socket.on(`bid-placed-seeker-${seekerId}`, handleBidNotification);

    return () => {
      socket.off(`bid-placed-seeker-${seekerId}`, handleBidNotification);
    };
  }, [seekerId, socket]);

    const clearBidNotifications = () => {
    setBidNotifications([]);
  };

  return (
    <>
      {bidNotifications.length > 0 && (
        <NotificationTable
          notifications={bidNotifications}
          title="Bid Notifications"
          clearNotifications={clearBidNotifications}
        />
      )}
    </>
  );
};

const ProviderNotificationListener = ({ providerId }: { providerId: string | null }) => {
  const [jobNotifications, setJobNotifications] = useState<Notification[]>([]);
  const [completionNotifications, setCompletionNotifications] = useState<Notification[]>([]);
    const [socket, setSocket] = useState<Socket | null>(null);

      useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:3001');
    setSocket(newSocket);

     return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!providerId || !socket) return;

    const handleJobNotification = (notification: Notification) => {
      if (notification.type === 'job') {
        setJobNotifications(prev => [notification, ...prev]);
      }
    };

    const handleCompletionNotification = (notification: Notification) => {
      if (notification.type === 'completed'){
        setCompletionNotifications(prev => [notification, ...prev]);
      }
    }

    socket.on(`job-posted-provider-${providerId}`, handleJobNotification);
    socket.on(`job-completed-provider-${providerId}`, handleCompletionNotification);

    return () => {
      socket.off(`job-posted-provider-${providerId}`, handleJobNotification);
      socket.off(`job-completed-provider-${providerId}`, handleCompletionNotification);
    };
  }, [providerId, socket]);

  const clearJobNotifications = () => {
    setJobNotifications([]);
  };

  const clearCompletionNotifications = () => {
    setCompletionNotifications([]);
  };

  return (
    <>
      {jobNotifications.length > 0 && (
        <NotificationTable
          notifications={jobNotifications}
          title="New Job Alerts"
          clearNotifications={clearJobNotifications}
        />
      )}
      {completionNotifications.length > 0 && (
        <NotificationTable
          notifications={completionNotifications}
          title="Job Completion Alerts"
          clearNotifications={clearCompletionNotifications}
        />
      )}
    </>
  );
};

export { SeekerNotificationListener, ProviderNotificationListener };

