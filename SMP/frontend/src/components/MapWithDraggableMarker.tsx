"use client";

import { useEffect, useState } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { Button, Box, CircularProgress } from "@mui/material";
import { usePathname } from "next/navigation";

const containerStyle = { width: "100%", height: "400px" };
const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const DEFAULT_LOCATION = { lat: -1.286389, lng: 36.817223 }; // Nairobi

const MapWithDraggableMarker = ({ onLocationSelect }) => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey,
    id: "google-maps-script-loader",
  });

  const [markerPosition, setMarkerPosition] = useState(DEFAULT_LOCATION);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const isAddJobPage = pathname === "/add-job";

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMarkerPosition({ lat: latitude, lng: longitude });
          setLoading(false);
        },
        (error) => {
          console.error("Geolocation error:", error);
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      console.warn("Geolocation is not supported.");
      setLoading(false);
    }
  }, []);

  // Notify parent component of location changes
  useEffect(() => {
    if (onLocationSelect && typeof onLocationSelect === "function") {
      onLocationSelect(markerPosition.lat, markerPosition.lng);
    } else {
      console.warn("onLocationSelect is not provided or is not a function");
    }
  }, [markerPosition, onLocationSelect]);

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMarkerPosition({ lat: latitude, lng: longitude });
        },
        (error) => {
          console.error("Geolocation error:", error);
          alert("Unable to retrieve location.");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      alert("Geolocation is not supported.");
    }
  };

  if (!isLoaded || loading) return <CircularProgress />;

  return (
    <Box sx={{ textAlign: "center" }}>
      {isAddJobPage && (
        <Button variant="contained" color="primary" sx={{ mb: 2 }} onClick={handleUseMyLocation}>
          Use My Location
        </Button>
      )}

      <GoogleMap mapContainerStyle={containerStyle} center={markerPosition} zoom={15}>
        <Marker
          position={markerPosition}
          draggable={isAddJobPage}
          onDragEnd={(e) => setMarkerPosition({ lat: e.latLng.lat(), lng: e.latLng.lng() })}
        />
      </GoogleMap>
    </Box>
  );
};

export default MapWithDraggableMarker;
