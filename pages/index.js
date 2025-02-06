import { useState, useEffect } from 'react';
import TinderCard from 'react-tinder-card';

/**
 * MASTER CATEGORIES OBJECT
 * Incorporates old + new categories, each with nested layers.
 * Feel free to adjust subcategory groupings to your liking!
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

  // ------------------------------------------------------
  // NEW TOP-LEVEL CATEGORIES (With Nested Layers)
  // ------------------------------------------------------
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
const REWARD_DISCARD = 1;   // user gets 1 point for discarding
const REWARD_CONTINUE = 10; // user gets 10 points for continuing

/**
 * Safely traverse nested data by "path" array
 * e.g. path = ["Breweries, Wineries & Distilleries", "Breweries"] => categories["Breweries, Wineries & Distilleries"]["Breweries"]
 */
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
  // Track the current "path" into the nested object
  const [currentPath, setCurrentPath] = useState([]);
  // Index of the card we're currently viewing at this layer
  const [currentIndex, setCurrentIndex] = useState(0);

  // Final selection + matched items
  const [finalMatch, setFinalMatch] = useState(null);
  const [matched, setMatched] = useState([]);

  // Reward points for the user, per session
  const [rewardPoints, setRewardPoints] = useState(0);

  // Weighted preference system (saved in localStorage)
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

  // Our "history" stack so we can go back up one level
  const [history, setHistory] = useState([]);

  // ---------------
  // GET CURRENT NODE + OPTIONS
  // ---------------
  const node = getNodeAtPath(categories, currentPath);

  // If path is empty, we are at top-level: show the top-level keys
  // If node is an object (not array), show its keys
  // If node is an array, show those items
  let thisLayerOptions = [];
  if (currentPath.length === 0 && !node) {
    // Top-level
    thisLayerOptions = Object.keys(categories);
  } else if (node && typeof node === "object" && !Array.isArray(node)) {
    // Subcategories
    thisLayerOptions = Object.keys(node);
  } else if (Array.isArray(node)) {
    // Final list of items
    thisLayerOptions = node;
  }

  // Sort them by descending "weight" so liked items appear first
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

  // Do we have more cards at this layer?
  const hasOptions = sortedOptions.length > 0 && currentIndex < sortedOptions.length;

  // Determine if a choice is final by seeing what the next node would be
  // If it's undefined or not an object/array, it's final
  // If current node is an array, those are final items
  const isFinalOption = (choice) => {
    if (Array.isArray(node)) {
      return true; // we are already at final items
    }
    const nextNode = getNodeAtPath(categories, [...currentPath, choice]);
    if (!nextNode) return true;
    if (typeof nextNode === "object" && !Array.isArray(nextNode)) return false;
    if (Array.isArray(nextNode)) return false; // means there's a final list there
    return true;
  };

  // ---------------
  // SWIPE HANDLERS
  // ---------------
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

    // If it's final, we match immediately
    if (isFinalOption(choice)) {
      handleFinalMatch(choice);
    } else {
      // Not final => go deeper
      setHistory(prev => [...prev, { path: [...currentPath], index: currentIndex }]);
      setCurrentPath(prev => [...prev, choice]);
      setCurrentIndex(0);
    }

    // Give user reward for continuing
    setRewardPoints(prev => Math.min(prev + REWARD_CONTINUE, MAX_REWARD_POINTS));
  };

  const processDiscard = (choice) => {
    decrementWeight(choice);
    // Move to next card in the same layer
    setCurrentIndex(prev => prev + 1);

    // Give user a smaller reward
    setRewardPoints(prev => Math.min(prev + REWARD_DISCARD, MAX_REWARD_POINTS));
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

  // ---------------
  // GO BACK & RESHUFFLE
  // ---------------
  const goBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      const newHist = history.slice(0, -1);

      setCurrentPath(prev.path);
      setCurrentIndex(prev.index);
      setHistory(newHist);
    }
  };

  const reshuffleDeck = () => {
    setCurrentPath([]);
    setCurrentIndex(0);
    setFinalMatch(null);
    setRewardPoints(0);
  };

  // ---------------
  // WEIGHTS
  // ---------------
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

  // ---------------
  // RENDER
  // ---------------
  const currentLayerName =
    currentPath.length === 0
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

          {hasOptions && (
            <div style={{ marginTop: "1rem" }}>
              <button
                style={{ marginRight: "1rem" }}
                onClick={() => handleSwipe("left")}
              >
                Discard
              </button>
              <button onClick={() => handleSwipe("right")}>Continue</button>
            </div>
          )}

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
