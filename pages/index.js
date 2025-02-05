import { useState, useEffect } from 'react';
import TinderCard from 'react-tinder-card';
import EventCard from '../components/EventCard';

const Home = ({ events = [] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!events.length) {
      console.error("No events found. Check API key or query.");
    }
  }, [events]);

  const handleSwipe = (direction) => {
    if (currentIndex >= events.length) return; // Prevents out-of-bounds errors

    if (direction === 'right') {
      try {
        const existing = JSON.parse(localStorage.getItem('likedEvents') || '[]');
        existing.push(events[currentIndex]);
        localStorage.setItem('likedEvents', JSON.stringify(existing));
      } catch (error) {
        console.error("Error saving to localStorage:", error);
      }
    }

    setCurrentIndex((prev) => (prev < events.length - 1 ? prev + 1 : prev));
  };

  const swipeYes = () => handleSwipe('right');
  const swipeNo = () => handleSwipe('left');

  if (!events.length) {
    return <div className="swipe-container"><p>Loading events... (Check API Key)</p></div>;
  }

  if (currentIndex >= events.length) {
    return <div className="swipe-container"><p>No more events available.</p></div>;
  }

  return (
    <div className="swipe-container">
      <TinderCard
        className="swipe-card"
        key={events[currentIndex].id}
        onSwipe={(dir) => handleSwipe(dir)}
        preventSwipe={['up', 'down']}
      >
        <EventCard event={events[currentIndex]} />
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

    if (data.results?.length) {
      events = data.results.map(event => ({
        id: event.place_id,
        name: event.name,
        images: event.photos?.[0]?.photo_reference
          ? [`https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${event.photos[0].photo_reference}&key=${apiKey}`]
          : ["https://via.placeholder.com/400"], // Default image if no photo
        location: event.vicinity || "Location not available",
        rating: event.rating ? `${event.rating} ⭐` : "No rating",
        googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${event.place_id}`
      }));
    }
  } catch (error) {
    console.error("Error fetching events from Google Places API:", error);
  }

  return { props: { events } };
}

export default Home;
