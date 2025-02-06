import { useState, useEffect } from 'react';
import TinderCard from 'react-tinder-card';

/**
 * MASTER CATEGORIES OBJECT
 * 
 * We have fewer TOP-level categories, each with multiple SUB-layers,
 * then deeper THIRD-layers, and finally ARRAYS of final items.
 * 
 * Feel free to reorganize or add more layers if you like!
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

// ---------------------------------------
// GOOGLE PLACES IMAGE FETCH (for final items)
// ---------------------------------------
async function fetchGooglePlacesImage(placeName) {
  // Make sure you have NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your .env.local
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    // If no API key is found, fallback to a random placeholder
    return "https://source.unsplash.com/collection/190727/600x800";
  }

  try {
    // 1) Find the place by name
    const findUrl = new URL("https://maps.googleapis.com/maps/api/place/findplacefromtext/json");
    findUrl.searchParams.set("key", apiKey);
    findUrl.searchParams.set("input", placeName);
    findUrl.searchParams.set("inputtype", "textquery");
    // we request 'photos' field so we can get photo_reference
    findUrl.searchParams.set("fields", "photos,formatted_address,name,place_id");

    const findRes = await fetch(findUrl.toString());
    const findData = await findRes.json();
    if (
      !findData.candidates ||
      findData.candidates.length === 0 ||
      !findData.candidates[0].photos
    ) {
      // fallback
      return "https://source.unsplash.com/collection/190727/600x800";
    }

    const photoRef = findData.candidates[0].photos[0].photo_reference;
    // 2) Construct the photo URL (we don't actually fetch the binary; we let the <img> do that)
    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoRef}&key=${apiKey}`;

    return photoUrl;
  } catch (err) {
    console.error("Failed to fetch Google Places image:", err);
    // fallback
    return "https://source.unsplash.com/collection/190727/600x800";
  }
}

// ----------------------
// HELPER: Safely traverse nested data by "path" array
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
  // PATH + INDEX for multi-layer navigation
  const [currentPath, setCurrentPath] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // If final item is chosen
  const [finalMatch, setFinalMatch] = useState(null);

  // Keep a list of matched items, stored in memory (clears on refresh)
  const [matched, setMatched] = useState([]);

  // Show/hide the "My Matches" panel
  const [showMatches, setShowMatches] = useState(false);

  // Basic "Reward points" for the user
  const [rewardPoints, setRewardPoints] = useState(0);

  // Weighted preference system (like our "learning" for the code)
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

  // For "Go Back" functionality
  const [history, setHistory] = useState([]);

  // The image for the current card if it's final
  const [currentImageUrl, setCurrentImageUrl] = useState("");

  // GET CURRENT NODE
  const node = getNodeAtPath(categories, currentPath);

  // DETERMINE THIS LAYER'S OPTIONS
  let thisLayerOptions = [];
  if (currentPath.length === 0 && !node) {
    // Top-level
    thisLayerOptions = Object.keys(categories);
  } else if (node && typeof node === "object" && !Array.isArray(node)) {
    // Subcategories (object keys)
    thisLayerOptions = Object.keys(node);
  } else if (Array.isArray(node)) {
    // Final items
    thisLayerOptions = node;
  }

  // SORT OPTIONS BY DESCENDING WEIGHT
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

  // Check if we still have cards at this layer
  const hasOptions = sortedOptions.length > 0 && currentIndex < sortedOptions.length;

  // DETERMINE IF CHOICE IS FINAL
  const isFinalOption = (choice) => {
    if (Array.isArray(node)) {
      // We're already looking at a final array
      return true;
    }
    const nextNode = getNodeAtPath(categories, [...currentPath, choice]);
    if (!nextNode) return true;
    if (typeof nextNode === "object" && !Array.isArray(nextNode)) return false; // more sub-layers
    if (Array.isArray(nextNode)) return false; // final array is next
    return true;
  };

  // Whenever the "currentIndex" changes (or the user navigates deeper),
  // if the new item is final, fetch a real image from Google. Otherwise, fallback.
  useEffect(() => {
    if (!hasOptions) {
      setCurrentImageUrl("");
      return;
    }

    const currentChoice = sortedOptions[currentIndex];
    if (!currentChoice) {
      setCurrentImageUrl("");
      return;
    }

    // If it's final, fetch from Google Places. Otherwise, set a placeholder.
    if (isFinalOption(currentChoice)) {
      fetchGooglePlacesImage(currentChoice).then((url) => {
        setCurrentImageUrl(url || "");
      });
    } else {
      // Middle-layer category
      setCurrentImageUrl("https://source.unsplash.com/collection/190727/600x800");
    }
  }, [currentIndex, currentPath, hasOptions]);

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
    // Add to matched array in memory
    if (!matched.includes(choice)) {
      const updated = [...matched, choice];
      setMatched(updated);
    }
  };

  // GO BACK
  const goBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      const newHist = history.slice(0, -1);

      setCurrentPath(prev.path);
      setCurrentIndex(prev.index);
      setHistory(newHist);
      setFinalMatch(null); // clear final match if we had one
    }
  };

  // RESHUFFLE: Reset to top-level
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

  // Get a display string for the current layer
  const currentLayerName =
    currentPath.length === 0
      ? "Select a Category"
      : currentPath[currentPath.length - 1];

  // -----------------------
  // UI STYLING
  // -----------------------
  const appContainerStyle = {
    minHeight: "100vh",
    background: "#f0f0f0",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    position: "relative",
    fontFamily: "sans-serif",
    padding: "1rem"
  };

  const headerStyle = {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "0.5rem",
    alignItems: "center"
  };

  const buttonLinkStyle = {
    border: "none",
    background: "none",
    color: "#333",
    cursor: "pointer",
    fontSize: "1rem"
  };

  const cardContainerStyle = {
    position: "relative",
    width: "320px",
    height: "480px",
    marginTop: "1rem"
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
    background: "linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(255,255,255,0) 100%)",
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

  // -----------
  // SPLASH SCREEN FOR FINAL MATCH
  // -----------
  const splashStyle = {
    position: "fixed",
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

  // -----------
  // MATCHES SIDEBAR/MODAL
  // -----------
  const matchesModalStyle = {
    position: "fixed",
    top: 0,
    right: 0,
    width: "300px",
    height: "100%",
    backgroundColor: "#fff",
    boxShadow: "0 0 10px rgba(0,0,0,0.3)",
    zIndex: 998,
    padding: "1rem",
    overflowY: "auto"
  };

  return (
    <div style={appContainerStyle}>
      {/* HEADER */}
      <div style={headerStyle}>
        <button onClick={goBack} style={buttonLinkStyle}>
          ← Go Back
        </button>
        <h3 style={{ margin: 0 }}>{currentLayerName}</h3>
        <div>
          <button onClick={() => setShowMatches(true)} style={{ ...buttonLinkStyle, marginRight: "1rem" }}>
            View My Matches
          </button>
          <button onClick={reshuffleDeck} style={buttonLinkStyle}>
            Reshuffle
          </button>
        </div>
      </div>

      <p>Reward Points: {rewardPoints}</p>

      {/* If we found a final match, show a "Splash Screen" */}
      {finalMatch && (
        <div style={splashStyle}>
          <h1>Match Found!</h1>
          <h2>{finalMatch}</h2>
          <button
            onClick={() => setFinalMatch(null)}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "1rem",
              background: "#2ECC71",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              marginTop: "1rem"
            }}
          >
            Continue Browsing
          </button>
        </div>
      )}

      {/* Card Container */}
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
                backgroundImage: `url(${currentImageUrl})`
              }}
            >
              <div style={cardOverlayStyle}>
                <h2 style={{ margin: 0 }}>{sortedOptions[currentIndex]}</h2>
              </div>
            </div>
          </TinderCard>
        ) : (
          <p style={{ textAlign: "center", marginTop: "2rem" }}>
            No more options at this level.
          </p>
        )}
      </div>

      {/* Swipe Buttons */}
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

      {/* MATCHES SIDEBAR */}
      {showMatches && (
        <div style={matchesModalStyle}>
          <h2>My Matches</h2>
          {matched.length === 0 ? (
            <p>No matches yet.</p>
          ) : (
            matched.map((m, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom: "0.5rem",
                  padding: "0.5rem",
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
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              border: "none",
              background: "#333",
              color: "#fff",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
