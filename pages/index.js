import { useState, useEffect } from 'react';
import TinderCard from 'react-tinder-card';

/**
 * SAMPLE CATEGORIES
 * (You can replace this with your full "baltimoreActivities" object,
 * or any other structure you prefer.)
 */
const categories = {
  "Eating & Drinking": {
    "Seafood & Oyster Bars": [
      "LP Steamers",
      "Thames Street Oyster House",
      "Nick’s Fish House"
    ],
    "Italian & Fine Dining": [
      "Charleston",
      "Cinghiale",
      "La Scala"
    ]
  },
  "Nightlife & Entertainment": {
    "Unique Bars & Speakeasies": [
      "The Elk Room",
      "WC Harlan",
      "Illusions Magic Bar"
    ]
  },
  "Events & Festivals": {
    "Major Annual Events": [
      "Preakness Stakes",
      "AFRAM",
      "Artscape"
    ]
  },
  "Outdoors & Nature": {
    "Parks & Gardens": [
      "Druid Hill Park",
      "Federal Hill Park",
      "Patterson Park"
    ]
  }
};

// REWARD CONSTANTS
const MAX_REWARD_POINTS = 100;
const REWARD_DISCARD = 1;
const REWARD_CONTINUE = 10;

// Helper: get node by path
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

// If the node is an object (not array), it means more layers
// If it's an array, final items
// If undefined, no deeper layer
function isFinalNode(data, path, choice) {
  const nextNode = getNodeAtPath(data, [...path, choice]);
  if (!nextNode) return true;
  if (Array.isArray(nextNode)) return false; // there's one more final level
  if (typeof nextNode === "object") return false; // more sub-layers
  return true;
}

export default function Home() {
  // 1) State for path + index
  const [currentPath, setCurrentPath] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 2) Final match overlay
  const [finalMatch, setFinalMatch] = useState(null);

  // 3) Reward points
  const [rewardPoints, setRewardPoints] = useState(0);

  // 4) Matched items in memory
  const [matched, setMatched] = useState([]);
  const [showMatches, setShowMatches] = useState(false);

  // 5) Keep track of previous layers for "goBack"
  const [history, setHistory] = useState([]);

  // 6) “Shuffling…” screen for 2s
  const [isShuffling, setIsShuffling] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setIsShuffling(false), 2000);
    return () => clearTimeout(t);
  }, []);

  // 7) “No more cards” message
  const [noMoreMessage, setNoMoreMessage] = useState(false);

  // Weighted preference system
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

  // Build this layer's options
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

  // Sort them by descending weight
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

  const hasOptions = sortedOptions.length > 0 && currentIndex < sortedOptions.length;

  // UTILS
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

  // “Go Back” logic
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

  // Reshuffle => reset to top-level
  const reshuffleDeck = () => {
    setCurrentPath([]);
    setCurrentIndex(0);
    setFinalMatch(null);
    setRewardPoints(0);
    setHistory([]);
  };

  // If final item chosen => match
  const handleFinalMatch = (choice) => {
    setFinalMatch(choice);
    if (!matched.includes(choice)) {
      setMatched((prev) => [...prev, choice]);
    }
  };

  // SWIPE
  const handleSwipe = (direction) => {
    if (!hasOptions) return;
    const choice = sortedOptions[currentIndex];
    if (direction === "right") {
      handleContinue(choice);
    } else {
      handleDiscard(choice);
    }
  };

  // Continue => +10, deeper or final
  const handleContinue = (choice) => {
    incrementWeight(choice);

    // Check if it's final
    if (isFinalNode(categories, currentPath, choice)) {
      // final => match
      handleFinalMatch(choice);
    } else {
      // go deeper
      setHistory((prev) => [...prev, { path: [...currentPath], index: currentIndex }]);
      setCurrentPath((prev) => [...prev, choice]);
      setCurrentIndex(0);
    }

    setRewardPoints((prev) => Math.min(prev + REWARD_CONTINUE, MAX_REWARD_POINTS));
  };

  // Discard => +1, next card. If no next card, auto “go back” or “reshuffle”
  const handleDiscard = (choice) => {
    decrementWeight(choice);
    const nextIndex = currentIndex + 1;
    setRewardPoints((prev) => Math.min(prev + REWARD_DISCARD, MAX_REWARD_POINTS));

    // If we still have more cards at this layer => just move on
    if (nextIndex < sortedOptions.length) {
      setCurrentIndex(nextIndex);
    } else {
      // No more cards. Show a small message, then go back one layer or reshuffle
      setNoMoreMessage(true);

      setTimeout(() => {
        setNoMoreMessage(false);

        // If there's a parent in history => goBack
        if (history.length > 0) {
          goBack();
        } else {
          // We're at top-level with no more items => Reshuffle
          reshuffleDeck();
        }
      }, 2000);
    }
  };

  // UI strings
  const currentLayerName =
    currentPath.length === 0
      ? "Shuffling..."
      : currentPath[currentPath.length - 1];

  // STYLES
  const containerStyle = {
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
          ...containerStyle,
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

  // main content
  const mainContentStyle = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center"
  };

  // card
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

  // get some fallback images
  const getImageUrl = (name) => {
    // could incorporate a real map or fallback
    // for now, a random unsplash
    return "https://source.unsplash.com/collection/190727/600x800";
  };

  return (
    <div style={containerStyle}>
      {/* Final match overlay */}
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

      {/* "No more cards" overlay */}
      {noMoreMessage && (
        <div style={noMoreOverlay}>
          No more options at this layer! Going back one level…
        </div>
      )}

      {/* Show matches overlay */}
      {showMatches && (
        <div
          style={{
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
          }}
        >
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
        <button onClick={() => setShowMatches(true)} style={matchesButtonStyle}>
          ♡
        </button>
      </div>

      {/* REWARD POINTS */}
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

      {/* RESHUFFLE BUTTON */}
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
