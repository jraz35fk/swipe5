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

const WEIGHT_THRESHOLD = 3; // Users must drill down 3 layers before a match is possible

const Home = () => {
  const [history, setHistory] = useState([]);
  const [currentLayer, setCurrentLayer] = useState("Select a Category");
  const [currentOptions, setCurrentOptions] = useState(Object.keys(categories));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matched, setMatched] = useState([]);
  const [finalMatch, setFinalMatch] = useState(null);
  const [currentWeight, setCurrentWeight] = useState(0);

  useEffect(() => {
    if (!currentLayer) setCurrentLayer("Select a Category");
  }, []);

  const isFinalOption = (option) => {
    return typeof categories[currentLayer]?.[option] !== "object" && !Array.isArray(categories[currentLayer]?.[option]);
  };

  const handleSwipe = (direction) => {
    if (currentIndex >= currentOptions.length) return;

    const choice = currentOptions[currentIndex];

    if (direction === "right") {
      const nextLayer = categories[currentLayer]?.[choice];

      if (typeof nextLayer === "object") {
        // Drill deeper
        setHistory([...history, { layer: currentLayer, options: currentOptions }]);
        setCurrentLayer(choice);
        setCurrentOptions(Object.keys(nextLayer));
        setCurrentIndex(0);
        setCurrentWeight((prev) => prev + 1);
      } else if (Array.isArray(nextLayer)) {
        // Final layer reached
        setHistory([...history, { layer: currentLayer, options: currentOptions }]);
        setCurrentLayer(choice);
        setCurrentOptions(nextLayer);
        setCurrentIndex(0);
        setCurrentWeight((prev) => prev + 1);
      } else {
        if (currentWeight >= WEIGHT_THRESHOLD && isFinalOption(choice)) {
          handleFinalMatch(choice);
        } else {
          // Keep drilling deeper
          setCurrentWeight((prev) => prev + 1);
        }
      }
    } else {
      // Move to next option at same level
      setCurrentIndex((prev) => (prev + 1) % currentOptions.length);
    }
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
    setCurrentIndex(0);
    setFinalMatch(null);
    setCurrentWeight(0);
  };

  const goBack = () => {
    if (history.length > 0) {
      const prevState = history.pop();
      setCurrentLayer(prevState.layer);
      setCurrentOptions(prevState.options);
      setCurrentIndex(0);
      setCurrentWeight((prev) => (prev > 0 ? prev - 1 : 0)); // Reduce weight on back
      setHistory([...history]);
    }
  };

  return (
    <div className="swipe-container">
      <h2>{currentLayer}</h2>
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
      {matched.length > 0 && (
        <div className="matches">
          <h3>Matched Activities:</h3>
          <ul>
            {matched.map((match, index) => <li key={index}>{match}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Home;
