// components/map/MapContainer.js
import React from "react";

export default function MapContainer({ placeLat, placeLon, zoom }) {
  // If you haven't set up a real map library, 
  // this just shows placeholder text with the props
  return (
    <div style={{ width: "100%", height: "100%", backgroundColor: "#cccccc" }}>
      <p>Latitude: {placeLat}</p>
      <p>Longitude: {placeLon}</p>
      <p>Zoom Level: {zoom}</p>
      {/* 
        TODO: Replace this placeholder with your actual map library code 
        (e.g., Leaflet, Google Maps, Mapbox, etc.)
      */}
    </div>
  );
}
