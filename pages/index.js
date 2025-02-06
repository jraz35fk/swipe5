import { useState, useEffect } from 'react';
import TinderCard from 'react-tinder-card';

/** 
 * 1) NEW, BROADER DATA STRUCTURE:
 *    7 major top-level categories => multiple sub-layers => final arrays.
 *    This ensures the first layer has multiple branches, 
 *    matching your "branching from the start" goal.
 */
const rawActivities = {
  "Food & Drink": {
    "Seafood & Oyster Bars": [
      "LP Steamers",
      "Thames Street Oyster House",
      "Nick’s Fish House",
      "Ryleigh’s Oyster",
      "The Choptank"
    ],
    "Italian & Fine Dining": [
      "Charleston (Harbor East)",
      "Cinghiale (Harbor East)",
      "La Scala (Little Italy)",
      "Matthew’s Pizza",
      "Isabella’s Brick Oven",
      "Vacarro’s (Little Italy)",
      "Tavern at Woodberry (farm-to-table)"
    ],
    "Hidden Gems & Highly-Rated": [
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
      "Hersh’s (Riverside)",
      "NiHao (Canton)",
      "Samos Restaurant (Greektown)",
      "Azumi (Harbor East)"
    ],
    "International & Fusion": [
      "Ekiben (Asian Fusion)",
      "Samos Restaurant (Greek)",
      "The Helmand (Afghan)",
      "La Cuchara (Basque-inspired)",
      "Little Italy Restaurants (general)",
      "Ananda (Fulton)",
      "Duck Duck Goose (Fells Point)"
    ]
  },

  "Nightlife & Music": {
    "Bars": {
      "Speakeasies & Unique Bars": [
        "The Elk Room (Speakeasy)",
        "WC Harlan (Hidden Bar)",
        "Martick’s (Historic Speakeasy)",
        "Illusions Magic Bar & Theater",
        "The Owl Bar (Mt. Vernon)"
      ],
      "Dive & Karaoke": [
        "Walt’s Inn (Karaoke)",
        "Max’s Taphouse (Fells Point)",
        "Cat’s Eye Pub (Fells Point)"
      ]
    },
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

  "Events & Festivals": {
    "Major Annual": [
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

  "Outdoors & Recreation": {
    "Parks & Gardens": [
      "Druid Hill Park & Reservoir Loop",
      "Federal Hill Park",
      "Patterson Park & Pagoda",
      "Gwynns Falls/Leakin Park",
      "Cylburn Arboretum",
      "Sherwood Gardens (Guilford)",
      "Howard Peters Rawlings Conservatory",
      "Lake Roland Park"
    ],
    "Water Activities": [
      "Inner Harbor Paddle Boats",
      "Urban Pirates Cruise",
      "Dundee Creek Marina (Kayaking)",
      "Marshy Point Nature Center"
    ],
    "Nearby Trails": [
      "Loch Raven Reservoir",
      "Gunpowder Falls State Park",
      "Rails-to-Trails at Jones Falls"
    ],
    "Sports & Scenic Venues": [
      "Oriole Park at Camden Yards",
      "M&T Bank Stadium"
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
      "Hampden ‘The Avenue’",
      "Fells Point Antique Shops & Galleries",
      "Harbor East Shopping District",
      "Federal Hill Shops",
      "Village of Cross Keys",
      "White Marsh Mall",
      "Antique Row (Howard Street)"
    ],
    "Unique Boutiques": [
      "Ma Petite Shoe (Hampden)",
      "Atomic Books (Hampden)",
      "The Book Thing (Free Books)",
      "Corradetti Glass Studio (Clipper Mill)",
      "Baltimore Clayworks (Mt. Washington)",
      "Sound Garden (Fells Point)",
      "Brightside Boutique",
      "Double Dutch Boutique",
      "Bazaar (Hampden)",
      "Loring Cornish Gallery"
    ]
  },

  "Historic & Culture": {
    "Iconic Sites": [
      "Fort McHenry National Monument",
      "USS Constellation (Inner Harbor)",
      "Washington Monument (Mt. Vernon)",
      "Basilica of the Assumption",
      "Fell’s Point Historic Main Street",
      "Hampton National Historic Site (Towson)",
      "Carroll Mansion",
      "Phoenix Shot Tower",
      "Star-Spangled Banner Flag House",
      "Evergreen Museum & Library"
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
      "Baltimore Museum of Industry",
      "Port Discovery Children’s Museum"
    ],
    "Poe Heritage": [
      "Edgar Allan Poe’s Grave (Westminster Hall)",
      "Edgar Allan Poe House & Museum"
    ]
  },

  "Unusual & Quirky": {
    "Odd Attractions": [
      "Papermoon Diner",
      "Elijah Bond’s Ouija Board Grave",
      "Ministry of Brewing (Church)",
      "Nutshell Studies of Unexplained Death",
      "Graffiti Alley",
      "Bromo Seltzer Arts Tower",
      "Federal Reserve Bank Money Museum",
      "Escape Room at Poe’s Death Site",
      "Dinner at Medieval Times"
    ],
    "Ghost Tours": [
      "Nighttime Ghost Tour of Fells Point",
      "Twilight Tattoo Ceremony (Fort McHenry)"
    ],
    "Unique Activities": [
      "Urban Axes (Axe-Throwing)",
      "Korean BBQ Karaoke (Station North)",
      "Hampden’s HONfest Photo Ops",
      "Scavenger Hunt (Inner Harbor)",
      "Everyman Theatre",
      "The Senator Theatre (Art Deco)"
    ]
  }
};

// 2) Flatten single-child sublayers 
function flattenSingleChildLayers(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;

  let keys = Object.keys(obj);
  while (keys.length === 1) {
    const onlyKey = keys[0];
    const child = obj[onlyKey];
    if (child && typeof child === "object" && !Array.isArray(child)) {
      obj = { ...child };
      keys = Object.keys(obj);
    } else break;
  }
  for (const k of Object.keys(obj)) {
    obj[k] = flattenSingleChildLayers(obj[k]);
  }
  return obj;
}

const categories = flattenSingleChildLayers(rawActivities);

// USER POINTS
const MAX_REWARD_POINTS = 100;
const REWARD_DISCARD = 1;
const REWARD_CONTINUE = 10;

// CODE PREFERENCES
const PREFERENCE_INC = 5;
const PREFERENCE_DEC = 1;

// Color coding
const topLevelColors = {
  "Food & Drink": "#E74C3C",          // red
  "Nightlife & Music": "#8E44AD",     // purple
  "Events & Festivals": "#D35400",    // dark orange
  "Outdoors & Recreation": "#27AE60", // green
  "Shopping & Markets": "#F39C12",    // orange
  "Historic & Culture": "#2980B9",    // blue
  "Unusual & Quirky": "#16A085"       // teal
};

function getColorForPath(path) {
  if (path.length === 0) return "#BDC3C7"; // fallback
  const topCategory = path[0];
  const base = topLevelColors[topCategory] || "#7f8c8d";
  const depth = path.length - 1;
  return darkenColor(base, depth * 0.1);
}

// Darken color by amount (0..1)
function darkenColor(hex, amount) {
  const h = hex.replace("#", "");
  let r = parseInt(h.substring(0, 2), 16);
  let g = parseInt(h.substring(2, 4), 16);
  let b = parseInt(h.substring(4, 6), 16);

  r = Math.floor(r * (1 - amount));
  g = Math.floor(g * (1 - amount));
  b = Math.floor(b * (1 - amount));

  r = Math.max(Math.min(r, 255), 0);
  g = Math.max(Math.min(g, 255), 0);
  b = Math.max(Math.min(b, 255), 0);

  const rr = ("0" + r.toString(16)).slice(-2);
  const gg = ("0" + g.toString(16)).slice(-2);
  const bb = ("0" + b.toString(16)).slice(-2);
  return `#${rr}${gg}${bb}`;
}

// get node by path
function getNodeAtPath(obj, path) {
  let current = obj;
  for (const seg of path) {
    if (current && typeof current === "object" && seg in current) {
      current = current[seg];
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

  // FINAL MATCH
  const [finalMatch, setFinalMatch] = useState(null);
  const [matched, setMatched] = useState([]);
  const [showMatches, setShowMatches] = useState(false);

  // USER SCORE
  const [rewardPoints, setRewardPoints] = useState(0);

  // HISTORY
  const [history, setHistory] = useState([]);

  // LOADING SCREEN
  const [isShuffling, setIsShuffling] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setIsShuffling(false), 2000);
    return () => clearTimeout(t);
  }, []);

  // "No more" message
  const [noMoreMessage, setNoMoreMessage] = useState(false);

  // CODE PREFERENCES (weights)
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

  // Current node 
  const node = getNodeAtPath(categories, currentPath);
  let thisLayerOptions = [];

  if (!node && currentPath.length === 0) {
    // top-level
    thisLayerOptions = Object.keys(categories);
  } else if (node && typeof node === "object" && !Array.isArray(node)) {
    // sub-layers
    thisLayerOptions = Object.keys(node);
  } else if (Array.isArray(node)) {
    // final items
    thisLayerOptions = node;
  }

  // Sort by preference
  const sortByPreference = (arr) => {
    const copy = [...arr];
    copy.sort((a, b) => {
      const wA = weights[a] || 0;
      const wB = weights[b] || 0;
      return wB - wA;
    });
    return copy;
  };
  const sortedOptions = sortByPreference(thisLayerOptions);

  const hasOptions =
    sortedOptions.length > 0 && currentIndex < sortedOptions.length;

  // Preference inc/dec
  const incPreference = (item) => {
    setWeights((prev) => ({
      ...prev,
      [item]: (prev[item] || 0) + PREFERENCE_INC
    }));
  };
  const decPreference = (item) => {
    setWeights((prev) => ({
      ...prev,
      [item]: (prev[item] || 0) - PREFERENCE_DEC
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

  // FINAL MATCH
  const handleFinalMatch = (choice) => {
    setFinalMatch(choice);
    if (!matched.includes(choice)) {
      setMatched((prev) => [...prev, choice]);
    }
  };

  // Check final
  function isFinalOption(path, choice) {
    const nextNode = getNodeAtPath(categories, [...path, choice]);
    if (!nextNode) return true;
    if (typeof nextNode === "object" && !Array.isArray(nextNode)) return false;
    if (Array.isArray(nextNode)) return false;
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

  // CONTINUE => user +10, code +5
  const processContinue = (choice) => {
    setRewardPoints((prev) => Math.min(prev + REWARD_CONTINUE, MAX_REWARD_POINTS));
    incPreference(choice);

    if (isFinalOption(currentPath, choice)) {
      // final => match
      handleFinalMatch(choice);
    } else {
      // deeper
      setHistory((prev) => [...prev, { path: [...currentPath], index: currentIndex }]);
      setCurrentPath((prev) => [...prev, choice]);
      setCurrentIndex(0);
    }
  };

  // DISCARD => user +1, code -1
  const processDiscard = (choice) => {
    setRewardPoints((prev) => Math.min(prev + REWARD_DISCARD, MAX_REWARD_POINTS));
    decPreference(choice);

    const nextIndex = currentIndex + 1;
    if (nextIndex < sortedOptions.length) {
      setCurrentIndex(nextIndex);
    } else {
      // out of cards in this layer
      setNoMoreMessage(true);
      setTimeout(() => {
        setNoMoreMessage(false);
        // If there's a parent layer, go back
        if (history.length > 0) {
          goBack();
        } else {
          // top-level => reshuffle
          reshuffleDeck();
        }
      }, 2000);
    }
  };

  // LAYER NAME
  const currentLayerName =
    currentPath.length === 0
      ? "Shuffling..."
      : currentPath[currentPath.length - 1];

  // PHONE-SCREEN STYLES
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
  const finalMatchOverlay = {
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

  const noMoreOverlay = {
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

  const cardContainerStyle = {
    width: "300px",
    height: "420px",
    position: "relative"
  };

  const cardColor = getColorForPath(currentPath);

  const cardStyle = {
    width: "100%",
    height: "100%",
    borderRadius: "12px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
    backgroundColor: cardColor,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end"
  };

  const cardOverlayStyle = {
    background: "linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 100%)",
    color: "#fff",
    padding: "1rem",
    display: "flex",
    alignItems: "flex-end",
    height: "100%"
  };

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

  return (
    <div style={appContainerStyle}>
      {/* FINAL MATCH OVERLAY */}
      {finalMatch && (
        <div style={finalMatchOverlay}>
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

      {/* NO MORE CARDS OVERLAY */}
      {noMoreMessage && (
        <div style={noMoreOverlay}>
          No more options at this layer! Going back one level…
        </div>
      )}

      {/* MATCHES MODAL */}
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

          <div style={{ marginTop: "auto", display: "flex", gap: "1rem" }}>
            {/* Go Back from matches overlay */}
            <button
              style={{
                padding: "0.5rem 1rem",
                background: "#3498DB",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
              onClick={() => {
                setShowMatches(false);
                goBack();
              }}
            >
              Go Back
            </button>

            {/* Reshuffle from matches overlay */}
            <button
              style={{
                padding: "0.5rem 1rem",
                background: "#E74C3C",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
              onClick={() => {
                setShowMatches(false);
                reshuffleDeck();
              }}
            >
              Reshuffle
            </button>

            {/* Or simply close the overlay */}
            <button
              style={{
                marginLeft: "auto",
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
        </div>
      )}

      {/* HEADER */}
      <div style={headerStyle}>
        <button onClick={goBack} style={backButtonStyle}>←</button>
        <h3 style={phoneScreenTitleStyle}>{currentLayerName}</h3>
        <button onClick={() => setShowMatches(true)} style={matchesButtonStyle}>
          ♡
        </button>
      </div>

      {/* USER SCORE */}
      <div style={{ textAlign: "center", padding: "0.5rem" }}>
        <strong>Points:</strong> {rewardPoints}
      </div>

      {/* CARD */}
      <div style={mainContentStyle}>
        <div style={cardContainerStyle}>
          {hasOptions ? (
            <TinderCard
              key={sortedOptions[currentIndex]}
              onSwipe={(dir) => handleSwipe(dir)}
              preventSwipe={["up", "down"]}
            >
              <div style={cardStyle}>
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

      {/* BOTTOM BAR */}
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

      {/* RESHUFFLE AT VERY BOTTOM */}
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
