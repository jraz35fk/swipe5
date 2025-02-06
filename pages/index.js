"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

// Dynamically import react-tinder-card with SSR disabled
const TinderCard = dynamic(() => import("react-tinder-card"), { ssr: false });

/**
 * 1) ALL ACTIVITIES (#80–#168),
 *    with expanded "Bars & Live Music" under Party
 *    to include many breweries/distilleries as "bars."
 */
const rawActivities = {
  "Eat": {
    "Markets & Food Halls": [
      "#148 Lexington Market",
      "#149 Broadway Market",
      "#150 Cross Street Market",
      "#152 Belvedere Square Market",
      "#153 Baltimore Farmers’ Market & Bazaar"
    ],
    "Unique Restaurants": [
      "#144 Medieval Times Dinner & Tournament",
      "#162 Papermoon Diner"
    ]
  },

  "Drink": {
    "Breweries & Distilleries": [
      "#80 Sagamore Spirit Distillery",
      "#81 Union Craft Brewing",
      "#82 Checkerspot Brewing Co.",
      "#83 Diamondback Brewing Co.",
      "#84 Mobtown Brewing Co.",
      "#85 Heavy Seas Beer",
      "#86 The Brewer’s Art",
      "#87 Baltimore Spirits Company",
      "#88 Old Line Spirits",
      "#89 Charm City Meadworks",
      "#90 Guinness Open Gate Brewery",
      "#91 City Brew Tours"
    ]
  },

  "Party": {
    "Bars & Live Music": [
      // Duplicating breweries/distilleries as "bars" to show more
      "#80 Sagamore Spirit Distillery",
      "#81 Union Craft Brewing",
      "#82 Checkerspot Brewing Co.",
      "#83 Diamondback Brewing Co.",
      "#84 Mobtown Brewing Co.",
      "#85 Heavy Seas Beer",
      "#86 The Brewer’s Art",
      "#87 Baltimore Spirits Company",
      "#88 Old Line Spirits",
      "#89 Charm City Meadworks",
      "#90 Guinness Open Gate Brewery",
      "#161 The Horse You Came In On Saloon",
      "#131 Horseshoe Casino"
    ],
    "Other Nightlife": [
      "#130 Urban Axes",
      "#134 Baltimore Bike Party"
    ]
  },

  "Explore": {
    "Outdoor Adventures": [
      "#123 Inner Harbor Kayaking",
      "#124 Urban Pirates Cruise",
      "#125 Baltimore Waterfront Bike Route",
      "#134 Baltimore Bike Party",
      "#136 Route 40 Paintball",
      "#143 Lake Montebello"
    ],
    "Recreation & Sports": [
      "#126 Oriole Park at Camden Yards",
      "#127 M&T Bank Stadium",
      "#128 Ice Skating at Inner Harbor",
      "#129 Topgolf Baltimore",
      "#132 Earth Treks Timonium",
      "#133 Leakin Park Miniature Steam Trains",
      "#135 Duckpin Bowling"
    ],
    "Offbeat & Street Art": [
      "#158 Graffiti Alley",
      "#163 Self-Guided Mural Tour"
    ]
  },

  "Culture & History": {
    "Museums & Attractions": [
      "#137 National Aquarium",
      "#138 Port Discovery Children’s Museum",
      "#139 Maryland Science Center",
      "#140 Maryland Zoo",
      "#142 American Visionary Art Museum",
      "#159 Bromo Seltzer Arts Tower",
      "#160 Great Blacks in Wax Museum",
      "#164 BUZZ Lab"
    ],
    "Tours & Historic Places": [
      "#141 B&O Railroad Museum",
      "#165 Lexington Market Catacombs Tour",
      "#167 Baltimore Heritage Walk"
    ]
  },

  "Seasonal & Special": {
    "Spring-Summer": [
      "#92 Opening Day at Camden Yards",
      "#93 Charm City Bluegrass Festival",
      "#94 Maryland Film Festival",
      "#95 Flower Mart",
      "#96 Kinetic Sculpture Race",
      "#97 Preakness Stakes",
      "#98 Wine Village at Inner Harbor",
      "#99 HonFest",
      "#100 Baltimore Pride",
      "#101 AFRAM",
      "#102 Artscape",
      "#103 Fourth of July Fireworks",
      "#104 Baltimore Caribbean Carnival",
      "#105 Arts & Drafts at the Zoo",
      "#106 Waterfront Wellness",
      "#168 SoWeBo Arts & Music Festival"
    ],
    "Fall-Winter": [
      "#107 Baltimore Book Festival",
      "#108 Fell’s Point Fun Festival",
      "#109 Baltimore Running Festival",
      "#110 Defenders Day at Fort McHenry",
      "#111 Edgar Allan Poe Festival",
      "#112 Pigtown Festival",
      "#113 Great Halloween Lantern Parade",
      "#114 Fells Point Ghost Tours",
      "#115 Miracle on 34th Street",
      "#116 German Christmas Village",
      "#117 Lighting of the Washington Monument",
      "#118 Dollar or Free Museum Days",
      "#119 MLK Parade",
      "#120 Restaurant Week",
      "#121 Frozen Harbor Music Festival",
      "#122 Chinese New Year Celebrations"
    ]
  },

  "Shop & Leisure": {
    "Unique Shops": [
      "#145 The Bazaar",
      "#146 Atomic Books",
      "#147 The Sound Garden",
      "#151 Hampden’s “The Avenue”",
      "#154 The Book Thing",
      "#155 Fells Point Antiques & Shops",
      "#156 Village Thrift",
      "#157 Keepers Vintage"
    ],
    "Volunteer & Community": [
      "#166 BARCS Animal Shelter"
    ]
  }
};

/**
 * 2) Flatten single-child sublayers (no lonely categories).
 */
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

// 3) Scoreboard constants
const MAX_REWARD_POINTS = 100;
const REWARD_DISCARD = 1;
const REWARD_CONTINUE = 10;

// 4) Preference weighting
const PREFERENCE_INC = 5;
const PREFERENCE_DEC = 1;

/**
 * 5) Generic card frames—only used for styles now.
 *    We'll label cards by top-level category instead.
 */
const cardFrames = [
  {
    border: "4px solid #F8C859",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #7EC0EE 0%, #F8C859 100%)"
  },
  {
    border: "4px solid #C0392B",
    borderRadius: "0px",
    background: "linear-gradient(135deg, #BDC3C7 0%, #ECF0F1 100%)"
  },
  {
    border: "4px dashed #9B59B6",
    borderRadius: "20px",
    background: "linear-gradient(135deg, #D2B4DE 0%, #F5EEF8 100%)"
  },
  {
    border: "3px solid #2ECC71",
    borderRadius: "8px",
    background: "radial-gradient(circle, #1ABC9C 0%, #16A085 100%)"
  },
  {
    border: "5px double #8E44AD",
    borderRadius: "16px",
    background: "linear-gradient(120deg, #BEBADA 0%, #E7E7E7 100%)"
  },
  {
    border: "2px solid #666",
    borderRadius: "5px",
    background: "linear-gradient(135deg, #f0f0f0 0%, #fafafa 100%)"
  }
];

/** Randomly pick a frame index. */
function getRandomFrameIndex() {
  return Math.floor(Math.random() * cardFrames.length);
}

/**
 * 6) Simple color map for top-level categories
 *    No darkening on deeper layers—child shares parent's color.
 */
const topLevelColors = {
  "Eat": "#E74C3C",
  "Drink": "#8E44AD",
  "Party": "#D35400",
  "Explore": "#27AE60",
  "Culture & History": "#2980B9",
  "Seasonal & Special": "#F39C12",
  "Shop & Leisure": "#16A085"
};

function getTopLevelColor(path) {
  if (!path.length) return "#BDC3C7";
  const cat = path[0];
  return topLevelColors[cat] || "#BDC3C7";
}

// Safely walk object by path
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
  const [currentPath, setCurrentPath] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Final match
  const [finalMatch, setFinalMatch] = useState(null);

  // Collections
  const [matched, setMatched] = useState([]);
  const [completed, setCompleted] = useState({});
  const [ratings, setRatings] = useState({});

  // Show matches modal
  const [showMatches, setShowMatches] = useState(false);

  // Scoreboard
  const [rewardPoints, setRewardPoints] = useState(0);

  // Nav history
  const [history, setHistory] = useState([]);

  // Loading splash
  const [isShuffling, setIsShuffling] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setIsShuffling(false), 2000);
    return () => clearTimeout(t);
  }, []);

  // "No more" top-level
  const [noMoreMessage, setNoMoreMessage] = useState(false);

  // Preference weights (saved in localStorage)
  const [weights, setWeights] = useState({});
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("categoryWeights");
      if (stored) {
        setWeights(JSON.parse(stored));
      }
    }
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("categoryWeights", JSON.stringify(weights));
    }
  }, [weights]);

  // Build this layer's array
  const node = getNodeAtPath(categories, currentPath);
  let thisLayerOptions = [];
  if (!node && currentPath.length === 0) {
    // top-level
    thisLayerOptions = Object.keys(categories);
  } else if (node && typeof node === "object" && !Array.isArray(node)) {
    // sub-layers
    thisLayerOptions = Object.keys(node);
  } else if (Array.isArray(node)) {
    // final matches
    thisLayerOptions = node;
  }

  // Sort by preference
  function sortByPreference(arr) {
    const copy = [...arr];
    copy.sort((a, b) => {
      const wA = weights[a] || 0;
      const wB = weights[b] || 0;
      return wB - wA;
    });
    return copy;
  }
  const sortedOptions = sortByPreference(thisLayerOptions);
  const hasOptions = sortedOptions.length > 0 && currentIndex < sortedOptions.length;

  // Inc/dec preference
  const incPreference = (item) => {
    setWeights((prev) => ({ ...prev, [item]: (prev[item] || 0) + PREFERENCE_INC }));
  };
  const decPreference = (item) => {
    setWeights((prev) => ({ ...prev, [item]: (prev[item] || 0) - PREFERENCE_DEC }));
  };

  // Go back
  const goBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory(history.slice(0, -1));
      setCurrentPath(prev.path);
      setCurrentIndex(prev.index);
      setFinalMatch(null);
    }
  };

  // Reshuffle
  const reshuffleDeck = () => {
    setCurrentPath([]);
    setCurrentIndex(0);
    setFinalMatch(null);
    setRewardPoints(0);
    setHistory([]);
  };

  // Final match
  const handleFinalMatch = (choice) => {
    setFinalMatch(choice);
    if (!matched.includes(choice)) {
      setMatched((prev) => [...prev, choice]);
    }
  };

  // Check final or sub-later
  function isFinalOption(path, choice) {
    const nextNode = getNodeAtPath(categories, [...path, choice]);
    if (!nextNode) return true;
    if (typeof nextNode === "object" && !Array.isArray(nextNode)) return false;
    if (Array.isArray(nextNode)) return false;
    return true;
  }

  // Swipe
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

  const processDiscard = (choice) => {
    setRewardPoints((prev) => Math.min(prev + REWARD_DISCARD, MAX_REWARD_POINTS));
    decPreference(choice);
    const nextIndex = currentIndex + 1;
    if (nextIndex < sortedOptions.length) {
      setCurrentIndex(nextIndex);
    } else {
      // no more at this level
      if (currentPath.length === 0) {
        // top-level => user discards them all
        setNoMoreMessage(true);
        setTimeout(() => {
          setNoMoreMessage(false);
          reshuffleDeck();
        }, 2000);
      } else {
        // deeper => infinite cycle
        setCurrentIndex(0);
      }
    }
  };

  // Completed / rating
  const markCompleted = (item) => {
    setCompleted((prev) => ({ ...prev, [item]: true }));
  };
  const setItemRating = (item, stars) => {
    setRatings((prev) => ({ ...prev, [item]: stars }));
  };

  // Titles
  const topCategory = currentPath[0] || "Shuffling...";
  const currentLayerName = currentPath.length
    ? currentPath[currentPath.length - 1]
    : "Shuffling...";

  // Random frame styling
  const [cardFrameIndex, setCardFrameIndex] = useState(0);
  useEffect(() => {
    if (hasOptions) {
      setCardFrameIndex(getRandomFrameIndex());
    }
  }, [currentIndex, currentPath, hasOptions]);
  const cardFrame = cardFrames[cardFrameIndex];
  const cardColor = getTopLevelColor(currentPath);

  // Styles
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
      <div style={{ ...appContainerStyle, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <h2>Shuffling Baltimore...</h2>
      </div>
    );
  }

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

  const headerStyle = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "0.5rem",
    borderBottom: "1px solid #ccc",
    position: "relative"
  };
  const phoneScreenTitleStyle = { margin: 0, fontWeight: "bold" };
  const goBackButtonStyle = {
    position: "absolute",
    left: "1rem",
    border: "2px solid #333",
    background: "#eee",
    fontSize: "1rem",
    color: "#333",
    cursor: "pointer",
    padding: "0.3rem 0.7rem",
    borderRadius: "8px"
  };
  const matchesButtonStyle = {
    position: "absolute",
    right: "1rem",
    border: "2px solid #333",
    background: "#eee",
    fontSize: "1rem",
    color: "#333",
    cursor: "pointer",
    padding: "0.3rem 0.7rem",
    borderRadius: "8px"
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
    display: "flex",
    flexDirection: "column",
    position: "relative",
    overflow: "hidden",
    justifyContent: "space-between",
    ...cardFrame
  };
  const cardTopStyle = {
    padding: "0.5rem",
    textAlign: "center",
    fontWeight: "bold",
    color: "#fff",
    backgroundColor: "#00000044"
  };
  const cardTitleStyle = {
    color: cardColor,
    backgroundColor: "#ffffffcc",
    borderRadius: "8px",
    padding: "0.5rem 1rem"
  };

  const bottomBarStyle = {
    borderTop: "1px solid #ccc",
    padding: "0.5rem",
    display: "flex",
    justifyContent: "center",
    gap: "2rem"
  };
  const circleButtonStyle = (bgColor) => ({
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    background: bgColor,
    color: "#fff",
    border: "none",
    fontSize: "1.4rem",
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
          No more top-level options! Reshuffling...
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
                      onClick={() => setRatings((prev) => ({ ...prev, [item]: star }))}
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

      {/* HEADER */}
      <div style={headerStyle}>
        <button onClick={goBack} style={goBackButtonStyle}>
          ← Back
        </button>
        <h3 style={phoneScreenTitleStyle}>
          {topCategory} | {currentLayerName}
        </h3>
        <button onClick={() => setShowMatches(true)} style={matchesButtonStyle}>
          ♡ Matches
        </button>
      </div>

      <div style={{ textAlign: "center", padding: "0.5rem" }}>
        <strong>Points:</strong> {rewardPoints}
      </div>

      {/* MAIN CARD */}
      <div style={mainContentStyle}>
        <div style={cardContainerStyle}>
          {hasOptions ? (
            <TinderCard
              key={sortedOptions[currentIndex]}
              onSwipe={(dir) => handleSwipe(dir)}
              preventSwipe={["up", "down"]} // left/right only
            >
              <div style={cardStyle}>
                {/* top bar => top-level category only */}
                <div style={cardTopStyle}>{topCategory} | {currentLayerName}</div>
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <h2 style={cardTitleStyle}>{sortedOptions[currentIndex]}</h2>
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
