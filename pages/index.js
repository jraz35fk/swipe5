import { useState, useEffect } from 'react';
import TinderCard from 'react-tinder-card';

/**
 * BROADER TOP-LEVEL CATEGORIES
 * Each has multiple child layers so the user always gets several branches.
 * We also ensure that final arrays have multiple items,
 * and each subcategory has at least 2-3 sub-layers or final arrays.
 */
const rawActivities = {
  "Taste": {
    "Eat": {
      "Make at Home": [
        "Recipe Kits from Farmer’s Market",
        "Meal Prep Subscription Services",
        "Learn a New Cuisine (Online Class)"
      ],
      "Carry Out": [
        "Neighborhood Takeout Joints",
        "Food Trucks Collective",
        "Late-Night Carryout Spots"
      ],
      "Dine In": [
        "Local Restaurants (Full Service)",
        "Casual Cafés & Bistros",
        "Upscale Fine Dining"
      ],
      "Family Style": [
        "Buffet-Style Restaurants",
        "Group-Friendly Hibachi Spots",
        "Large Table Reservations"
      ]
    },
    "Drink": {
      "Cocktails": [
        "Craft Cocktail Lounges",
        "Tiki Bars",
        "Speakeasy-Style Mixology"
      ],
      "Breweries": [
        "Microbreweries & Taprooms",
        "Seasonal Beer Gardens",
        "Brewery Tours & Tastings"
      ],
      "Coffee & Tea": [
        "Specialty Coffee Shops",
        "Tea Houses & Afternoon Tea",
        "Local Roasteries"
      ],
      "Wine & Distilleries": [
        "Urban Wineries",
        "Distillery Tours (Vodka, Gin)",
        "Wine Bars"
      ]
    }
  },

  "Experience": {
    "Nightlife": {
      "Dance Clubs": [
        "High-Energy EDM Clubs",
        "Retro 80s/90s Night Clubs",
        "Latin Dance Nights"
      ],
      "Live Music Pubs": [
        "Rock & Indie Bars",
        "Jazz & Blues Lounges",
        "Acoustic Singer-Songwriter Cafés"
      ],
      "Comedy & Improv": [
        "Stand-Up Comedy Clubs",
        "Improv Theater Workshops",
        "Open Mic Comedy Nights"
      ]
    },
    "Festivals": [
      "Music Festivals (Local Scene)",
      "Street Fairs & Block Parties",
      "Food & Drink Festivals"
    ],
    "Sports & Games": [
      "Bowling Alleys",
      "Arcade Bars & Retro Gaming",
      "Pool Halls & Billiards"
    ]
  },

  "Explore": {
    "Outdoor Adventures": [
      "Hiking & Nature Trails",
      "Kayaking & Paddleboarding",
      "Overnight Camping Nearby"
    ],
    "Urban Sightseeing": [
      "Self-Guided Walking Tours",
      "Historic Neighborhood Explorations",
      "City Skyline Views"
    ],
    "Waterfront Activities": [
      "Harbor Cruises",
      "Stand-Up Paddle Yoga",
      "Boat Rentals"
    ],
    "Offbeat & Quirky": [
      "Graffiti Alleys & Street Art",
      "Weird Museums & Odd Exhibits",
      "Local Ghost Tours"
    ]
  },

  "Culture & History": {
    "Museums & Art": [
      "Art Museums & Galleries",
      "Interactive Science Centers",
      "Pop-Up Exhibitions"
    ],
    "Historic Sites": [
      "Forts & Battlefields",
      "Colonial-Era Mansions",
      "Heritage Walking Tours"
    ],
    "Architectural Gems": [
      "Cathedrals & Basilicas",
      "Beaux-Arts Libraries",
      "Victorian Row Houses"
    ],
    "Local Heritage & Tours": [
      "African-American Heritage Trails",
      "Famous Author Birthplace Tours",
      "Ethnic Neighborhood Heritage"
    ]
  },

  "Seasonal & Special": {
    "Spring-Summer": [
      "Flower Bloom Events",
      "Outdoor Concert Series",
      "Seasonal Farmers’ Markets"
    ],
    "Fall-Winter": [
      "Leaf-Peeping Day Trips",
      "Holiday Light Shows",
      "Indoor Ice Skating Rinks"
    ],
    "Holiday Highlights": [
      "Halloween Haunted Houses",
      "Christmas Village & Markets",
      "New Year’s Fireworks at the Harbor"
    ],
    "Annual Traditions": [
      "City Anniversary Celebrations",
      "Marathon & Running Festivals",
      "Local Food Truck Rallies"
    ]
  },

  "Shop & Leisure": {
    "Markets & Bazaars": [
      "Sunday Flea Markets",
      "Antique Fairs",
      "Artisan Pop-Up Bazaars"
    ],
    "Neighborhood Shopping": [
      "Quirky Main Street Boutiques",
      "Upscale Downtown Retail",
      "Local Fashion Designer Shops"
    ],
    "Boutiques & Oddities": [
      "Curio & Oddity Shops",
      "Vintage Thrift Emporiums",
      "Unique Handmade Jewelry Stores"
    ],
    "Handmade & Crafts": [
      "Pottery Studios & Workshops",
      "DIY Woodworking Co-Ops",
      "Local Artist Collectives"
    ]
  }
};

/** Flatten single-child sublayers to avoid categories with only one child. */
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

// USER scoreboard points
const MAX_REWARD_POINTS = 100;
const REWARD_DISCARD = 1;
const REWARD_CONTINUE = 10;

// CODE preference
const PREFERENCE_INC = 5;
const PREFERENCE_DEC = 1;

// Color map for top-level
const topLevelColors = {
  "Taste": "#E74C3C",
  "Experience": "#8E44AD",
  "Explore": "#27AE60",
  "Culture & History": "#2980B9",
  "Seasonal & Special": "#D35400",
  "Shop & Leisure": "#F39C12"
};

// Darken color helper
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

function getColorForPath(path) {
  if (path.length === 0) return "#BDC3C7";
  const topCat = path[0];
  const base = topLevelColors[topCat] || "#7f8c8d";
  const depth = path.length - 1;
  return darkenColor(base, depth * 0.1);
}

// Retrieve node by path
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
  // path + index
  const [currentPath, setCurrentPath] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // final match
  const [finalMatch, setFinalMatch] = useState(null);

  // matched items (collection)
  const [matched, setMatched] = useState([]);
  const [completed, setCompleted] = useState({});
  const [ratings, setRatings] = useState({});

  // show matches panel?
  const [showMatches, setShowMatches] = useState(false);

  // user scoreboard
  const [rewardPoints, setRewardPoints] = useState(0);

  // history stack
  const [history, setHistory] = useState([]);

  // loading splash
  const [isShuffling, setIsShuffling] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setIsShuffling(false), 2000);
    return () => clearTimeout(t);
  }, []);

  // no more overlay
  const [noMoreMessage, setNoMoreMessage] = useState(false);

  // code preference weights
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

  // build this layer
  const node = getNodeAtPath(categories, currentPath);
  let thisLayerOptions = [];
  if (!node && currentPath.length === 0) {
    thisLayerOptions = Object.keys(categories); 
  } else if (node && typeof node === "object" && !Array.isArray(node)) {
    thisLayerOptions = Object.keys(node);
  } else if (Array.isArray(node)) {
    thisLayerOptions = node;
  }

  // sort by preference
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

  const hasOptions = sortedOptions.length > 0 && currentIndex < sortedOptions.length;

  // preference up/down
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

  // goBack
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

  // reshuffle
  const reshuffleDeck = () => {
    setCurrentPath([]);
    setCurrentIndex(0);
    setFinalMatch(null);
    setRewardPoints(0);
    setHistory([]);
  };

  // final match
  const handleFinalMatch = (choice) => {
    setFinalMatch(choice);
    if (!matched.includes(choice)) {
      setMatched((prev) => [...prev, choice]);
    }
  };

  function isFinalOption(path, choice) {
    const nextNode = getNodeAtPath(categories, [...path, choice]);
    if (!nextNode) return true;
    if (typeof nextNode === "object" && !Array.isArray(nextNode)) return false;
    if (Array.isArray(nextNode)) return false;
    return true;
  }

  // handle swipe
  const handleSwipe = (direction) => {
    if (!hasOptions) return;
    const choice = sortedOptions[currentIndex];
    if (direction === "right") {
      processContinue(choice);
    } else {
      processDiscard(choice);
    }
  };

  // continue => user +10, code +5
  const processContinue = (choice) => {
    setRewardPoints((prev) => Math.min(prev + REWARD_CONTINUE, MAX_REWARD_POINTS));
    incPreference(choice);

    if (isFinalOption(currentPath, choice)) {
      handleFinalMatch(choice);
    } else {
      setHistory((prev) => [...prev, { path: [...currentPath], index: currentIndex }]);
      setCurrentPath((prev) => [...prev, choice]);
      setCurrentIndex(0);
    }
  };

  // discard => user +1, code -1
  const processDiscard = (choice) => {
    setRewardPoints((prev) => Math.min(prev + REWARD_DISCARD, MAX_REWARD_POINTS));
    decPreference(choice);

    const nextIndex = currentIndex + 1;
    if (nextIndex < sortedOptions.length) {
      setCurrentIndex(nextIndex);
    } else {
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

  // mark completed
  const markCompleted = (item) => {
    setCompleted((prev) => ({ ...prev, [item]: true }));
  };

  // rating
  const setItemRating = (item, stars) => {
    setRatings((prev) => ({ ...prev, [item]: stars }));
  };

  // layer name
  const currentLayerName =
    currentPath.length === 0 ? "Shuffling..." : currentPath[currentPath.length - 1];

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

  // loading splash
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

  // overlays
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
    background: "#fafafa",
    zIndex: 997,
    display: "flex",
    flexDirection: "column",
    padding: "1rem"
  };

  // header
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

  const cardContainerStyle = {
    width: "300px",
    height: "420px",
    position: "relative"
  };

  // "Pokémon card" style
  const cardColor = getColorForPath(currentPath);

  const cardStyle = {
    width: "100%",
    height: "100%",
    borderRadius: "12px",
    border: "4px solid #333",
    backgroundColor: "#fff",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    position: "relative"
  };

  const cardTopStyle = {
    background: `linear-gradient(90deg, ${cardColor} 0%, #fff 100%)`,
    padding: "0.5rem",
    textAlign: "center",
    color: "#fff",
    fontWeight: "bold"
  };

  const cardBodyStyle = {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  };

  // bottom bar
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

  const starStyle = {
    cursor: "pointer",
    marginRight: "0.25rem"
  };

  return (
    <div style={appContainerStyle}>
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

      {noMoreMessage && (
        <div style={noMoreOverlay}>
          No more options at this layer! Going back one level…
        </div>
      )}

      {showMatches && (
        <div style={matchesModalStyle}>
          <h2>My Collection</h2>
          <p style={{ color: "#666" }}>
            (Matched cards. Mark them as completed or rate them!)
          </p>
          {matched.length === 0 ? (
            <p>No matches yet.</p>
          ) : (
            matched.map((item, i) => (
              <div
                key={i}
                style={{
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  padding: "0.5rem",
                  marginBottom: "1rem",
                  background: "#fff"
                }}
              >
                <strong>{item}</strong>
                <div style={{ marginTop: "0.25rem" }}>
                  Completed? {completed[item] ? "Yes" : "No"}{" "}
                  {!completed[item] && (
                    <button
                      style={{
                        marginLeft: "0.5rem",
                        background: "#27AE60",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        padding: "0.25rem 0.5rem"
                      }}
                      onClick={() => setCompleted((prev) => ({ ...prev, [item]: true }))}
                    >
                      Mark Completed
                    </button>
                  )}
                </div>
                <div style={{ marginTop: "0.5rem" }}>
                  Rate:
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      style={{
                        ...starStyle,
                        color: ratings[item] >= star ? "#f1c40f" : "#ccc"
                      }}
                      onClick={() =>
                        setRatings((prev) => ({ ...prev, [item]: star }))
                      }
                    >
                      ★
                    </span>
                  ))}
                  {ratings[item] ? ` (${ratings[item]} stars)` : ""}
                </div>
              </div>
            ))
          )}

          <div style={{ marginTop: "auto", display: "flex", gap: "1rem" }}>
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

      {/* Header */}
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

      <div style={{ textAlign: "center", padding: "0.5rem" }}>
        <strong>Points:</strong> {rewardPoints}
      </div>

      {/* Card Area */}
      <div style={mainContentStyle}>
        <div style={cardContainerStyle}>
          {hasOptions ? (
            <TinderCard
              key={sortedOptions[currentIndex]}
              onSwipe={(dir) => handleSwipe(dir)}
              preventSwipe={["up", "down"]}
            >
              <div style={cardStyle}>
                <div style={cardTopStyle}>{currentLayerName}</div>
                <div style={cardBodyStyle}>
                  <h2
                    style={{
                      backgroundColor: cardColor,
                      color: "#fff",
                      padding: "0.5rem 1rem",
                      borderRadius: "8px"
                    }}
                  >
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

      {/* Bottom bar */}
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
