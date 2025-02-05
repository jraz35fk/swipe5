import { useState, useEffect } from 'react';
import TinderCard from 'react-tinder-card';

// EXPANDED CATEGORIES STRUCTURE
const categories = {
  "Explore": {
    "Food & Drinks": {
      "Seafood": {
        "Crab Houses": ["LP Steamers", "Thames Street Oyster House"],
        "Oyster Bars": ["Ryleigh’s Oyster", "The Choptank"]
      },
      "Breweries": {
        "Local Breweries": ["Heavy Seas Alehouse", "Diamondback Brewing Co."]
      }
    },
    "Nightlife": {
      "Bars": {
        "Cocktail Bars": ["The Brewer’s Art", "Sugarvale"],
        "Dive Bars": ["Max’s Taphouse", "The Horse You Came In On"]
      },
      "Live Music": {
        "Concert Venues": ["The Ottobar", "Rams Head Live"]
      }
    }
  }
};

const Home = () => {
  const [history, setHistory] = useState([]); // Tracks user path
  const [currentLayer, setCurrentLayer] = useState("Explore");
  const [currentOptions, setCurrentOptions] = useState(Object.keys(categories["Explore"]));
  const [selectedPath, setSelectedPath] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    if (!currentOptions.length) {
      console.error("No categories available. Check your structure.");
    }
  }, [currentOptions]);

  const handleSwipe = (direction) => {
    if (currentIndex >= currentOptions.length) return;

    const choice = currentOptions[currentIndex];

    if (direction === "right") {
      const nextLayer = categories[currentLayer]?.[choice];

      if (typeof nextLayer === "object") {
        // Move deeper into the structure
        setHistory([...history, { layer: currentLayer, options: currentOptions }]);
        setCurrentLayer(choice);
        setCurrentOptions(Object.keys(nextLayer));
        setCurrentIndex(0);
      } else {
        // Final choice reached, add to matches
        saveToMatches(choice);
      }
    } else {
      // Move to next option in the same category
      setCurrentIndex((prev) => (prev + 1) % currentOptions.length);
    }
  };

  const goBack = () => {
    if (history.length > 0) {
      const prevState = history.pop();
      setCurrentLayer(prevState.layer);
      setCurrentOptions(prevState.options);
      setCurrentIndex(0);
      setHistory([...history]);
    }
  };

  const saveToMatches = (choice) => {
    const updatedMatches = [...matches, choice];
    setMatches(updatedMatches);
    localStorage.setItem("matches", JSON.stringify(updatedMatches));
  };

  if (!currentOptions.length) {
    return <div className="swipe-container"><p>Loading categories...</p></div>;
  }

  return (
    <div className="swipe-container">
      <h2>{currentLayer}</h2>
      <TinderCard
        className="swipe-card"
        key={currentOptions[currentIndex]}
        onSwipe={(dir) => handleSwipe(dir)}
        preventSwipe={['up', 'down']}
      >
        <div className="card-content">
          <h3>{currentOptions[currentIndex]}</h3>
        </div>
      </TinderCard>
      <div className="swipe-buttons">
        <button className="no" onClick={() => handleSwipe('left')}>No</button>
        <button className="yes" onClick={() => handleSwipe('right')}>Yes</button>
      </div>
      {history.length > 0 && <button className="back" onClick={goBack}>Go Back</button>}
      {matches.length > 0 && (
        <div className="matches">
          <h3>Matched Activities:</h3>
          <ul>
            {matches.map((match, index) => <li key={index}>{match}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Home;
