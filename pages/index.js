import { useState, useEffect } from 'react';
import TinderCard from 'react-tinder-card';

/**
 * 1) MASTER CATEGORIES OBJECT
 *    Includes all your top-level + nested subcategories + final items.
 *    (Combined from your “Eating & Drinking,” “Culture & History,” etc.)
 */
const categories = {
  "Eating & Drinking": {
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
    "Breweries & Distilleries": [
      "Heavy Seas Alehouse",
      "Diamondback Brewing Co.",
      "Union Craft Brewing",
      "Sagamore Spirit Distillery"
    ],
    "Speakeasies": [
      "W.C. Harlan",
      "The Elk Room",
      "Dutch Courage",
      "Sugarvale"
    ]
  },
  "Culture & History": {
    "Historical Landmarks": [
      "Fort McHenry",
      "Edgar Allan Poe House",
      "B&O Railroad Museum"
    ],
    "Art": {
      "Art Galleries": [
        "Walters Art Gallery",
        "Baltimore Museum of Art",
        "American Visionary Art Museum"
      ],
      "Street Art": ["Graffiti Alley", "MICA Public Art"]
    },
    "Music & Performance": [
      "Baltimore Symphony Orchestra",
      "Keystone Korner (Live Jazz)",
      "Ottobar (Indie/Alt)"
    ]
  },
  "Outdoor Activities": {
    "Parks & Green Spaces": [
      "Federal Hill Park",
      "Patterson Park",
      "Cylburn Arboretum"
    ],
    "Water Activities": [
      "Kayaking at Inner Harbor",
      "Waterfront Promenade Walk"
    ],
    "Hiking & Nature": ["Patapsco Valley State Park Trails"]
  },
  "Nightlife": {
    "Cocktail Bars": ["The Brewer’s Art", "Sugarvale"],
    "Dive Bars": ["Max’s Taphouse", "The Horse You Came In On Saloon"],
    "Live Music Venues": ["Rams Head Live", "The 8x10", "Soundstage"]
  },
  "Breweries, Wineries & Distilleries": {
    "Distilleries": [
      "Sagamore Spirit Distillery",
      "Baltimore Spirits Company",
      "Old Line Spirits"
    ],
    "Breweries": [
      "Union Craft Brewing",
      "Checkerspot Brewing Co.",
      "Diamondback Brewing Co.",
      "Mobtown Brewing Co.",
      "Heavy Seas Beer",
      "Brewer’s Art"
    ],
    "Mead & Wine": [
      "Charm City Meadworks"
    ],
    "Experiences & Tours": [
      "Guinness Open Gate Brewery",
      "City Brew Tours"
    ]
  },
  "Seasonal Events & Festivals": {
    "Spring": [
      "Opening Day at Camden Yards",
      "Charm City Bluegrass Festival",
      "Maryland Film Festival",
      "Flower Mart",
      "Kinetic Sculpture Race",
      "Wine Village at Inner Harbor"
    ],
    "Summer": [
      "Preakness Stakes",
      "HonFest",
      "Baltimore Pride",
      "AFRAM",
      "Artscape",
      "Fourth of July Fireworks",
      "Baltimore Caribbean Carnival",
      "Arts & Drafts at the Zoo",
      "Waterfront Wellness"
    ],
    "Fall": [
      "Fell’s Point Fun Festival",
      "Baltimore Running Festival",
      "Defenders Day at Fort McHenry",
      "Edgar Allan Poe Festival",
      "Pigtown Festival",
      "Great Halloween Lantern Parade",
      "Fells Point Ghost Tours"
    ],
    "Winter": [
      "Miracle on 34th Street",
      "German Christmas Village",
      "Lighting of the Washington Monument",
      "Dollar or Free Museum Days",
      "MLK Parade",
      "Frozen Harbor Music Festival",
      "Chinese New Year Celebrations"
    ],
    "All Year": [
      "Baltimore Book Festival",
      "Restaurant Week"
    ]
  },
  "Recreation & Sports": {
    "Professional Sports": [
      "Oriole Park at Camden Yards",
      "M&T Bank Stadium"
    ],
    "Active Adventures": [
      "Inner Harbor Kayaking",
      "Urban Pirates Cruise",
      "Baltimore Waterfront Bike Route",
      "Ice Skating at Inner Harbor",
      "Topgolf Baltimore",
      "Urban Axes",
      "Earth Treks Timonium",
      "Leakin Park Miniature Steam Trains",
      "Baltimore Bike Party",
      "Duckpin Bowling",
      "Route 40 Paintball"
    ],
    "Casino & Gaming": [
      "Horseshoe Casino"
    ]
  },
  "Family-Friendly Attractions": {
    "Museums & Indoor": [
      "National Aquarium",
      "Port Discovery Children’s Museum",
      "Maryland Science Center",
      "B&O Railroad Museum",
      "American Visionary Art Museum"
    ],
    "Outdoor & Animals": [
      "Maryland Zoo",
      "Lake Montebello"
    ],
    "Unique Experiences": [
      "Medieval Times Dinner & Tournament"
    ]
  },
  "Shopping & Markets": {
    "Indoor Markets": [
      "Lexington Market",
      "Broadway Market",
      "Cross Street Market",
      "Belvedere Square Market"
    ],
    "Outdoor Markets": [
      "Baltimore Farmers’ Market & Bazaar"
    ],
    "Unique Shops & Thrift": [
      "Atomic Books",
      "The Sound Garden",
      "The Bazaar",
      "Village Thrift",
      "Keepers Vintage",
      "The Book Thing"
    ],
    "Neighborhood Shopping": [
      "Hampden’s “The Avenue”",
      "Fells Point Antiques & Shops"
    ]
  },
  "Hidden Gems & Offbeat Attractions": {
    "Quirky Museums & Landmarks": [
      "Bromo Seltzer Arts Tower",
      "Great Blacks in Wax Museum",
      "The Horse You Came In On Saloon"
    ],
    "Odd & Offbeat": [
      "Papermoon Diner",
      "Self-Guided Mural Tour",
      "BUZZ Lab (DIY biohacking)",
      "Lexington Market Catacombs Tour"
    ],
    "Local Volunteering & Tours": [
      "Volunteer for a Day",
      "Baltimore Heritage Walk",
      "Attend a Neighborhood Festival"
    ]
  }
};

// ----------------------
// REWARD CONSTANTS
// ----------------------
const MAX_REWARD_POINTS = 100;
const REWARD_DISCARD = 1;
const REWARD_CONTINUE = 10;

// ----------------------
// IMAGE MAP - Provide custom images for certain items
// Everything else uses a fallback from Unsplash
// (Replace with your real images or an API in production)
// ----------------------
const imageMap = {
  "Nick’s Fish House":
    "https://images.unsplash.com/photo-1562799183-9ccda1b69721?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80",
  "Union Craft Brewing":
    "https://images.unsplash.com/photo-1591396034575-428db5cecc92?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80",
  "Sagamore Spirit Distillery":
    "https://images.unsplash.com/photo-1580502308389-011787fe5f14?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80",
  "Fort McHenry":
    "https://images.unsplash.com/photo-1604582139894-55cbf1dacb8a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80",
  "Miracle on 34th Street":
    "https://images.unsplash.com/photo-1607881772611-c43e056576cc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80",
  "The Horse You Came In On Saloon":
    "https://images.unsplash.com/photo-1582066830726-74ab48747d8a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080&q=80",
};

/** Return an image URL for the given item name. If not found, use fallback. */
function getImageUrl(itemName) {
  if (imageMap[itemName]) {
    return imageMap[itemName];
  }
  // Fallback from Unsplash (random city photo or random scenic)
  return "https://source.unsplash.com/collection/190727/600x800"; 
  // You could also do: `https://picsum.photos/600/800` or a static placeholder
}

// ----------------------
// HELPER: SAFELY TRAVERSE NESTED DATA
// ----------------------
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

  // FINAL MATCH
  const [finalMatch, setFinalMatch] = useState(null);
  const [matched, setMatched] = useState([]);

  // REWARDS
  const [rewardPoints, setRewardPoints] = useState(0);

  // WEIGHTS (FOR PREFERENCE)
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

  // HISTORY (FOR "GO BACK")
  const [history, setHistory] = useState([]);

  // GET CURRENT NODE
  const node = getNodeAtPath(categories, currentPath);

  // BUILD THIS LAYER'S OPTIONS
  let thisLayerOptions = [];
  if (currentPath.length === 0 && !node) {
    // top-level
    thisLayerOptions = Object.keys(categories);
  } else if (node && typeof node === "object" && !Array.isArray(node)) {
    // subcategories
    thisLayerOptions = Object.keys(node);
  } else if (Array.isArray(node)) {
    // final items
    thisLayerOptions = node;
  }

  // SORT BY WEIGHT (DESC)
  const sortByWeight = (arr) => {
    const copy = [...arr];
    copy.sort((a, b) => {
      const wA = weights[a] || 0;
      const wB = weights[b] || 0;
      return wB - wA; 
    });
    return copy;
  };
  const sortedOptions = sortByWeight(thisLayerOptions);

  const hasOptions =
    sortedOptions.length > 0 && currentIndex < sortedOptions.length;

  // DETERMINE IF AN OPTION IS FINAL
  const isFinalOption = (choice) => {
    if (Array.isArray(node)) {
      return true; // we're already looking at final items
    }
    const nextNode = getNodeAtPath(categories, [...currentPath, choice]);
    if (!nextNode) return true;
    if (typeof nextNode === "object" && !Array.isArray(nextNode)) return false;
    if (Array.isArray(nextNode)) return false;
    return true;
  };

  // -----------------------
  // SWIPE HANDLERS
  // -----------------------
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
      setHistory((prev) => [
        ...prev,
        { path: [...currentPath], index: currentIndex }
      ]);
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
      if (typeof window !== "undefined") {
        localStorage.setItem("matched", JSON.stringify(updated));
      }
    }
  };

  const goBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      const newHistory = history.slice(0, -1);
      setCurrentPath(prev.path);
      setCurrentIndex(prev.index);
      setHistory(newHistory);
    }
  };

  const reshuffleDeck = () => {
    setCurrentPath([]);
    setCurrentIndex(0);
    setFinalMatch(null);
    setRewardPoints(0);
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

  // UI LABEL FOR THE CURRENT LAYER
  const currentLayerName =
    currentPath.length === 0
      ? "Select a Category"
      : currentPath[currentPath.length - 1];

  // STYLES: container, card, overlay, buttons, etc.
  const appContainerStyle = {
    minHeight: "100vh",
    background: "#fafafa",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "1rem",
    fontFamily: "sans-serif"
  };

  const cardContainerStyle = {
    position: "relative",
    width: "320px",
    height: "480px",
    marginTop: "2rem"
  };

  const cardStyle = {
    width: "100%",
    height: "100%",
    borderRadius: "12px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end"
  };

  const cardOverlayStyle = {
    position: "absolute",
    bottom: 0,
    width: "100%",
    padding: "1rem",
    background:
      "linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(255,255,255,0) 100%)",
    color: "#fff"
  };

  const buttonRowStyle = {
    marginTop: "1rem",
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
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
    transition: "transform 0.2s"
  });

  return (
    <div style={appContainerStyle}>
      <div style={{ width: "100%", display: "flex", justifyContent: "space-between" }}>
        {/* "Go Back" and "Reshuffle" at top */}
        <button onClick={goBack} style={{ marginRight: "auto", border: "none", background: "none", color: "#333", cursor: "pointer" }}>
          ← Go Back
        </button>
        <p style={{ margin: 0, fontWeight: "bold" }}>{currentLayerName}</p>
        <button onClick={reshuffleDeck} style={{ marginLeft: "auto", border: "none", background: "none", color: "#333", cursor: "pointer" }}>
          Reshuffle
        </button>
      </div>

      <p>Reward Points: {rewardPoints}</p>

      {finalMatch ? (
        <div>
          <h3>Match Found: {finalMatch}</h3>
          <button onClick={reshuffleDeck}>Start Over</button>
        </div>
      ) : (
        <>
          <div style={cardContainerStyle}>
            {hasOptions ? (
              <TinderCard
                key={sortedOptions[currentIndex]}
                onSwipe={(dir) => handleSwipe(dir)}
                preventSwipe={["up", "down"]}
              >
                {/* Card with Background Image */}
                <div
                  style={{
                    ...cardStyle,
                    backgroundImage: `url(${getImageUrl(
                      sortedOptions[currentIndex]
                    )})`
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
              <p style={{ textAlign: "center", marginTop: "2rem" }}>
                No more options at this level.
              </p>
            )}
          </div>

          {hasOptions && (
            <div style={buttonRowStyle}>
              <button
                style={circleButtonStyle("#F75D59")}
                onClick={() => handleSwipe("left")}
                onMouseDown={(e) => e.preventDefault()}
              >
                ✕
              </button>
              <button
                style={circleButtonStyle("#2ECC71")}
                onClick={() => handleSwipe("right")}
                onMouseDown={(e) => e.preventDefault()}
              >
                ♥
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
