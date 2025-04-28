import React, { useState, useEffect } from 'react';
import { Typography } from '@mui/material';

interface TimerProps {
    startTime: Date;
}

const Timer: React.FC<TimerProps> = ({ startTime }) => {
    const [elapsedTime, setElapsedTime] = useState<number>(0);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
            setElapsedTime(elapsed);
        }, 1000);

        return () => clearInterval(interval);
    }, [startTime]);

    const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;

        return `${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    return (
        <Typography variant="h6" component="span">
            {formatTime(elapsedTime)}
        </Typography>
    );
};

export default Timer; 