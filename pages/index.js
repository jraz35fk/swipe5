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
  const query = "activities+in+Baltimore+MD";
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&radius=5000&key=${apiKey}`;

  let events = [];
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.results) {
      events = data.results.map(event => ({
        id: event.place_id,
        name: event.name,
        images: event.photos ? [`https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${event.photos[0].photo_reference}&key=${apiKey}`] : [],
        location: event.formatted_address,
        rating: event.rating || "N/A"
      }));
    }
  } catch (e) {
    console.error("Failed to fetch events", e);
  }

  return { props: { events } };
}

}

export default Home;
