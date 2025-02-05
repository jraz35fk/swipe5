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
  const apiKey = process.env.TICKETMASTER_API_KEY;
  const res = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?postalCode=21230&apikey=${apiKey}`);
  let events = [];
  try {
    const data = await res.json();
    events = data._embedded ? data._embedded.events : [];
  } catch (e) {
    console.error('Failed to fetch events', e);
  }
  return { props: { events } };
}

export default Home;
