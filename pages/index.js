import { useState, useEffect } from 'react';
import TinderCard from 'react-tinder-card';

/**
 * MASTER CATEGORIES OBJECT
 * Fewer top-level, deeper sub-layers for more swipes.
 */
const categories = {
  "Eating & Drinking": {
    "Restaurants": {
      "Seafood": {
        "Crab Houses": [
          "LP Steamers",
          "Thames Street Oyster House",
          "Nick’s Fish House",
          "The Choptank",
          "Faidley’s Seafood"
        ],
        "Oyster Bars": [
          "Ryleigh’s Oyster",
          "The Choptank",
          "Thames Street Oyster House"
        ]
      },
      "International Cuisine": [
        "Ekiben",
        "Little Italy Restaurants",
        "The Helmand",
        "Peter’s Pour House",
        "La Cuchara"
      ]
    },
    "Breweries & Distilleries": {
      "Craft Breweries": [
        "Union Craft Brewing",
        "Checkerspot Brewing Co.",
        "Diamondback Brewing Co.",
        "Mobtown Brewing Co.",
        "Heavy Seas Beer",
        "Brewer’s Art"
      ],
      "Distilleries & Mead": [
        "Sagamore Spirit Distillery",
        "Baltimore Spirits Company",
        "Old Line Spirits",
        "Charm City Meadworks"
      ],
      "Tours": [
        "Guinness Open Gate Brewery",
        "City Brew Tours"
      ]
    },
    "Nightlife": [
      "W.C. Harlan",
      "The Elk Room",
      "Dutch Courage",
      "Sugarvale",
      "Max’s Taphouse",
      "The Horse You Came In On Saloon",
      "Rams Head Live",
      "The 8x10",
      "Soundstage"
    ]
  },
  "Arts, Culture & Entertainment": {
    "Museums & Landmarks": {
      "Museums": [
        "Baltimore Museum of Art",
        "Walters Art Gallery",
        "American Visionary Art Museum",
        "Maryland Science Center",
        "Port Discovery Children’s Museum"
      ],
      "Historic Sites": [
        "Fort McHenry",
        "Edgar Allan Poe House",
        "B&O Railroad Museum",
        "Bromo Seltzer Arts Tower",
        "Great Blacks in Wax Museum"
      ]
    },
    "Performing Arts": [
      "Baltimore Symphony Orchestra",
      "Hippodrome Theatre",
      "Ottobar",
      "Keystone Korner"
    ],
    "Festivals & Seasonal": {
      "Spring & Summer": [
        "Opening Day at Camden Yards",
        "Charm City Bluegrass Festival",
        "Maryland Film Festival",
        "HonFest",
        "Baltimore Pride",
        "Artscape"
      ],
      "Fall & Winter": [
        "Fell’s Point Fun Festival",
        "Great Halloween Lantern Parade",
        "Miracle on 34th Street",
        "German Christmas Village",
        "Frozen Harbor Music Festival"
      ]
    }
  },
  "Outdoors & Recreation": {
    "Parks & Hiking": [
      "Federal Hill Park",
      "Patterson Park",
      "Cylburn Arboretum",
      "Patapsco Valley State Park Trails"
    ],
    "Water Activities": [
      "Kayaking at Inner Harbor",
      "Waterfront Promenade Walk",
      "Urban Pirates Cruise"
    ],
    "Sports & Adventures": [
      "Oriole Park at Camden Yards",
      "M&T Bank Stadium",
      "Topgolf Baltimore",
      "Urban Axes",
      "Leakin Park Miniature Steam Trains"
    ]
  },
  "Events & Festivals": {
    "Major Annual Events": [
      "Preakness Stakes",
      "AFRAM",
      "Baltimore Caribbean Carnival",
      "Baltimore Book Festival",
      "Restaurant Week"
    ],
    "Neighborhood Festivals": [
      "Pigtown Festival",
      "Fells Point Ghost Tours",
      "Edgar Allan Poe Festival",
      "Baltimore Running Festival",
      "Kinetic Sculpture Race"
    ],
    "Holiday Celebrations": [
      "Fourth of July Fireworks",
      "Lighting of the Washington Monument",
      "Chinese New Year Celebrations",
      "MLK Parade"
    ]
  },
  "Shopping & Hidden Gems": {
    "Markets & Bazaars": [
      "Lexington Market",
      "Broadway Market",
      "Cross Street Market",
      "Baltimore Farmers’ Market & Bazaar",
      "Belvedere Square Market"
    ],
    "Quirky & Offbeat": {
      "Shops & Oddities": [
        "Atomic Books",
        "The Sound Garden",
        "The Bazaar",
        "Village Thrift",
        "Keepers Vintage",
        "The Book Thing"
      ],
      "Attractions": [
        "Papermoon Diner",
        "Lexington Market Catacombs Tour",
        "Graffiti Alley",
        "Volunteer for a Day"
      ]
    },
    "Neighborhood Strolls": [
      "Hampden’s “The Avenue”",
      "Fells Point Antiques & Shops",
      "Baltimore Heritage Walk"
    ]
  }
};

// ----------------------
// REWARD CONSTANTS
// ----------------------
const MAX_REWARD_POINTS = 100;
const REWARD_DISCARD = 1;
const REWARD_CONTINUE = 10;

/**
 * A simple IMAGE MAP for categories and final items.
 * Key = string (e.g. "Eating & Drinking", "Crab Houses", "LP Steamers").
 * Value = URL to a relevant image.
 * 
 * If not found, we use a fallback Unsplash link.
 * You can expand or refine this as you like.
 */
const imageMap = {
  // Top-Level
  "Eating & Drinking": "https://images.unsplash.com/photo-1483691278019-cb7253bee49f?crop=entropy&cs=tinysrgb&fit=max&w=700&q=80",
  "Arts, Culture & Entertainment": "https://images.unsplash.com/photo-1607141154778-f7af83180c29?crop=entropy&cs=tinysrgb&fit=max&w=700&q=80",
  "Outdoors & Recreation": "https://images.unsplash.com/photo-1598550487032-0efc2ff845a2?crop=entropy&cs=tinysrgb&fit=max&w=700&q=80",
  "Events & Festivals": "https://images.unsplash.com/photo-1604252207279-0d99b71e3d6a?crop=entropy&cs=tinysrgb&fit=max&w=700&q=80",
  "Shopping & Hidden Gems": "https://images.unsplash.com/photo-1556742521-9713bf2720d8?crop=entropy&cs=tinysrgb&fit=max&w=700&q=80",

  // Some second-level categories
  "Seafood": "https://images.unsplash.com/photo-1514514788490-3785a9b82c00?crop=entropy&cs=tinysrgb&fit=max&w=700&q=80",
  "Nightlife": "https://images.unsplash.com/photo-1487029413235-e3f7fa17f6ca?crop=entropy&cs=tinysrgb&fit=max&w=700&q=80",
  "Breweries & Distilleries": "https://images.unsplash.com/photo-1571086578068-c7a7bfbf9680?crop=entropy&cs=tinysrgb&fit=max&w=700&q=80",
  "Museums & Landmarks": "https://images.unsplash.com/photo-1582395760561-338aaf6ec0e6?crop=entropy&cs=tinysrgb&fit=max&w=700&q=80",
  "Performing Arts": "https://images.unsplash.com/photo-1620085589319-e419433cb786?crop=entropy&cs=tinysrgb&fit=max&w=700&q=80",
  "Festivals & Seasonal": "https://images.unsplash.com/photo-1612386916723-a8dc4accffe2?crop=entropy&cs=tinysrgb&fit=max&w=700&q=80",
  "Parks & Hiking": "https://images.unsplash.com/photo-1506446001441-1dffa5b98af5?crop=entropy&cs=tinysrgb&fit=max&w=700&q=80",
  "Water Activities": "https://images.unsplash.com/photo-1563199574-26a530c714bb?crop=entropy&cs=tinysrgb&fit=max&w=700&q=80",
  "Major Annual Events": "https://images.unsplash.com/photo-1518118573782-0a7ff594d39e?crop=entropy&cs=tinysrgb&fit=max&w=700&q=80",
  "Neighborhood Festivals": "https://images.unsplash.com/photo-1440799306745-1c4392d1d6d6?crop=entropy&cs=tinysrgb&fit=max&w=700&q=80",

  // Some final items example
  "LP Steamers": "https://images.unsplash.com/photo-1561365452-adb940139ffa?crop=entropy&cs=tinysrgb&fit=max&w=700&q=80",
  "Nick’s Fish House": "https://images.unsplash.com/photo-1624891374782-d96f502cdd06?crop=entropy&cs=tinysrgb&fit=max&w=700&q=80",
  "Oriole Park at Camden Yards": "https://images.unsplash.com/photo-1579980297500-7596906edc76?crop=entropy&cs=tinysrgb&fit=max&w=700&q=80",
  "Fells Point Ghost Tours": "https://images.unsplash.com/photo-1527234502807-e91651720128?crop=entropy&cs=tinysrgb&fit=max&w=700&q=80",
  "Miracle on 34th Street": "https://images.unsplash.com/photo-1607881772611-c43e056576cc?crop=entropy&cs=tinysrgb&fit=max&w=700&q=80",
};

// Returns a fallback image from Unsplash if not in the map
function getImageUrl(name) {
  return imageMap[name] || "https://source.unsplash.com/collection/190727/600x800";
}

// Safely traverse nested data by path
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
  // NAVIGATION + SWIPES
  const [currentPath, setCurrentPath] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // FINAL MATCH
  const [finalMatch, setFinalMatch] = useState(null);
  // Keep in-memory matches until refresh
  const [matched, setMatched] = useState([]);
  // Matches panel
  const [showMatches, setShowMatches] = useState(false);

  // USER REWARDS
  const [rewardPoints, setRewardPoints] = useState(0);

  // CODE "WEIGHTS" (preference learning)
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

  // GO BACK HISTORY
  const [history, setHistory] = useState([]);

  // LOADING SCREEN (e.g. "Shuffling Baltimore...")
  const [isShuffling, setIsShuffling] = useState(true);

  // On mount, show "Shuffling Baltimore..." for ~2s, then reveal cards
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsShuffling(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // GET CURRENT NODE (object or array)
  const node = getNodeAtPath(categories, currentPath);

  // DETERMINE THIS LAYER'S OPTIONS
  let thisLayerOptions = [];
  if (currentPath.length === 0 && !node) {
    // top-level categories
    thisLayerOptions = Object.keys(categories);
  } else if (node && typeof node === "object" && !Array.isArray(node)) {
    // subcategories
    thisLayerOptions = Object.keys(node);
  } else if (Array.isArray(node)) {
    // final items
    thisLayerOptions = node;
  }

  // SORT OPTIONS BY WEIGHT (desc)
  const sortByWeight = (arr) => {
    const copy = [...arr];
    copy.sort((a, b) => {
      const wA = weights[a] || 0;
      const wB = weights[b] || 0;
      return wB - wA;
    });
    return copy;
  };

  // If we are at top-level, let's also randomize them (optional).
  // This gives a bit of variety each time. 
  // If you'd rather keep them sorted purely by weight, remove this shuffle logic.
  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  let sortedOptions = sortByWeight(thisLayerOptions);
  // If top-level, randomize them (you can comment this out if you want only weight-sorted)
  if (currentPath.length === 0) {
    sortedOptions = shuffle(sortedOptions);
  }

  const hasOptions = sortedOptions.length > 0 && currentIndex < sortedOptions.length;

  // Check if choice is final (a single item)
  const isFinalOption = (choice) => {
    if (Array.isArray(node)) {
      return true; // already final list
    }
    const nextNode = getNodeAtPath(categories, [...currentPath, choice]);
    if (!nextNode) return true;
    if (typeof nextNode === "object" && !Array.isArray(nextNode)) return false;
    if (Array.isArray(nextNode)) return false;
    return true;
  };

  // SWIPE HANDLERS
  const handleSwipe = (direction) => {
    if (!hasOptions) return;
    const choice = sortedOptions[currentIndex];
    if (direction === "right") {
      processContinue(choice);
    } else {
      processDiscard(choice);
    }
  };

  const processContinue = (choice) => {
    incrementWeight(choice);
    if (isFinalOption(choice)) {
      handleFinalMatch(choice);
    } else {
      // go deeper
      setHistory((prev) => [...prev, { path: [...currentPath], index: currentIndex }]);
      setCurrentPath((prev) => [...prev, choice]);
      setCurrentIndex(0);
    }
    setRewardPoints((prev) => Math.min(prev + REWARD_CONTINUE, MAX_REWARD_POINTS));
  };

  const processDiscard = (choice) => {
    decrementWeight(choice);
    setCurrentIndex((prev) => prev + 1);
    setRewardPoints((prev) => Math.min(prev + REWARD_DISCARD, MAX_REWARD_POINTS));
  };

  const handleFinalMatch = (choice) => {
    setFinalMatch(choice);
    if (!matched.includes(choice)) {
      const updated = [...matched, choice];
      setMatched(updated);
    }
  };

  // BACK, RESHUFFLE
  const goBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      const newHist = history.slice(0, -1);
      setCurrentPath(prev.path);
      setCurrentIndex(prev.index);
      setHistory(newHist);
      setFinalMatch(null);
    }
  };

  const reshuffleDeck = () => {
    setCurrentPath([]);
    setCurrentIndex(0);
    setFinalMatch(null);
    setRewardPoints(0);
    setHistory([]);
  };

  // WEIGHT UTILS
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

  const currentLayerName =
    currentPath.length === 0
      ? "Shuffling..."
      : currentPath[currentPath.length - 1];

  // -----------------------
  // STYLES (PHONE-LIKE)
  // -----------------------
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

  // top bar
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

  // We'll place "Go Back" and "View Matches" as small text buttons on left & right
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

  // main content area (where the card appears)
  const mainContentStyle = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center"
  };

  // card container
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

  // bottom bar with discard/continue
  const bottomBarStyle = {
    display: "flex",
    justifyContent: "center",
    gap: "2rem",
    padding: "1rem"
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

  // final match splash
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

  // matches panel
  const matchesPanelStyle = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(255,255,255,0.95)",
    zIndex: 998,
    display: "flex",
    flexDirection: "column",
    padding: "1rem"
  };

  // LOADING SCREEN for "Shuffling Baltimore..."
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

  return (
    <div style={appContainerStyle}>
      {/* If we have a final match, show a splash screen */}
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

      {/* If user taps "View My Matches" */}
      {showMatches && (
        <div style={matchesPanelStyle}>
          <h2>My Matches</h2>
          <p style={{ color: "#555" }}>
            (Saved until page is refreshed)
          </p>
          {matched.length === 0 ? (
            <p>No matches yet.</p>
          ) : (
            matched.map((m, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom: "0.5rem",
                  padding: "0.5rem 0",
                  borderBottom: "1px solid #ccc"
                }}
              >
                {m}
              </div>
            ))
          )}
          <button
            onClick={() => setShowMatches(false)}
            style={{
              marginTop: "auto",
              padding: "0.5rem 1rem",
              background: "#666",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Close
          </button>
        </div>
      )}

      {/* HEADER */}
      <div style={headerStyle}>
        {/* Go Back button on left */}
        <button onClick={goBack} style={backButtonStyle}>
          ←
        </button>
        {/* Title in center */}
        <h3 style={phoneScreenTitleStyle}>
          {currentLayerName}
        </h3>
        {/* Matches button on right */}
        <button onClick={() => setShowMatches(true)} style={matchesButtonStyle}>
          ♡
        </button>
      </div>

      {/* Reward Points row */}
      <div style={{ textAlign: "center", padding: "0.5rem" }}>
        <strong>Points:</strong> {rewardPoints}
      </div>

      {/* MAIN CONTENT: Card */}
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
                  backgroundImage: `url(${getImageUrl(sortedOptions[currentIndex])})`
                }}
              >
                <div style={cardOverlayStyle}>
                  <h2 style={{ margin: 0 }}>
                    {sortedOptions[currentIndex]}
                  </h2>
                </div>
              </div>
            </TinderCard>
          ) : (
            <p>No more options at this level.</p>
          )}
        </div>
      </div>

      {/* BOTTOM BAR: discard / continue / reshuffle */}
      <div style={{ borderTop: "1px solid #ccc", paddingTop: "0.5rem" }}>
        {hasOptions ? (
          <div style={bottomBarStyle}>
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
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "1rem" }}>
            <p>No more cards here.</p>
          </div>
        )}
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
    </div>
  );
}
