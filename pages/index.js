import { useState, useEffect } from 'react';
import TinderCard from 'react-tinder-card';

// ----------------------
// LOCAL ACTIVITY DATABASE
// ----------------------
const categories = {
  "Eating & Drinking": {
    "Seafood": {
      "Crab Houses": ["LP Steamers", "Thames Street Oyster House", "Nick’s Fish House", "The Choptank", "Faidley’s Seafood"],
      "Oyster Bars": ["Ryleigh’s Oyster", "The Choptank", "Thames Street Oyster House"]
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
  }
};

// ----------------------
// REWARD CONSTANTS
// ----------------------
const MAX_REWARD_POINTS = 100;
const REWARD_DISCARD = 1;   // user gets 1 point for discarding
const REWARD_CONTINUE = 10; // user gets 10 points for continuing

export default function Home() {
  // Track the user's navigation history, so we can go back up a level
  const [history, setHistory] = useState([]);

  // Start at a placeholder top-level so we can display "Select a Category"
  const [currentLayer, setCurrentLayer] = useState("Select a Category");
  const [currentOptions, setCurrentOptions] = useState(Object.keys(categories));
  const [currentIndex, setCurrentIndex] = useState(0);

  // Track user matches (final selections)
  const [matched, setMatched] = useState([]);

  // If we find a final match, store it here
  const [finalMatch, setFinalMatch] = useState(null);

  // Simple session-based reward points for the *user*
  const [rewardPoints, setRewardPoints] = useState(0);

  // ----------------------
  // PREFERENCE LEARNING:
  // For each category/option, we track a "weight" in localStorage so
  // we can reorder suggestions over time (the "code" is rewarded).
  // ----------------------
  const [weights, setWeights] = useState(() => {
    // On first load, try reading from localStorage
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("categoryWeights");
      return stored ? JSON.parse(stored) : {};
    }
    return {};
  });

  // Whenever weights state changes, save to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("categoryWeights", JSON.stringify(weights));
    }
  }, [weights]);

  // Utility: check if a given choice is "final" (no deeper subcategories)
  const isFinalOption = (choice) => {
    let next;
    if (currentLayer === "Select a Category") {
      // top-level
      next = categories[choice];
    } else {
      // deeper level
      next = categories[currentLayer]?.[choice];
    }
    return !next || Array.isArray(next);
  };

  // Called when user swipes left (Discard) or right (Continue)
  const handleSwipe = (direction) => {
    if (currentIndex >= currentOptions.length) return;
    const choice = currentOptions[currentIndex];

    if (direction === "right") {
      processContinue(choice);
    } else {
      processDiscard(choice);
    }
  };

  // "Continue": user wants to explore deeper or finalize
  const processContinue = (choice) => {
    // Increase weight for the "code" for suggesting something the user continued
    incrementWeight(choice);

    let nextLayer;
    if (currentLayer === "Select a Category") {
      nextLayer = categories[choice];
    } else {
      nextLayer = categories[currentLayer]?.[choice];
    }

    // If it's an object (subcategories), go deeper
    if (nextLayer && typeof nextLayer === "object" && !Array.isArray(nextLayer)) {
      // push current state to history
      setHistory((prev) => [...prev, { layer: currentLayer, options: currentOptions }]);
      setCurrentLayer(choice);

      // Build sorted list of the next layer's keys
      const nextKeys = Object.keys(nextLayer);
      const sorted = sortByWeight(nextKeys);
      setCurrentOptions(sorted);

      setCurrentIndex(0);

    } else if (Array.isArray(nextLayer)) {
      // nextLayer is an array of final items
      setHistory((prev) => [...prev, { layer: currentLayer, options: currentOptions }]);
      setCurrentLayer(choice);

      // Sort final items by weight
      const sorted = sortByWeight(nextLayer);
      setCurrentOptions(sorted);

      setCurrentIndex(0);

    } else if (isFinalOption(choice)) {
      // It's a final leaf
      handleFinalMatch(choice);

    } else {
      console.warn("Unexpected: no valid next layer for:", choice);
    }

    // Reward user points for continuing
    setTimeout(() => {
      setRewardPoints((prev) => Math.min(prev + REWARD_CONTINUE, MAX_REWARD_POINTS));
    }, 100);
  };

  // "Discard": user discards the card at the current index
  const processDiscard = (choice) => {
    // Decrease weight for the "code" for showing something user discards
    decrementWeight(choice);

    // Move to the next option on the same level
    setCurrentIndex((prev) => (prev + 1) % currentOptions.length);

    // Give user 1 point for discarding
    setTimeout(() => {
      setRewardPoints((prev) => Math.min(prev + REWARD_DISCARD, MAX_REWARD_POINTS));
    }, 100);
  };

  // Final match found: user sees a single item with no children
  const handleFinalMatch = (choice) => {
    setFinalMatch(choice);
    // Save in matched list
    if (!matched.includes(choice)) {
      const updatedMatched = [...matched, choice];
      setMatched(updatedMatched);
      if (typeof window !== "undefined") {
        localStorage.setItem("matched", JSON.stringify(updatedMatched));
      }
    }
  };

  // Reset everything to top-level
  const reshuffleDeck = () => {
    setCurrentLayer("Select a Category");
    // Sort top-level categories by weight
    const topKeys = sortByWeight(Object.keys(categories));
    setCurrentOptions(topKeys);

    setCurrentIndex(0);
    setFinalMatch(null);
    setRewardPoints(0);
  };

  // Go back one step in history
  const goBack = () => {
    if (history.length > 0) {
      const prevState = history[history.length - 1];
      const updatedHistory = history.slice(0, -1);

      setCurrentLayer(prevState.layer);
      setCurrentOptions(prevState.options);
      setCurrentIndex(0);
      setHistory(updatedHistory);
    }
  };

  // ----------------------
  // WEIGHT UTILITIES
  // ----------------------
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

  // Sort an array of strings (categories/items) by descending weight
  const sortByWeight = (arr) => {
    const copied = [...arr];
    copied.sort((a, b) => {
      const wA = weights[a] || 0;
      const wB = weights[b] || 0;
      // higher weight => comes first
      return wB - wA;
    });
    return copied;
  };

  // -------------
  // On first mount, sort the top-level categories by weight
  // -------------
  useEffect(() => {
    if (currentLayer === "Select a Category") {
      setCurrentOptions(sortByWeight(Object.keys(categories)));
    }
  }, []);

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h2>{currentLayer}</h2>
      <p>Reward Points: {rewardPoints}</p>

      {finalMatch ? (
        <div className="match-confirmation">
          <h3>Match Found: {finalMatch}</h3>
          <button onClick={reshuffleDeck}>Reshuffle Deck</button>
        </div>
      ) : (
        <>
          {currentOptions.length > 0 ? (
            <TinderCard
              className="swipe-card"
              key={currentOptions[currentIndex]}
              onSwipe={(dir) => handleSwipe(dir)}
              preventSwipe={["up", "down"]}
            >
              <div
                style={{
                  width: "300px",
                  height: "400px",
                  backgroundColor: "tomato",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  margin: "0 auto"
                }}
              >
                <h3 style={{ color: "#fff", padding: "1rem" }}>
                  {currentOptions[currentIndex]}
                </h3>
              </div>
            </TinderCard>
          ) : (
            <p>No options available.</p>
          )}

          <div style={{ marginTop: "1rem" }}>
            <button
              style={{ marginRight: "1rem" }}
              onClick={() => handleSwipe("left")}
            >
              Discard
            </button>
            <button onClick={() => handleSwipe("right")}>Continue</button>
          </div>

          {history.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <button onClick={goBack}>Go Back</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
