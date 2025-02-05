import { useState, useEffect } from 'react';
import TinderCard from 'react-tinder-card';

const GOOGLE_PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

// CATEGORY TREE STRUCTURE
const categories = {
  "Culture": {
    "History": ["Maryland Historical Society", "Fort McHenry"],
    "Art": {
      "Art Galleries": ["Walters Art Gallery", "Baltimore Museum of Art"],
      "Street Art": ["Graffiti Alley", "MICA Public Art"]
    },
    "Music": ["Live Jazz", "Baltimore Symphony Orchestra"]
  },
  "Eating & Drinking": {
    "Seafood": {
      "Crab Houses": ["LP Steamers", "Thames Street Oyster House"],
      "Oyster Bars": ["Ryleigh’s Oyster", "The Choptank"]
    },
    "Breweries": ["Heavy Seas Alehouse", "Diamondback Brewing Co."],
    "Coffee Shops": ["Artifact Coffee", "Ceremony Coffee Roasters"]
  },
  "Nightlife": {
    "Bars": {
      "Cocktail Bars": ["The Brewer’s Art", "Sugarvale"],
      "Dive Bars": ["Max’s Taphouse", "The Horse You Came In On"]
    },
    "Live Music": {
      "Concert Venues": ["The Ottobar", "Rams Head Live"]
    }
  },
  "Outdoor Activities": {
    "Parks & Trails": ["Federal Hill Park", "Patterson Park"],
    "Water Activities": ["Kayak the Inner Harbor"]
  }
};

// DYNAMIC DATA FETCHING FUNCTION
const fetchPlaces = async (query) => {
  const location = "39.2904,-76.6122"; // Baltimore, MD
  const radius = 5000; // 5km search radius
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=${radius}&keyword=${query}&key=${GOOGLE_PLACES_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.results) {
      return data.results.map(place => ({
        name: place.name,
        address: place.vicinity || "No Address Available",
        googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`
      }));
    }
  } catch (error) {
    console.error("Error fetching places:", error);
  }
  return [];
};

const Home = () => {
  const [history, setHistory] = useState([]); // Tracks user path
  const [currentLayer, setCurrentLayer] = useState(null);
  const [currentOptions, setCurrentOptions] = useState(Object.keys(categories));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matched, setMatched] = useState([]);

  useEffect(() => {
    if (!currentLayer) setCurrentLayer("Select a Category");
  }, []);

  const handleSwipe = async (direction) => {
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
      } else if (Array.isArray(nextLayer)) {
        // Final layer - list actual places or fetch dynamically
        setHistory([...history, { layer: currentLayer, options: currentOptions }]);
        setCurrentLayer(choice);
        setCurrentOptions(nextLayer);
        setCurrentIndex(0);
      } else {
        // Fetch real locations dynamically if no predefined ones exist
        const places = await fetchPlaces(choice);
        if (places.length > 0) {
          setHistory([...history, { layer: currentLayer, options: currentOptions }]);
          setCurrentLayer(choice);
          setCurrentOptions(places.map(p => p.name));
          setCurrentIndex(0);
        } else {
          saveToMatched(choice);
        }
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

  const saveToMatched = (choice) => {
    const updatedMatched = [...matched, choice];
    setMatched(updatedMatched);
    localStorage.setItem("matched", JSON.stringify(updatedMatched));
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
