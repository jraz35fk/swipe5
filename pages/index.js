import { useState, useEffect } from 'react';
import TinderCard from 'react-tinder-card';

/**
 * FULL BALTIMORE ACTIVITIES DATA (from your provided list).
 * We'll store it in `categories` to use in the swipe logic.
 */
const categories = {
  "Eating & Drinking": {
    "Hidden Gems & Highly-Rated Restaurants": [
      "Puerto 511",
      "Magdalena (Ivy Hotel)",
      "Foraged (Station North)",
      "Peter’s Inn (Fells Point)",
      "Gertrude’s Chesapeake Kitchen (BMA)",
      "Alma Cocina Latina",
      "Clavel Mezcaleria",
      "Le Comptoir du Vin",
      "Faidley’s Seafood (Lexington Market)",
      "Ekiben (Asian Fusion)",
      "The Tavern at Woodberry (Woodberry Kitchen)",
      "Duck Duck Goose (Fells Point)",
      "The Helmand (Mt. Vernon)",
      "Hersh’s (Riverside)",
      "Little Donna’s (Upper Fells)",
      "Dock Street Bar & Grill (Canton)",
      "NiHao (Canton)",
      "Samos Restaurant (Greektown)",
      "Ananda (Fulton)",
      "Azumi (Harbor East)"
    ],
    "Italian & Fine Dining": [
      "Charleston (Harbor East)",
      "Cinghiale (Harbor East)",
      "La Scala (Little Italy)",
      "Matthew’s Pizza",
      "Isabella’s Brick Oven",
      "Vacarro’s (Little Italy)",
      "Magdalena (Ivy Hotel) – (also fine dining)",
      "Tavern at Woodberry (also upscale, farm-to-table)"
    ],
    "Seafood & Oyster Bars": [
      "LP Steamers",
      "Thames Street Oyster House",
      "Nick’s Fish House",
      "Ryleigh’s Oyster",
      "The Choptank"
    ],
    "International & Fusion": [
      "Alma Cocina Latina",
      "Ekiben (Asian Fusion)",
      "Samos Restaurant (Greek)",
      "The Helmand (Afghan)",
      "Little Italy Restaurants (general)",
      "La Cuchara (Basque-inspired)"
    ]
  },

  "Nightlife & Entertainment": {
    "Unique Bars & Speakeasies": [
      "The Elk Room (Speakeasy)",
      "WC Harlan (Hidden Bar, Remington)",
      "Martick’s (Historic Speakeasy)",
      "Illusions Magic Bar & Theater",
      "The Owl Bar (Historic, Mt. Vernon)"
    ],
    "Dive Bars & Karaoke": [
      "Walt’s Inn (Karaoke, Canton)",
      "Max’s Taphouse (Fells Point)",
      "Cat’s Eye Pub (Fells Point)"
    ],
    "Live Music Venues": [
      "Ottobar",
      "The Crown (Station North)",
      "8x10 (Federal Hill)",
      "Baltimore Soundstage",
      "Rams Head Live!",
      "Creative Alliance (Highlandtown)"
    ],
    "Large Theaters & Concert Halls": [
      "CFG Bank Arena (Downtown)",
      "Hippodrome Theatre (Historic)",
      "The Lyric (Performing Arts)",
      "Bengies Drive-In Theatre (Middle River)"
    ]
  },

  "Outdoors & Nature": {
    "Parks & Gardens": [
      "Druid Hill Park & Reservoir Loop",
      "Federal Hill Park",
      "Patterson Park & Pagoda",
      "Gwynns Falls/Leakin Park",
      "Cylburn Arboretum",
      "Sherwood Gardens (Guilford)",
      "Howard Peters Rawlings Conservatory (Druid Hill)",
      "Lake Roland Park"
    ],
    "Water Activities": [
      "Inner Harbor Paddle Boats",
      "Urban Pirates Cruise",
      "Dundee Creek Marina (Kayaking)",
      "Marshy Point Nature Center"
    ],
    "Nearby Nature & Trails": [
      "Loch Raven Reservoir",
      "Gunpowder Falls State Park",
      "Rails-to-Trails at Jones Falls"
    ],
    "Sports & Scenic Venues": [
      "Oriole Park at Camden Yards",
      "M&T Bank Stadium"
    ]
  },

  "Historic & Cultural Landmarks": {
    "Iconic Historic Sites": [
      "Fort McHenry National Monument",
      "USS Constellation (Inner Harbor)",
      "Washington Monument (Mt. Vernon)",
      "Basilica of the Assumption (America’s First Cathedral)",
      "Fell’s Point Historic Main Street",
      "Hampton National Historic Site (Towson)",
      "Carroll Mansion (Jonestown)",
      "Phoenix Shot Tower",
      "Star-Spangled Banner Flag House",
      "Evergreen Museum & Library (Gilded Age)"
    ],
    "Museums & Art": [
      "The Walters Art Museum",
      "Baltimore Museum of Art",
      "George Peabody Library",
      "American Visionary Art Museum",
      "Reginald F. Lewis Museum",
      "B&O Railroad Museum",
      "National Great Blacks In Wax Museum",
      "Jewish Museum of Maryland",
      "Baltimore Museum of Industry (Locust Point)",
      "Port Discovery Children’s Museum"
    ],
    "Edgar Allan Poe Heritage": [
      "Edgar Allan Poe’s Grave & Memorial (Westminster Hall)",
      "Edgar Allan Poe House & Museum (Poppleton)"
    ]
  },

  "Shopping & Markets": {
    "Food Markets": [
      "Lexington Market",
      "Broadway Market",
      "Cross Street Market",
      "Mount Vernon Marketplace",
      "Baltimore Farmers’ Market & Bazaar",
      "Belvedere Square Market"
    ],
    "Shopping Districts": [
      "Hampden ‘The Avenue’ (36th Street)",
      "Fells Point Antique Shops & Galleries",
      "Harbor East Shopping District",
      "Federal Hill Shops (Cross Street Market area)",
      "Village of Cross Keys",
      "White Marsh Mall",
      "Antique Row (Howard Street)"
    ],
    "Unique Boutiques & Stores": [
      "Ma Petite Shoe (Hampden)",
      "Atomic Books (Hampden)",
      "The Book Thing (Free Book ‘Store’)",
      "Corradetti Glassblowing Studio (Clipper Mill)",
      "Baltimore Clayworks (Mt. Washington)",
      "Sound Garden (Fells Point)",
      "Brightside Boutique (Hampden/Fed Hill)",
      "Double Dutch Boutique (Hampden)",
      "Bazaar (Oddities & Curiosities, Hampden)",
      "Loring Cornish Gallery (Fells Point)"
    ]
  },

  "Events & Festivals": {
    "Major Annual Events": [
      "Preakness Stakes (Horse Race & InFieldFest)",
      "AFRAM Festival",
      "Artscape (Free Summer Arts Fest)",
      "Baltimore Pride",
      "Baltimore Book Festival",
      "Light City Festival",
      "Maryland Film Festival",
      "Baltimore Running Festival"
    ],
    "Neighborhood & Seasonal": [
      "Fells Point Fun Festival",
      "HonFest",
      "Pigtown Festival (‘Squeakness’)",
      "Kinetic Sculpture Race",
      "Opening Day at Camden Yards (Orioles)",
      "Baltimore Farmers’ Market & Bazaar (Apr–Dec)",
      "Waterfront Wellness Series (Summer)"
    ],
    "Holiday & Winter": [
      "Miracle on 34th Street (Hampden Lights)",
      "German Christmas Village (Inner Harbor)",
      "Lighting of the Washington Monument",
      "St. Patrick’s Day Parade (Downtown)",
      "Great Halloween Lantern Parade",
      "Flower Mart (Mt. Vernon)"
    ]
  },

  "Unusual & Quirky Experiences": {
    "Odd Attractions": [
      "Papermoon Diner (Eccentric Decor)",
      "Elijah Bond’s Ouija Board Grave (Green Mount Cemetery)",
      "Ministry of Brewing (Church-Turned-Brewery)",
      "Nutshell Studies of Unexplained Death (mini dioramas)",
      "Graffiti Alley (Station North)",
      "Bromo Seltzer Arts Tower (Clock Tower Museum)",
      "Federal Reserve Bank Money Museum",
      "Escape Room at Poe’s Death Site (fictional scenario)",
      "Dinner at Medieval Times (Arundel Mills)"
    ],
    "Ghost Tours & Spooky": [
      "Nighttime Ghost Tour of Fells Point",
      "Twilight Tattoo Ceremony (Fort McHenry, summer re-enactment)"
    ],
    "Unique Bars & Activities": [
      "Urban Axes (Axe-Throwing Bar)",
      "Korean BBQ Karaoke Rooms (Station North)",
      "Hampden’s HONfest Photo Ops",
      "Scavenger Hunt in Inner Harbor",
      "Everyman Theatre (Local Theater)",
      "The Senator Theatre (Art Deco Cinema)"
    ]
  }
};

// ----------------------
// REWARD CONSTANTS
// ----------------------
const MAX_REWARD_POINTS = 100;
const REWARD_DISCARD = 1;
const REWARD_CONTINUE = 10;

// Safe helper to get nested object/array by path
function getNodeAtPath(data, path) {
  let current = data;
  for (const segment of path) {
    if (current && typeof current === "object" && segment in current) {
      current = current[segment];
    } else {
      return undefined;
    }
  }
  return current;
}

export default function Home() {
  // PATH + INDEX
  const [currentPath, setCurrentPath] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // FINAL MATCH & MATCHES
  const [finalMatch, setFinalMatch] = useState(null);
  const [matched, setMatched] = useState([]);
  const [showMatches, setShowMatches] = useState(false);

  // REWARDS
  const [rewardPoints, setRewardPoints] = useState(0);

  // HISTORY for "goBack"
  const [history, setHistory] = useState([]);

  // LOADING SPLASH
  const [isShuffling, setIsShuffling] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIsShuffling(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // NO MORE CARDS message
  const [noMoreMessage, setNoMoreMessage] = useState(false);

  // WEIGHTS (for preference learning)
  const [weights, setWeights] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("categoryWeights");
      return stored ? JSON.parse(stored) : {};
    }
    return {};
  });
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("categoryWeights", JSON.stringify(weights));
    }
  }, [weights]);

  // GET CURRENT NODE
  const node = getNodeAtPath(categories, currentPath);
  let thisLayerOptions = [];

  if (currentPath.length === 0 && !node) {
    // top-level
    thisLayerOptions = Object.keys(categories);
  } else if (node && typeof node === "object" && !Array.isArray(node)) {
    // sub-layers
    thisLayerOptions = Object.keys(node);
  } else if (Array.isArray(node)) {
    // final items
    thisLayerOptions = node;
  }

  // SORT BY WEIGHT
  const sortByWeight = (arr) => {
    const copy = [...arr];
    copy.sort((a, b) => ( (weights[b] || 0) - (weights[a] || 0) ));
    return copy;
  };
  const sortedOptions = sortByWeight(thisLayerOptions);

  const hasOptions =
    sortedOptions.length > 0 && currentIndex < sortedOptions.length;

  // UTILS: increment/decrement
  const incrementWeight = (item) => {
    setWeights((prev) => ({
      ...prev,
      [item]: (prev[item] || 0) + 1
    }));
  };
  const decrementWeight = (item) => {
    setWeights((prev) => ({
      ...prev,
      [item]: (prev[item] || 0) - 1
    }));
  };

  // GO BACK
  const goBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      const updated = history.slice(0, -1);
      setCurrentPath(prev.path);
      setCurrentIndex(prev.index);
      setHistory(updated);
      setFinalMatch(null);
    }
  };

  // RESHUFFLE
  const reshuffleDeck = () => {
    setCurrentPath([]);
    setCurrentIndex(0);
    setFinalMatch(null);
    setRewardPoints(0);
    setHistory([]);
  };

  // MATCH
  const handleFinalMatch = (choice) => {
    setFinalMatch(choice);
    if (!matched.includes(choice)) {
      setMatched((prev) => [...prev, choice]);
    }
  };

  // DETERMINE IF IT'S A FINAL OPTION
  function isFinalOption(path, choice) {
    const nextNode = getNodeAtPath(categories, [...path, choice]);
    if (!nextNode) return true; // no sub-layer
    if (typeof nextNode === "object" && !Array.isArray(nextNode)) return false; // sub-layers exist
    if (Array.isArray(nextNode)) return false; // final array next
    return true;
  }

  // SWIPE
  const handleSwipe = (direction) => {
    if (!hasOptions) return;
    const choice = sortedOptions[currentIndex];
    if (direction === "right") {
      processContinue(choice);
    } else {
      processDiscard(choice);
    }
  };

  // CONTINUE => +10
  const processContinue = (choice) => {
    incrementWeight(choice);

    if (isFinalOption(currentPath, choice)) {
      // final
      handleFinalMatch(choice);
    } else {
      // deeper
      setHistory((prev) => [...prev, { path: [...currentPath], index: currentIndex }]);
      setCurrentPath((prev) => [...prev, choice]);
      setCurrentIndex(0);
    }
    setRewardPoints((prev) => Math.min(prev + REWARD_CONTINUE, MAX_REWARD_POINTS));
  };

  // DISCARD => +1, next card if any, else back/reshuffle
  const processDiscard = (choice) => {
    decrementWeight(choice);
    const nextIndex = currentIndex + 1;
    setRewardPoints((prev) => Math.min(prev + REWARD_DISCARD, MAX_REWARD_POINTS));

    if (nextIndex < sortedOptions.length) {
      setCurrentIndex(nextIndex);
    } else {
      // no more cards at this layer
      setNoMoreMessage(true);
      setTimeout(() => {
        setNoMoreMessage(false);
        if (history.length > 0) {
          goBack();
        } else {
          reshuffleDeck();
        }
      }, 2000);
    }
  };

  // UI
  const currentLayerName =
    currentPath.length === 0
      ? "Shuffling..."
      : currentPath[currentPath.length - 1];

  // STYLES
  const appContainerStyle = {
    width: "100%",
    maxWidth: "420px",
    margin: "0 auto",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#fdfdfd",
    fontFamily: "sans-serif",
    position: "relative"
  };

  // LOADING
  if (isShuffling) {
    return (
      <div
        style={{
          ...appContainerStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <h2>Shuffling Baltimore...</h2>
      </div>
    );
  }

  // Overlays
  const finalMatchOverlayStyle = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.8)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    zIndex: 999
  };

  const noMoreOverlayStyle = {
    position: "absolute",
    top: "40%",
    left: 0,
    width: "100%",
    textAlign: "center",
    color: "#fff",
    fontSize: "1.2rem",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: "1rem",
    zIndex: 998
  };

  const matchesModalStyle = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(255,255,255,0.9)",
    zIndex: 997,
    display: "flex",
    flexDirection: "column",
    padding: "1rem"
  };

  // Header
  const headerStyle = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "0.5rem",
    borderBottom: "1px solid #ccc",
    position: "relative"
  };

  const phoneScreenTitleStyle = {
    margin: 0,
    fontWeight: "bold"
  };

  const backButtonStyle = {
    position: "absolute",
    left: "1rem",
    border: "none",
    background: "none",
    fontSize: "1rem",
    color: "#333",
    cursor: "pointer"
  };

  const matchesButtonStyle = {
    position: "absolute",
    right: "1rem",
    border: "none",
    background: "none",
    fontSize: "1rem",
    color: "#333",
    cursor: "pointer"
  };

  // Main content
  const mainContentStyle = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center"
  };

  // Card container
  const cardContainerStyle = {
    width: "300px",
    height: "420px",
    position: "relative"
  };

  const cardStyle = {
    width: "100%",
    height: "100%",
    borderRadius: "12px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end"
  };

  const cardOverlayStyle = {
    background: "linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 100%)",
    color: "#fff",
    padding: "1rem"
  };

  // Bottom bar
  const bottomBarStyle = {
    borderTop: "1px solid #ccc",
    padding: "0.5rem",
    display: "flex",
    justifyContent: "center",
    gap: "2rem"
  };

  const circleButtonStyle = (bgColor) => ({
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    background: bgColor,
    color: "#fff",
    border: "none",
    fontSize: "1.2rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
  });

  // Simple fallback image generator
  const getImageUrl = (name) => {
    // Could use a real map or an API
    // Fallback to Unsplash
    return "https://source.unsplash.com/collection/190727/600x800";
  };

  return (
    <div style={appContainerStyle}>
      {/* FINAL MATCH OVERLAY */}
      {finalMatch && (
        <div style={finalMatchOverlayStyle}>
          <h1>Match Found!</h1>
          <h2>{finalMatch}</h2>
          <button
            onClick={() => setFinalMatch(null)}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              background: "#2ECC71",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Keep Exploring
          </button>
        </div>
      )}

      {/* NO MORE CARDS MESSAGE */}
      {noMoreMessage && (
        <div style={noMoreOverlayStyle}>
          No more options at this layer! Going back one level…
        </div>
      )}

      {/* MATCHES OVERLAY */}
      {showMatches && (
        <div style={matchesModalStyle}>
          <h2>My Matches</h2>
          {matched.length === 0 ? (
            <p>No matches yet.</p>
          ) : (
            matched.map((m, i) => (
              <div
                key={i}
                style={{
                  marginBottom: "0.5rem",
                  borderBottom: "1px solid #ccc",
                  paddingBottom: "0.5rem"
                }}
              >
                {m}
              </div>
            ))
          )}
          <button
            style={{
              marginTop: "auto",
              padding: "0.5rem 1rem",
              background: "#666",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
            onClick={() => setShowMatches(false)}
          >
            Close
          </button>
        </div>
      )}

      {/* HEADER */}
      <div style={headerStyle}>
        <button onClick={goBack} style={backButtonStyle}>
          ←
        </button>
        <h3 style={phoneScreenTitleStyle}>{currentLayerName}</h3>
        <button
          onClick={() => setShowMatches(true)}
          style={matchesButtonStyle}
        >
          ♡
        </button>
      </div>

      {/* REWARD POINTS */}
      <div style={{ textAlign: "center", padding: "0.5rem" }}>
        <strong>Points:</strong> {rewardPoints}
      </div>

      {/* MAIN CARD */}
      <div style={mainContentStyle}>
        <div style={cardContainerStyle}>
          {hasOptions ? (
            <TinderCard
              key={sortedOptions[currentIndex]}
              onSwipe={(dir) => handleSwipe(dir)}
              preventSwipe={["up", "down"]}
            >
              <div
                style={{
                  ...cardStyle,
                  backgroundImage: `url(${getImageUrl(
                    sortedOptions[currentIndex]
                  )})`
                }}
              >
                <div style={cardOverlayStyle}>
                  <h2 style={{ margin: 0 }}>{sortedOptions[currentIndex]}</h2>
                </div>
              </div>
            </TinderCard>
          ) : (
            <p>No more options at this level.</p>
          )}
        </div>
      </div>

      {/* BOTTOM BAR: Discard & Continue */}
      <div style={bottomBarStyle}>
        {hasOptions ? (
          <>
            <button
              style={circleButtonStyle("#F75D59")}
              onClick={() => handleSwipe("left")}
            >
              ✕
            </button>
            <button
              style={circleButtonStyle("#2ECC71")}
              onClick={() => handleSwipe("right")}
            >
              ♥
            </button>
          </>
        ) : (
          <p style={{ margin: 0 }}>No more cards here.</p>
        )}
      </div>

      {/* RESHUFFLE AT BOTTOM */}
      <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
        <button
          onClick={reshuffleDeck}
          style={{
            padding: "0.4rem 0.8rem",
            border: "1px solid #ccc",
            background: "#fff",
            cursor: "pointer",
            borderRadius: "4px"
          }}
        >
          Reshuffle
        </button>
      </div>
    </div>
  );
}
