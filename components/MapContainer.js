// components/MapContainer.js
import React from "react";

function MapContainer({ placeLat, placeLon, zoom }) {
  return (
    <div style={{ width: "100%", height: "100%", backgroundColor: "#ddd" }}>
      {/* Replace this with your actual map library code */}
      <p>Map Placeholder</p>
      <p>Lat: {placeLat}, Lon: {placeLon}, Zoom: {zoom}</p>
    </div>
  );
}

export default MapContainer;
