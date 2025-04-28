'use client';

import { useEffect, useState } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { Button, Box, CircularProgress } from '@mui/material';

const containerStyle = {
  width: '100%',
  height: '400px',
};

const DEFAULT_LOCATION = { lat: -1.286389, lng: 36.817223 }; // Nairobi
const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

type Props = {
  location: { lat: number; lng: number };
  setLocation: (value: { lat: number; lng: number }) => void;
};

const DraggableMap = ({ location, setLocation }: Props) => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: googleMapsApiKey || '',
    id: 'google-maps-script-loader',
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try get current user location on mount
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setLocation({ lat: latitude, lng: longitude });
          setLoading(false);
        },
        (err) => {
          console.warn('Geolocation error:', err);
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      console.warn('Geolocation not supported');
      setLoading(false);
    }
  }, [setLocation]);

  const handleLocationChange = (newLat, newLng) => {
    console.log("Map Location Changed:", { lat: newLat, lng: newLng });
    setLocation({ lat: newLat, lng: newLng }); // Assuming 'setLocation' is the prop
  };

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setLocation({ lat: latitude, lng: longitude });
        },
        () => alert('Unable to retrieve your location.')
      );
    } else {
      alert('Geolocation not supported.');
    }
  };

  if (!isLoaded || loading) return <CircularProgress />;

  return (
    <Box textAlign="center">
      <Button variant="contained" onClick={handleUseMyLocation} sx={{ mb: 2 }}>
        Use My Location
      </Button>

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={location}
        zoom={15}
      >
        <Marker
          position={location}
          draggable
          onDragEnd={(e) =>
            setLocation({ lat: e.latLng?.lat() || 0, lng: e.latLng?.lng() || 0 })
          }
        />
      </GoogleMap>
    </Box>
  );
};

export default DraggableMap;
