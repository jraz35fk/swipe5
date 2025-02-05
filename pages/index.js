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

const Home = () => {
  const [history, setHistory] = useState([]);
  const [currentLayer, setCurrentLayer] = useState("Select a Category");
  const [currentOptions, setCurrentOptions] = useState(Object.keys(categories));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matched, setMatched] = useState([]);

  useEffect(() => {
    if (!currentLayer) setCurrentLayer("Select a Category");
  }, []);

  const handleSwipe = (direction) => {
    if (currentIndex >= currentOptions.length) return;

    const choice = currentOptions[currentIndex];

    if (direction === "right") {
      const nextLayer = categories[currentLayer]?.[choice];

      if (typeof nextLayer === "object") {
        setHistory([...history, { layer: currentLayer, options: currentOptions }]);
        setCurrentLayer(choice);
        setCurrentOptions(Object.keys(nextLayer));
        setCurrentIndex(0);
      } else if (Array.isArray(nextLayer)) {
        setHistory([...history, { layer: currentLayer, options: currentOptions }]);
        setCurrentLayer(choice);
        setCurrentOptions(nextLayer);
        setCurrentIndex(0);
      } else {
        saveToMatched(choice);
      }
    } else {
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

  const saveToMatched = (choice) => {
    if (!matched.includes(choice)) {
      const updatedMatched = [...matched, choice];
      setMatched(updatedMatched);
      localStorage.setItem("matched", JSON.stringify(updatedMatched));
    }
  };

  return (
    <div className="swipe-container">
      <h2>{currentLayer}</h2>
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
        <button className="no" onClick={() => handleSwipe('left')}>No</button>
        <button className="yes" onClick={() => handleSwipe('right')}>Yes</button>
      </div>
      {history.length > 0 && <button className="back" onClick={goBack}>Go Back</button>}
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
