import { useState, useEffect } from 'react';
import TinderCard from 'react-tinder-card';
import EventCard from '../components/EventCard';

const Home = ({ events }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const eventsList = events || [];

  useEffect(() => {
    if (!eventsList.length) {
      console.error("No events found. Check API key or query.");
    }
  }, [eventsList]);

  const handleSwipe = (direction) => {
    if (currentIndex >= eventsList.length) return; // Prevent out-of-bounds access

    if (direction === 'right') {
      try {
        const existing = JSON.parse(localStorage.getItem('likedEvents') || '[]');
        existing.push(eventsList[currentIndex]);
        localStorage.setItem('likedEvents', JSON.stringify(existing));
      } catch (error) {
        console.error("Error saving to localStorage:", error);
      }
    }

    setCurrentIndex((prev) => (prev < eventsList.length - 1 ? prev + 1 : prev));
  };

  const swipeYes = () => handleSwipe('right');
  const swipeNo = () => handleSwipe('left');

  if (!eventsList.length) {
    return <div className="swipe-container"><p>Loading events... (Check API Key)</p></div>;
  }
  if (currentIndex >= eventsList.length) {
    return <div className="swipe-container"><p>No more events available.</p></div>;
  }

  return (
    <div className="swipe-container">
      <TinderCard
        className="swipe-card"
        key={eventsList[currentIndex].id}
        onSwipe={handleSwipe}
        preventSwipe={['up', 'down']}
      >
        <EventCard event={eventsList[currentIndex]} />
      </TinderCard>
      <div className="swipe-buttons">
        <button className="no" onClick={swipeNo}>No</button>
        <button className="yes" onClick={swipeYes}>Yes</button>
      </div>
    </div>
  );
};

export async function getServerSideProps() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    console.error("Google Places API Key is missing!");
    return { props: { events: [] } };
  }

  const location = "39.2904,-76.6122"; // Baltimore, MD
  const radius = 5000; // 5km search radius
  const type = "tourist_attraction"; // Only one type at a time
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=${radius}&type=${type}&key=${apiKey}`;

  let events = [];
  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "OK") {
      console.error(`Google Places API Error: ${data.status}`, data.error_message || "");
      return { props: { events: [] } };
    }

    if (data.results && data.results.length > 0) {
      events = data.results.map(event => ({
        id: event.place_id,
        name: event.name,
        images: event.photos?.length
          ? [`https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${event.photos[0].photo_reference}&key=${apiKey}`]
          : ["https://via.placeholder.com/400"], // Default image if no photo
        location: event.vicinity
