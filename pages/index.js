import { useState } from 'react';
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
  // We use "Select a Category" as a sort of “placeholder” layer.
  const [currentLayer, setCurrentLayer] = useState("Select a Category");

  // At first, top-level choices are just the keys of `categories`
  const [currentOptions, setCurrentOptions] = useState(Object.keys(categories));
  const [currentIndex, setCurrentIndex] = useState(0);

  const [matched, setMatched] = useState([]);
  const [finalMatch, setFinalMatch] = useState(null);
  const [rewardPoints, setRewardPoints] = useState(0);

  // ---------------------------
  // Utility to check if we've hit a final string (rather than a deeper object or array).
  // Adjusted so that if we’re at the top level, we look directly in `categories[choice]`.
  // Otherwise we look in `categories[currentLayer][choice]`.
  // ---------------------------
  const isFinalOption = (choice) => {
    let next;
    // If we are on top-level placeholder
    if (currentLayer === "Select a Category") {
      next = categories[choice];
    } else {
      next = categories[currentLayer]?.[choice];
    }
    // If it's undefined or it's an array, it's final
    return !next || Array.isArray(next);
  };

  // ---------------------------
  // This handles the card swipes (left or right).
  // ---------------------------
  const handleSwipe = (direction) => {
    if (currentIndex >= currentOptions.length) return;

    const choice = currentOptions[currentIndex];

    if (direction === "right") {
      processContinue(choice);
    } else {
      processDiscard();
    }
  };

  // ---------------------------
  // Go deeper in the categories or finalize
  // ---------------------------
  const processContinue = (choice) => {
    let nextLayer;
    // If we are on top-level
    if (currentLayer === "Select a Category") {
      nextLayer = categories[choice];
    } else {
      nextLayer = categories[currentLayer]?.[choice];
    }

    // If nextLayer is an object, we have deeper subcategories
    if (nextLayer && typeof nextLayer === "object" && !Array.isArray(nextLayer)) {
      // Store our history so we can go back
      setHistory((prev) => [...prev, { layer: currentLayer, options: currentOptions }]);
      setCurrentLayer(choice);
      setCurrentOptions(Object.keys(nextLayer));
      setCurrentIndex(0);

    } else if (Array.isArray(nextLayer)) {
      // We’re at an array of final activities
      setHistory((prev) => [...prev, { layer: currentLayer, options: currentOptions }]);
      setCurrentLayer(choice);
      setCurrentOptions(nextLayer);
      setCurrentIndex(0);

    } else if (isFinalOption(choice)) {
      // It's a final leaf: no deeper subcategory or array
      handleFinalMatch(choice);
    } else {
      // In case there's an unexpected edge
      console.warn("Unexpected case: no valid next layer detected for:", choice);
    }

    // Add "continue" reward
    setTimeout(() => {
      setRewardPoints((prev) => Math.min(prev + REWARD_CONTINUE, MAX_REWARD_POINTS));
    }, 100);
  };

  // ---------------------------
  // Discard card: move to next option
  // ---------------------------
  const processDiscard = () => {
    setCurrentIndex((prev) => (prev + 1) % currentOptions.length);
    // Add "discard" reward
    setTimeout(() => {
      setRewardPoints((prev) => Math.min(prev + REWARD_DISCARD, MAX_REWARD_POINTS));
    }, 100);
  };

  // ---------------------------
  // Final selection: user has arrived at a single string
  // ---------------------------
  const handleFinalMatch = (choice) => {
    setFinalMatch(choice);
    if (!matched.includes(choice)) {
      const updatedMatched = [...matched, choice];
      setMatched(updatedMatched);
      localStorage.setItem("matched", JSON.stringify(updatedMatched));
    }
  };

  // ---------------------------
  // Reset to top-level
  // ---------------------------
  const reshuffleDeck = () => {
    setCurrentLayer("Select a Category");
    setCurrentOptions(Object.keys(categories));
    setCurrentIndex(0);
    setFinalMatch(null);
    setRewardPoints(0);
  };

  // ---------------------------
  // Undo the last "drill-down"
  // ---------------------------
  const goBack = () => {
    if (history.length > 0) {
      const prevState = history[history.length - 1];
      const updatedHistory = history.slice(0, history.length - 1);

      setCurrentLayer(prevState.layer);
      setCurrentOptions(prevState.options);
      setCurrentIndex(0);
      setHistory(updatedHistory);
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
          {/* Show a single card for the current option */}
          <TinderCard
            className="swipe-card"
            key={currentOptions[currentIndex]}
            onSwipe={(dir) => handleSwipe(dir)}
            preventSwipe={['up', 'down']}
          >
            <div
              className="card-content"
              style={{
                width: '300px',
                height: '500px',
                backgroundColor: 'red',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <h3 style={{ color: 'white' }}>
                {currentOptions[currentIndex]}
              </h3>
            </div>
          </TinderCard>

          <div className="swipe-buttons">
            <button className="no" onClick={() => handleSwipe('left')}>
              Discard
            </button>
            <button className="yes" onClick={() => handleSwipe('right')}>
              Continue
            </button>
          </div>

          {/* Optional: "Go Back" button to return one level up */}
          {history.length > 0 && (
            <button onClick={goBack}>Go Back</button>
          )}
        </>
      )}
    </div>
  );
};

export default Home;
