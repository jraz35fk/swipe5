import { useState, useEffect } from 'react';
import TinderCard from 'react-tinder-card';

// LOCAL ACTIVITY DATABASE
const categories = {
  "Eating & Drinking": {
    "Seafood": {
      "Crab Houses": ["LP Steamers", "Thames Street Oyster House", "Nick’s Fish House", "The Choptank", "Faidley’s Seafood"],
      "Oyster Bars": ["Ryleigh’s Oyster", "The Choptank", "Thames Street Oyster House"]
    },
    "Breweries & Distilleries": ["Heavy Seas Alehouse", "Diamondback Brewing Co.", "Union Craft Brewing", "Sagamore Spirit Distillery"],
    "Speakeasies": ["W.C. Harlan", "The Elk Room", "Dutch Courage", "Sugarvale"]
  },
  "Culture & History": {
    "Historical Landmarks": ["Fort McHenry", "Edgar Allan Poe House", "B&O Railroad Museum"],
    "Art": {
      "Art Galleries": ["Walters Art Gallery", "Baltimore Museum of Art", "American Visionary Art Museum"],
      "Street Art": ["Graffiti Alley", "MICA Public Art"]
    },
    "Music & Performance": ["Baltimore Symphony Orchestra", "Keystone Korner (Live Jazz)", "Ottobar (Indie/Alt)"]
  },
  "Outdoor Activities": {
    "Parks & Green Spaces": ["Federal Hill Park", "Patterson Park", "Cylburn Arboretum"],
    "Water Activities": ["Kayaking at Inner Harbor", "Waterfront Promenade Walk"],
    "Hiking & Nature": ["Patapsco Valley State Park Trails"]
  },
  "Nightlife": {
    "Cocktail Bars": ["The Brewer’s Art", "Sugarvale"],
    "Dive Bars": ["Max’s Taphouse", "The Horse You Came In On Saloon"],
    "Live Music Venues": ["Rams Head Live", "The 8x10", "Soundstage"]
  }
};

const MAX_REWARD_POINTS = 100;
const REWARD_DISCARD = 1;
const REWARD_CONTINUE = 10;

const Home = () => {
  const [history, setHistory] = useState([]);
  const [currentLayer, setCurrentLayer] = useState("Select a Category");
  const [currentOptions, setCurrentOptions] = useState(Object.keys(categories));
  const [childOptions, setChildOptions] = useState([]); // Stores child categories
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matched, setMatched] = useState([]);
  const [finalMatch, setFinalMatch] = useState(null);
  const [rewardPoints, setRewardPoints] = useState(0);

  useEffect(() => {
    if (!categories[currentLayer]) {
      setCurrentLayer("Select a Category");
      setCurrentOptions(Object.keys(categories));
    }
  }, [currentLayer]);

  const isFinalOption = (choice) => {
    return (
      !categories[currentLayer]?.[choice] ||
      (Array.isArray(categories[currentLayer]?.[choice]) && categories[currentLayer]?.[choice].length > 0)
    );
  };

  const handleSwipe = (direction) => {
    if (currentIndex >= currentOptions.length) return;

    const choice = currentOptions[currentIndex];

    if (direction === "right") {
      processContinue(choice);
    } else {
      processDiscard();
    }
  };

  const processContinue = (choice) => {
    const nextLayer = categories[currentLayer]?.[choice];

    if (nextLayer && typeof nextLayer === "object") {
      // Move deeper and show child categories below parent
      setHistory((prev) => [...prev, { layer: currentLayer, options: currentOptions }]);
      setChildOptions(Object.keys(nextLayer));
    } else if (Array.isArray(nextLayer)) {
      // Move to specific activity layer
      setHistory((prev) => [...prev, { layer: currentLayer, options: currentOptions }]);
      setChildOptions(nextLayer);
    } else if (isFinalOption(choice)) {
      handleFinalMatch(choice);
    } else {
      console.warn("Unexpected case: No valid next layer detected.");
    }

    // Force React re-render
    setTimeout(() => {
      setRewardPoints((prev) => Math.min(prev + REWARD_CONTINUE, MAX_REWARD_POINTS));
    }, 100);
  };

  const processDiscard = () => {
    // Move to next option at the same level
    setCurrentIndex((prev) => (prev + 1) % currentOptions.length);

    // Grant reward AFTER card is disposed of
    setTimeout(() => {
      setRewardPoints((prev) => Math.min(prev + REWARD_DISCARD, MAX_REWARD_POINTS));
    }, 100);
  };

  const handleFinalMatch = (choice) => {
    setFinalMatch(choice);
    if (!matched.includes(choice)) {
      const updatedMatched = [...matched, choice];
      setMatched(updatedMatched);
      localStorage.setItem("matched", JSON.stringify(updatedMatched));
    }
  };

  const reshuffleDeck = () => {
    setCurrentLayer("Select a Category");
    setCurrentOptions(Object.keys(categories));
    setChildOptions([]);
    setCurrentIndex(0);
    setFinalMatch(null);
    setRewardPoints(0);
  };

  const goBack = () => {
    if (history.length > 0) {
      const prevState = history.pop();
      setCurrentLayer(prevState.layer);
      setCurrentOptions(prevState.options);
      setChildOptions([]);
      setCurrentIndex(0);
      setHistory([...history]);
    }
  };

  return (
    <div className="swipe-container">
      <h2>{currentLayer}</h2>
      <p>Reward Points: {rewardPoints}</p>
      {finalMatch ? (
        <div className="match-confirmation">
          <h3>Match Found: {finalMatch}</h3>
          <button onClick={reshuffleDeck}>Reshuffle Deck</button>
        </div>
      ) : (
        <>
          <TinderCard
            className="swipe-card"
            key={currentOptions[currentIndex]}
            onSwipe={(dir) => handleSwipe(dir)}
            preventSwipe={['up', 'down']}
          >
            <div className="card-content" style={{ width: '300px', height: '500px', backgroundColor: 'blue', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <h3 style={{ color: 'white' }}>{currentOptions[currentIndex]}</h3>
            </div>
          </TinderCard>
          <div className="swipe-buttons">
            <button className="no" onClick={() => handleSwipe('left')}>Discard</button>
            <button className="yes" onClick={() => handleSwipe('right')}>Continue</button>
          </div>
        </>
      )}
      {history.length > 0 && !finalMatch && <button className="back" onClick={goBack}>Go Back</button>}
      {childOptions.length > 0 && (
        <div className="child-cards">
          <h3>Subcategories:</h3>
          {childOptions.map((option, index) => (
            <div key={index} className="child-card" style={{ width: '250px', height: '400px', backgroundColor: 'lightblue', margin: '10px', padding: '10px', textAlign: 'center' }}>
              <h4>{option}</h4>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
