import { useState, useEffect } from 'react';
import EventCard from '../components/EventCard';

const Favorites = () => {
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('likedEvents');
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    }
  }, []);

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Liked Events</h1>
      {favorites.length > 0 ? (
        favorites.map((event, idx) => (
          <EventCard key={idx} event={event} />
        ))
      ) : (
        <p>No liked events yet.</p>
      )}
    </div>
  );
};

export default Favorites;
