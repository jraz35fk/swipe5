import React, { useState } from 'react';
import TinderCard from 'react-tinder-card';

export default function Home() {
  // Hardcoded JSON database of activities (Baltimore-focused), structured in categories -> subcategories -> final activities
  const data = [
    {
      id: 'food', type: 'category', name: 'Food & Drink',
      image: 'https://source.unsplash.com/400x300/?restaurant',
      children: [
        {
          id: 'restaurants', type: 'category', name: 'Restaurants',
          image: 'https://source.unsplash.com/400x300/?dining',
          children: [
            { id: 'rest1', type: 'activity', name: 'Thames Street Oyster House', image: 'https://source.unsplash.com/400x300/?oyster%20restaurant' },
            { id: 'rest2', type: 'activity', name: 'The Food Market', image: 'https://source.unsplash.com/400x300/?restaurant%20dinner' },
            { id: 'ad1', type: 'ad', name: 'Sponsored: Baltimore Dining Guide', image: 'https://source.unsplash.com/400x300/?food%20advertisement' }
          ]
        },
        {
          id: 'bars', type: 'category', name: 'Bars & Pubs',
          image: 'https://source.unsplash.com/400x300/?bar',
          children: [
            { id: 'bar1', type: 'activity', name: 'The Brewer\'s Art', image: 'https://source.unsplash.com/400x300/?craft%20beer' },
            { id: 'bar2', type: 'activity', name: 'Max\'s Taphouse', image: 'https://source.unsplash.com/400x300/?pub' },
            { id: 'ad2', type: 'ad', name: 'Sponsored: Nightlife Deals', image: 'https://source.unsplash.com/400x300/?drink%20advertisement' }
          ]
        }
      ]
    },
    {
      id: 'outdoors', type: 'category', name: 'Outdoor Adventures',
      image: 'https://source.unsplash.com/400x300/?nature',
      children: [
        {
          id: 'parks', type: 'category', name: 'Parks',
          image: 'https://source.unsplash.com/400x300/?park',
          children: [
            { id: 'park1', type: 'activity', name: 'Druid Hill Park', image: 'https://source.unsplash.com/400x300/?park%20baltimore' },
            { id: 'park2', type: 'activity', name: 'Fort McHenry', image: 'https://source.unsplash.com/400x300/?historic%20fort' },
            { id: 'ad3', type: 'ad', name: 'Sponsored: Outdoor Gear Shop', image: 'https://source.unsplash.com/400x300/?camping%20advertisement' }
          ]
        },
        {
          id: 'trails', type: 'category', name: 'Hiking Trails',
          image: 'https://source.unsplash.com/400x300/?hiking',
          children: [
            { id: 'trail1', type: 'activity', name: 'Loch Raven Trails', image: 'https://source.unsplash.com/400x300/?forest%20trail' },
            { id: 'trail2', type: 'activity', name: 'Gunpowder Falls', image: 'https://source.unsplash.com/400x300/?river%20trail' },
            { id: 'ad4', type: 'ad', name: 'Sponsored: Hiking Tours', image: 'https://source.unsplash.com/400x300/?hiking%20advertisement' }
          ]
        }
      ]
    },
    {
      id: 'culture', type: 'category', name: 'Arts & Culture',
      image: 'https://source.unsplash.com/400x300/?museum',
      children: [
        {
          id: 'museums', type: 'category', name: 'Museums',
          image: 'https://source.unsplash.com/400x300/?art%20museum',
          children: [
            { id: 'museum1', type: 'activity', name: 'Baltimore Museum of Art', image: 'https://source.unsplash.com/400x300/?art%20gallery' },
            { id: 'museum2', type: 'activity', name: 'The Walters Art Museum', image: 'https://source.unsplash.com/400x300/?historic%20art' },
            { id: 'ad5', type: 'ad', name: 'Sponsored: Museum Passes', image: 'https://source.unsplash.com/400x300/?museum%20advertisement' }
          ]
        },
        {
          id: 'music', type: 'category', name: 'Live Music',
          image: 'https://source.unsplash.com/400x300/?concert',
          children: [
            { id: 'music1', type: 'activity', name: 'Ottobar', image: 'https://source.unsplash.com/400x300/?concert%20stage' },
            { id: 'music2', type: 'activity', name: 'Merriweather Post Pavilion', image: 'https://source.unsplash.com/400x300/?music%20festival' },
            { id: 'ad6', type: 'ad', name: 'Sponsored: Concert Tickets', image: 'https://source.unsplash.com/400x300/?music%20advertisement' }
          ]
        }
      ]
    },
    {
      id: 'family', type: 'category', name: 'Family Fun',
      image: 'https://source.unsplash.com/400x300/?family%20fun',
      children: [
        { id: 'aquarium', type: 'activity', name: 'National Aquarium', image: 'https://source.unsplash.com/400x300/?aquarium' },
        { id: 'zoo', type: 'activity', name: 'Maryland Zoo', image: 'https://source.unsplash.com/400x300/?zoo' },
        { id: 'science', type: 'activity', name: 'Maryland Science Center', image: 'https://source.unsplash.com/400x300/?science%20museum' },
        { id: 'ad7', type: 'ad', name: 'Sponsored: Family Deals', image: 'https://source.unsplash.com/400x300/?family%20advertisement' }
      ]
    }
  ];

  // State to manage current list of cards (initially top-level categories)
  const [currentList, setCurrentList] = useState(data);
  // State to track the path of selected categories (for reference or future use)
  const [path, setPath] = useState([]);
  // State to hold a final selected activity (once a match is found)
  const [finalSelection, setFinalSelection] = useState(null);
  // Temporary state to track the last swipe action and item (used in onCardLeftScreen to decide what to do)
  const [lastAction, setLastAction] = useState(null);
  const [swipedItem, setSwipedItem] = useState(null);

  // Handle swipe actions: record the action and item but do not immediately remove or navigate
  const handleSwipe = (direction, item) => {
    if (direction === 'right') {
      if (item.type === 'category') {
        // Chose this category to branch into
        setLastAction('branch');
      } else if (item.type === 'activity') {
        // Final activity chosen
        setLastAction('final');
      } else if (item.type === 'ad') {
        // Swiped right on an ad - treat as skip (no branching)
        setLastAction('skip');
      }
    } else if (direction === 'left') {
      // Swiped left (skip) on any card
      setLastAction('skip');
    }
    setSwipedItem(item);
  };

  // Handle when a card has left the screen: now perform state updates (remove or branch)
  const handleCardLeftScreen = (identifier) => {
    if (!swipedItem) return;
    const item = swipedItem;
    if (lastAction === 'branch' && item.type === 'category') {
      // User selected a category: go deeper into its children
      setPath(prev => [...prev, item.name]);
      if (item.children && item.children.length > 0) {
        setCurrentList(item.children);
      } else {
        // If no children (shouldn't happen for a category), just end
        setCurrentList([]);
      }
    } else if (lastAction === 'final' && item.type === 'activity') {
      // User made a final selection
      setPath(prev => [...prev, item.name]);
      setFinalSelection(item);
      setCurrentList([]);
    } else {
      // Skip action (left-swipe or ad): remove the card and continue with next
      setCurrentList(prevList => prevList.slice(1));
    }
    // Reset temp tracking states
    setLastAction(null);
    setSwipedItem(null);
  };

  // Allow restarting the selection process
  const resetSelection = () => {
    setCurrentList(data);
    setPath([]);
    setFinalSelection(null);
    setLastAction(null);
    setSwipedItem(null);
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Baltimore Activity Finder</h1>
      {!finalSelection && currentList.length > 0 && (
        <p>Swipe right to explore, or left to skip</p>
      )}

      <div className="cardContainer">
        {/* Render the top card (first item) if available */}
        {!finalSelection && currentList.length > 0 && (
          <TinderCard
            key={currentList[0].id}
            onSwipe={(dir) => handleSwipe(dir, currentList[0])}
            onCardLeftScreen={() => handleCardLeftScreen(currentList[0].id)}
            preventSwipe={['up','down']}
          >
            <div className="card" style={{ backgroundImage: `url(${currentList[0].image})` }}>
              <h3>{currentList[0].name}</h3>
            </div>
          </TinderCard>
        )}
      </div>

      {/* Display final selection result or a message if no options remain */}
      {finalSelection && (
        <div className="result">
          <h2>Enjoy your activity!</h2>
          <p>You matched with: <strong>{finalSelection.name}</strong></p>
          <button onClick={resetSelection}>Start Over</button>
        </div>
      )}
      {!finalSelection && currentList.length === 0 && (
        <div className="result">
          <h2>No more suggestions</h2>
          <p>Try a different category or restart.</p>
          <button onClick={resetSelection}>Start Over</button>
        </div>
      )}

      {/* Basic styling for cards */}
      <style jsx>{`
        .cardContainer {
          position: relative;
          width: 300px;
          height: 400px;
          margin: 0 auto 40px;
          overflow: hidden; /* Hide cards after they swipe out */
        }
        .card {
          position: absolute;
          width: 100%;
          height: 100%;
          background-color: #333;
          background-size: cover;
          background-position: center;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          padding: 20px;
          box-shadow: 0 0 15px rgba(0,0,0,0.3);
        }
        .card h3 {
          text-shadow: 0 0 5px rgba(0,0,0,0.8);
        }
        .result {
          margin-top: 20px;
        }
        .result h2 {
          margin-bottom: 10px;
        }
        .result button {
          margin-top: 10px;
          padding: 8px 16px;
          font-size: 16px;
        }
      `}</style>
    </div>
  );
}
