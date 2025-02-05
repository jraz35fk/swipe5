import { useState, useEffect } from 'react';
import TinderCard from 'react-tinder-card';

const categories = {
  "Explore": {
    "Food & Drinks": {
      "Seafood": ["Thames Street Oyster House", "LP Steamers"],
      "Breweries": ["Heavy Seas Alehouse", "Diamondback Brewing Co."]
    },
    "Nightlife": {
      "Bars": ["The Brewer’s Art", "Max’s Taphouse"],
      "Live Music": ["The Ottobar", "Rams Head Live"]
    }
  }
};

const Home = () => {
  const [history, setHistory] = useState([]); // Tracks user path
  const [currentLayer, setCurrentLayer] = useState("Explore");
  const [currentOptions, setCurrentOptions] = useState(Object.keys(categories["Explore"]));
  const [selectedPath, setSelectedPath] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!currentOptions.length) {
      console.error("No categories available. Check your structure.");
    }
  }, [currentOptions]);

  const handleSwipe = (direction) => {
    const choice = currentOptions[currentIndex];

    if (direction === "right") {
      if (typeof categories[currentLayer][choice] === "object") {
        // Move deeper into the structure
        setHistory([...history, { layer: currentLayer, options: currentOptions }]);
        setCurrentLayer(choice);
        setCurrentOptions(Object.keys(categories[currentLayer][choice]));
        setCurrentIndex(0);
      } else {
        // Final choice reached
        setSelectedPath([...selectedPath, choice]);
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
    let matches = JSON.parse(localStorage.getItem("matches")) || [];
    matches.push(choice);
    localStorage.setItem("matches", JSON.stringify(matches));
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
    </div>
  );
};

export default Home;
