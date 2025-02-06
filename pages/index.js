import { useState, useEffect } from 'react';
import TinderCard from 'react-tinder-card';

// ----------------------
// LOCAL ACTIVITY DATABASE
// ----------------------
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
  }
};

// ----------------------
// REWARD CONSTANTS
// ----------------------
const MAX_REWARD_POINTS = 100;
const REWARD_DISCARD = 1;   // user gets 1 point for discarding
const REWARD_CONTINUE = 10; // user gets 10 points for continuing

// ----------------------
// HELPER: Safely traverse nested object by path array
// ----------------------
function getNodeAtPath(data, path) {
  // e.g. path = ["Eating & Drinking", "Seafood", "Crab Houses"]
  // walk down categories["Eating & Drinking"]["Seafood"]["Crab Houses"]
  let current = data;
  for (const segment of path) {
    if (current && typeof current === "object" && segment in current) {
      current = current[segment];
    } else {
      // Invalid path or no deeper layer
      return undefined;
    }
  }
  return current;
}

export default function Home() {
  // ----------------------
  // PATH-BASED NAVIGATION
  // ----------------------
  const [currentPath, setCurrentPath] = useState([]); 
  // We show the user one option at a time from the current layer
  const [currentIndex, setCurrentIndex] = useState(0);

  // Keep track of any final selection
  const [finalMatch, setFinalMatch] = useState(null);
  // Keep track of all matched items
  const [matched, setMatched] = useState([]);

  // Session-based user reward points
  const [rewardPoints, setRewardPoints] = useState(0);

  // We'll store subcategory “weights” in localStorage, so the system “learns”
  const [weights, setWeights] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("categoryWeights");
      return stored ? JSON.parse(stored) : {};
    }
    return {};
  });

  // On any weight change, write to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("categoryWeights", JSON.stringify(weights));
    }
  }, [weights]);

  // -----------------------
  // 1) Figure out what the current node is
  //    e.g. top-level object, sub-object, array, or undefined
  // -----------------------
  const node = getNodeAtPath(categories, currentPath);

  // -----------------------
  // 2) Build a list of “this layer’s” options
  //    - If node is an object, the user is choosing among subcategories (keys)
  //    - If node is an array, the user is choosing among final items
  //    - If node is undefined & path is empty => top-level categories
  // -----------------------
  let thisLayerOptions = [];
  if (currentPath.length === 0 && !node) {
    // We are at the top-level "Select a Category"
    thisLayerOptions = Object.keys(categories);
  } else if (node && typeof node === "object" && !Array.isArray(node)) {
    // node is an object => subcategory keys
    thisLayerOptions = Object.keys(node);
  } else if (Array.isArray(node)) {
    // node is an array => final items
    thisLayerOptions = node;
  }
  
  // -----------------------
  // 3) Sort them by descending weight to show “preferred” items first
  // -----------------------
  const sortByWeight = (arr) => {
    const copy = [...arr];
    copy.sort((a, b) => {
      const wA = weights[a] || 0;
      const wB = weights[b] || 0;
      return wB - wA; // Descending
    });
    return copy;
  };
  const sortedOptions = sortByWeight(thisLayerOptions);

  // If we've exceeded the current list length, no cards remain
  const hasOptions = sortedOptions.length > 0 && currentIndex < sortedOptions.length;

  // -----------------------
  // Check if a given choice is final (no deeper sub-layers).
  // We'll do this by seeing if node is an array OR if the next step is undefined.
  // If we push "choice" onto currentPath and see undefined or not an object/array,
  // it's final.
  // -----------------------
  const isFinalOption = (choice) => {
    // If current layer is an array of final items, we automatically consider them final
    if (Array.isArray(node)) {
      return true;
    }
    // Otherwise, let's see what happens if we go deeper
    const nextNode = getNodeAtPath(categories, [...currentPath, choice]);
    // If no deeper structure => final
    // If nextNode is undefined => final
    // If nextNode is array => final items (but we do want to show them individually)
    // If nextNode is object => not final
    if (!nextNode) return true;
    if (typeof nextNode === "object" && !Array.isArray(nextNode)) {
      return false; // there's subcategories
    }
    // nextNode is array => that array is next level,
    // user will see each item as a final. So "Crab Houses" is not final,
    // but "Nick's Fish House" is final. So:
    if (Array.isArray(nextNode)) {
      return false;
    }
    // fallback
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

  // "Continue" means the user is interested in the current item
  const processContinue = (choice) => {
    incrementWeight(choice);

    // If it's final, that means we match right now
    if (isFinalOption(choice)) {
      handleFinalMatch(choice);
    } else {
      // Not final => we go deeper
      // Save currentPath to history so we can go back
      setHistory(prev => [...prev, { path: [...currentPath], index: currentIndex }]);
      // Dive deeper: push 'choice' onto currentPath
      setCurrentPath(prev => [...prev, choice]);
      // Reset index to 0 for the next layer
      setCurrentIndex(0);
    }

    // Reward user for continuing
    setRewardPoints((prev) => Math.min(prev + REWARD_CONTINUE, MAX_REWARD_POINTS));
  };

  // "Discard" means the user is not interested in the current item
  const processDiscard = (choice) => {
    decrementWeight(choice);

    // Move to the next item at the same level
    setCurrentIndex(prev => prev + 1);

    // Reward user slightly for discarding
    setRewardPoints((prev) => Math.min(prev + REWARD_DISCARD, MAX_REWARD_POINTS));
  };

  // Final match
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

  // -----------------------
  // BACK BUTTON: Undo the last drill-down
  // -----------------------
  const [history, setHistory] = useState([]);
  const goBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      const newHistory = history.slice(0, -1);

      setCurrentPath(prev.path);
      setCurrentIndex(prev.index);
      setHistory(newHistory);
    }
  };

  // -----------------------
  // RESHUFFLE: Reset everything to top-level
  // -----------------------
  const reshuffleDeck = () => {
    setCurrentPath([]);
    setCurrentIndex(0);
    setFinalMatch(null);
    setRewardPoints(0);
  };

  // -----------------------
  // WEIGHT UPDATES
  // -----------------------
  const incrementWeight = (item) => {
    setWeights(prev => ({
      ...prev,
      [item]: (prev[item] || 0) + 1
    }));
  };
  const decrementWeight = (item) => {
    setWeights(prev => ({
      ...prev,
      [item]: (prev[item] || 0) - 1
    }));
  };

  // -----------------------
  // RENDER
  // -----------------------
  // For display: if currentPath is empty, show "Select a Category"
  const currentLayerName = currentPath.length === 0
    ? "Select a Category"
    : currentPath[currentPath.length - 1];

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h2>{currentLayerName}</h2>
      <p>Reward Points: {rewardPoints}</p>

      {finalMatch ? (
        <div>
          <h3>Match Found: {finalMatch}</h3>
          <button onClick={reshuffleDeck}>Reshuffle Deck</button>
        </div>
      ) : (
        <>
          {hasOptions ? (
            <TinderCard
              key={sortedOptions[currentIndex]}
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
                  {sortedOptions[currentIndex]}
                </h3>
              </div>
            </TinderCard>
          ) : (
            <p>No more options at this level.</p>
          )}

          <div style={{ marginTop: "1rem" }}>
            {hasOptions && (
              <>
                <button
                  style={{ marginRight: "1rem" }}
                  onClick={() => handleSwipe("left")}
                >
                  Discard
                </button>
                <button onClick={() => handleSwipe("right")}>Continue</button>
              </>
            )}
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
