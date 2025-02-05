import { useState } from 'react';
import TinderCard from 'react-tinder-card';
import EventCard from '../components/EventCard';

const Home = ({ events }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const eventsList = events || [];

  const handleSwipe = (direction) => {
    if (!eventsList[currentIndex]) return;
    if (direction === 'right') {
      const existing = JSON.parse(localStorage.getItem('likedEvents') || '[]');
      existing.push(eventsList[currentIndex]);
      localStorage.setItem('likedEvents', JSON.stringify(existing));
    }
    setCurrentIndex((prev) => prev + 1);
  };

  const swipeYes = () => handleSwipe('right');
  const swipeNo = () => handleSwipe('left');

  if (!eventsList.length) {
    return <div className="swipe-container"><p>Loading events...</p></div>;
  }
  if (currentIndex >= eventsList.length) {
    return <div className="swipe-container"><p>No more events.</p></div>;
  }

  return (
    <div className="swipe-container">
      <TinderCard
        className="swipe-card"
        onSwipe={(dir) => handleSwipe(dir)}
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
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY; // Use Google Places API key
  const location = "39.2904,-76.6122"; // Latitude & Longitude for Baltimore, MD
  const radius = 5000; // Search radius in meters (5km)
  const type = "tourist_attraction|restaurant|park|museum"; // Get multiple types of places
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=${radius}&type=${type}&key=${apiKey}`;

  let events = [];
  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.results) {
      events = data.results.map(event => ({
        id: event.place_id,
        name: event.name,
        images: event.photos && event.photos.length > 0
          ? [`https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${event.photos[0].photo_reference}&key=${apiKey}`]
          : ["https://via.placeholder.com/400"], // Default image if no photo
        location: event.vicinity || "Location not available",
        rating: event.rating ? `${event.rating} ⭐` : "No rating"
      }));
    }
  } catch (e) {
    console.error("Failed to fetch events", e);
  }

  return { props: { events } };
}


}

export default Home;
