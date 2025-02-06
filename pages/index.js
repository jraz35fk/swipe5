import { useState, useEffect } from 'react';
import TinderCard from 'react-tinder-card';

/**
 * Minimal categories object with exactly 4 top-level parents:
 * 1) Eating & Drinking
 * 2) Partying & Bars
 * 3) Events & Festivals
 * 4) Outdoors & Recreation
 *
 * Each top-level leads to child layers or final items.
 * Some child layers lead to more sub-layers, ensuring multi-swipe depth.
 * Eventually, we reach final arrays (like "Crab Houses": [...]).
 */
const categories = {
  "Eating & Drinking": {
    "Seafood": {
      "Crab Houses": [
        "LP Steamers",
        "Thames Street Oyster House",
        "Nick’s Fish House"
      ],
      "Oyster Bars": [
        "Ryleigh’s Oyster",
        "The Choptank",
        "Thames Street Oyster House"
      ]
    },
    "Italian & Pizza": [
      "Isabella’s Brick Oven",
      "Vacarro’s (Little Italy)",
      "Matthew’s Pizza"
    ]
  },

  "Partying & Bars": {
    "Cocktail Lounges": [
      "W.C. Harlan",
      "Dutch Courage",
      "Sugarvale"
    ],
    "Dive Bars": [
      "Max’s Taphouse",
      "The Horse You Came In On Saloon"
    ],
    "Dance Clubs": [
      "The Rockwell",
      "POWER PLANT LIVE!",
      "The 8x10"
    ]
  },

  "Events & Festivals": {
    "Major Annual": [
      "Preakness Stakes",
      "AFRAM",
      "Baltimore Book Festival",
      "Artscape"
    ],
    "Neighborhood": [
      "Fells Point Fun Festival",
      "Pigtown Festival",
      "HonFest"
    ],
    "Holiday": [
      "Miracle on 34th Street",
      "German Christmas Village",
      "Lighting of the Washington Monument"
    ]
  },

  "Outdoors & Recreation": {
    "Parks & Hiking": [
      "Federal Hill Park",
      "Patterson Park",
      "Patapsco Valley State Park Trails"
    ],
    "Water Activities": [
      "Inner Harbor Kayaking",
      "Waterfront Promenade Walk",
      "Urban Pirates Cruise"
    ],
    "Sports Venues": [
      "Oriole Park at Camden Yards",
      "M&T Bank Stadium"
    ]
  }
};

// ----------------------
// REWARD CONSTANTS
// ----------------------
const MAX_REWARD_POINTS = 100;
const REWARD_DISCARD = 1;   // +1 for discarding
const REWARD_CONTINUE = 10; // +10 for continuing

// Map a few known items to a relevant image. Everything else: fallback.
const imageMap = {
  "Eating & Drinking": "https://images.unsplash.com/photo-1483691278019-cb7253bee49f?crop=entropy&cs=tinysrgb&fit=max&w=700&q=80",
  "Seafood": "https://images.unsplash.com/photo-1514514788490-3785a9b82c00?crop=entropy&cs=tinysrgb&fit=max&w=700&q=80",
  "Partying & Bars": "https://images.unsplash.com/photo-1487029413235-e3f7fa17f6ca?crop=entropy&cs=tinysrgb&fit=max&w=700&q=80",
  "Cocktail Lounges": "https://images.unsplash.com/photo-1541854161-7dedba2ccc84?crop=entropy&cs=tinysrgb&fit=max&w=700&q=80",
  "Events & Festivals": "https://images.unsplash.com/photo-1490135900372-0263f1feecc4?crop=entropy&cs=tinysrgb&fit=max&w=700&q=80",
  "Outdoors & Recreation": "https://images.unsplash.com/photo-1598550487032-0efc2ff845a2?crop=entropy&cs=tinysrgb&fit=max&w=700&q=80",
  "Crab Houses": "https://images.unsplash.com/photo-1561365452-adb940139ffa?crop=entropy&cs=tinysrgb&fit=max&w=700&q=80",
  "Nick’s Fish House": "https://images.unsplash.com/photo-1624891374782-d96f502cdd06?crop=entropy&cs=tinysrgb&fit=max&w=700&q=80",
  "Inner Harbor Kayaking": "https://images.unsplash.com/photo-1563199574-26a530c714bb?crop=entropy&cs=tinysrgb&fit=max&w=700&q=80",
  "Oriole Park at Camden Yards": "https://images.unsplash.com/photo-1579980297500-7596906edc76?crop=entropy&cs=tinysrgb&fit=max&w=700&q=80",
};

function getImageUrl(name) {
  return imageMap[name] || "https://source.unsplash.com/collection/190727/600x800";
}

// Safe retrieval of node by path array
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
  // Path for multi-layer nav
  const [currentPath, setCurrentPath] = useState([]);
  // Index in the current array of items (which might be categories or final items)
  const [currentIndex, setCurrentIndex] = useState(0);

  // If final item chosen
  const [finalMatch, setFinalMatch] = useState(null);
  // Track matched items in memory
  const [matched, setMatched] = useState([]);

  // Let user see matches in a panel
  const [showMatches, setShowMatches] = useState(false);

  // Basic user reward points
  const [rewardPoints, setRewardPoints] = useState(0);

  // Weighted preferences for the "code"
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

  // For "go back" history
  const [history, setHistory] = useState([]);

  // Show a 2s "Shuffling Baltimore..." on initial mount
  const [isShuffling, setIsShuffling] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsShuffling(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Retrieve current node
  const node = getNodeAtPath(categories, currentPath);

  // Build this layer's items
  let thisLayerOptions = [];
  if (currentPath.length === 0 && !node) {
    // Top-level categories
    thisLayerOptions = Object.keys(categories);
  } else if (node && typeof node === "object" && !Array.isArray(node)) {
    // Subcategories
    thisLayerOptions = Object.keys(node);
  } else if (Array.isArray(node)) {
    // Final array
    thisLayerOptions = node;
  }

  // Sort them by descending weight
  const sortByWeight = (arr) => {
    const copy = [...arr];
    copy.sort((a, b) => ( (weights[b] || 0) - (weights[a] || 0) ));
    return copy;
  };
  let sortedOptions = sortByWeight(thisLayerOptions);

  // For top-level, optionally randomize or just do weight sort
  // We'll skip randomizing here to keep it simple
  // but you could do: sortedOptions = shuffle(sortedOptions);

  const hasOptions =
    sortedOptions.length > 0 && currentIndex < sortedOptions.length;

  // Check if the chosen item is final
  const isFinalOption = (choice) => {
    if (Array.isArray(node)) return true;
    const nextNode = getNodeAtPath(categories, [...currentPath, choice]);
    if (!nextNode) return true;
    if (typeof nextNode === "object" && !Array.isArray(nextNode)) return false;
    if (Array.isArray(nextNode)) return false;
    return true;
  };

  // Discard => Next card, +1 point
  const processDiscard = (choice) => {
    decrementWeight(choice);
    setCurrentIndex((prev) => prev + 1);
    setRewardPoints((prev) => Math.min(prev + REWARD_DISCARD, MAX_REWARD_POINTS));
    console.log("Discarded:", choice, "New index:", currentIndex + 1);
  };

  // Continue => If final, match. Else drill deeper. +10 points
  const processContinue = (choice) => {
    incrementWeight(choice);

    if (isFinalOption(choice)) {
      handleFinalMatch(choice);
    } else {
      // Drill deeper
      setHistory((prev) => [...prev, { path: [...currentPath], index: currentIndex }]);
      setCurrentPath((prev) => [...prev, choice]);
      setCurrentIndex(0);
    }

    setRewardPoints((prev) => Math.min(prev + REWARD_CONTINUE, MAX_REWARD_POINTS));
    console.log("Continued:", choice);
  };

  // Final match overlay
  const handleFinalMatch = (choice) => {
    setFinalMatch(choice);
    if (!matched.includes(choice)) {
      setMatched((prev) => [...prev, choice]);
    }
  };

  // SWIPE HANDLER (left => discard, right => continue)
  const handleSwipe = (direction) => {
    if (!hasOptions) return;
    const choice = sortedOptions[currentIndex];
    if (direction === "right") {
      processContinue(choice);
    } else {
      processDiscard(choice);
    }
  };

  // Go back up one layer
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

  // Reshuffle => back to top-level
  const reshuffleDeck = () => {
    setCurrentPath([]);
    setCurrentIndex(0);
    setFinalMatch(null);
    setRewardPoints(0);
    setHistory([]);
  };

  // Weight updaters
  const incrementWeight = (item) => {
    setWeights((prev) => ({ ...prev, [item]: (prev[item] || 0) + 1 }));
  };
  const decrementWeight = (item) => {
    setWeights((prev) => ({ ...prev, [item]: (prev[item] || 0) - 1 }));
  };

  // For UI label:
  const currentLayerName =
    currentPath.length === 0
      ? "Shuffling..."
      : currentPath[currentPath.length - 1];

  // -----------
  // STYLES
  // -----------
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

  // LOADING SCREEN
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

  // final match overlay
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

  // matches panel (if user taps "show matches")
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

  // top bar
  const headerStyle = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "0.5rem",
    borderBottom: "1px solid #ccc",
    position: "relative"
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

  const phoneScreenTitleStyle = {
    margin: 0,
    fontWeight: "bold"
  };

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
      {/* If we have a final match, overlay it */}
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

      {/* Show the "My Matches" overlay if showMatches is true */}
      {showMatches && (
        <div style={matchesPanelStyle}>
          <h2>My Matches</h2>
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
        <button onClick={goBack} style={backButtonStyle}>←</button>
        <h3 style={phoneScreenTitleStyle}>{currentLayerName}</h3>
        <button onClick={() => setShowMatches(true)} style={matchesButtonStyle}>♡</button>
      </div>

      {/* Reward points */}
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
              <div
                style={{
                  ...cardStyle,
                  backgroundImage: `url(${getImageUrl(sortedOptions[currentIndex])})`
                }}
              >
                <div style={cardOverlayStyle}>
                  <h2 style={{ margin: 0 }}>{sortedOptions[currentIndex]}</h2>
                </div>
              </div>
            </TinderCard>
          ) : (
            <p style={{ textAlign: "center" }}>No more options at this level.</p>
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
          <div style={{ textAlign: "center", width: "100%" }}>
            <p>No more cards here.</p>
          </div>
        )}
      </div>

      {/* Reshuffle at bottom */}
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
