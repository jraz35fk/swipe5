import { useState, useEffect } from 'react';
import TinderCard from 'react-tinder-card';

/** 
 * 1) BROADER TOP-LEVEL CATEGORIES: Eat, Drink, Party, Explore,
 *    Culture & History, Seasonal & Special, Shop & Leisure.
 *    With multiple sub-layers and final placeholders.
 */
const rawActivities = {
  "Eat": {
    "Seafood": [
      "Blue Crab & Old Bay",
      "Fresh Oysters",
      "Shrimp Po' Boys",
      "Lobster Rolls",
      "This could be your seafood house!"
    ],
    "Pizza & Italian": [
      "Classic Neapolitan Pizza",
      "Chicago Deep Dish",
      "NY-Style Pizza",
      "Fine Italian Dining",
      "This could be your pizza shop!"
    ],
    "Burgers & Sandwiches": [
      "Gourmet Burger Bars",
      "Local Deli Sandwiches",
      "BBQ Pulled Pork",
      "Philly Cheesesteaks",
      "This could be your burger joint!"
    ]
  },

  "Drink": {
    "Beer & Breweries": [
      "IPA Taprooms",
      "Seasonal Beer Gardens",
      "Microbreweries",
      "Stout & Porter Specialists",
      "This could be your brewery!"
    ],
    "Cocktails": [
      "Craft Cocktail Lounges",
      "Tiki Bars",
      "Martini Bars",
      "Mimosa Brunch Spots",
      "This could be your speakeasy!"
    ],
    "Coffee & Tea": [
      "Specialty Espresso Cafés",
      "Loose Leaf Tea Houses",
      "Bubble Tea Shops",
      "Afternoon Tea Service",
      "This could be your coffee shop!"
    ]
  },

  "Party": {
    "Dance Clubs": [
      "High-Energy EDM Clubs",
      "Retro 80s/90s Clubs",
      "Latin Dance Nights",
      "Hip-Hop & R&B Lounges",
      "This could be your dance floor!"
    ],
    "Night Bars & Live Music": [
      "Rock & Indie Bars",
      "Jazz & Blues Lounges",
      "Acoustic Café Sets",
      "Reggae & Dancehall Spots",
      "This could be your nightlife venue!"
    ]
  },

  "Explore": {
    "Outdoor Adventures": [
      "Hiking & Nature Trails",
      "Kayaking & Paddleboarding",
      "Overnight Camping Sites",
      "Mountain Biking",
      "This could be your outdoor retreat!"
    ],
    "Urban Sightseeing": [
      "Self-Guided Walking Tours",
      "Historic Neighborhood Strolls",
      "Skyline Overlooks",
      "Rooftop Views",
      "This could be your city tour!"
    ]
  },

  "Culture & History": {
    "Museums & Art": [
      "Art Museums & Galleries",
      "Interactive Science Centers",
      "Pop-Up Exhibitions",
      "Modern Art Collectives",
      "This could be your museum!"
    ],
    "Historic Sites": [
      "Forts & Battlefields",
      "Colonial-Era Mansions",
      "Heritage Walking Tours",
      "Civil War Landmarks",
      "This could be your historic estate!"
    ]
  },

  "Seasonal & Special": {
    "Spring-Summer": [
      "Flower Bloom Events",
      "Outdoor Concert Series",
      "Farmers’ Markets",
      "Seaside Carnivals",
      "This could be your summer fest!"
    ],
    "Fall-Winter": [
      "Leaf-Peeping Trails",
      "Holiday Light Shows",
      "Indoor Ice Skating",
      "Hot Chocolate Crawl",
      "This could be your winter wonderland!"
    ]
  },

  "Shop & Leisure": {
    "Markets & Bazaars": [
      "Sunday Flea Markets",
      "Antique Fairs",
      "Artisan Pop-Up Bazaars",
      "Local Craft Fairs",
      "This could be your market!"
    ],
    "Neighborhood Shopping": [
      "Main Street Boutiques",
      "Downtown Retail Spots",
      "Local Fashion Designers",
      "Vintage Thrift Emporiums",
      "This could be your shop!"
    ]
  }
};

/** 2) Flatten single-child sublayers to avoid lonely categories. */
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

// 3) Scoreboard for user
const MAX_REWARD_POINTS = 100;
const REWARD_DISCARD = 1;
const REWARD_CONTINUE = 10;

// 4) Code preference weighting
const PREFERENCE_INC = 5;
const PREFERENCE_DEC = 1;

/** 5) Some "trading card" frames for variety. */
const cardFrames = [
  {
    name: "Pokémon Classic",
    border: "4px solid #F8C859",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #7EC0EE 0%, #F8C859 100%)"
  },
  {
    name: "Team Baseball",
    border: "4px solid #C0392B",
    borderRadius: "0px",
    background: "linear-gradient(135deg, #BDC3C7 0%, #ECF0F1 100%)"
  },
  {
    name: "Retro 90s",
    border: "4px dashed #9B59B6",
    borderRadius: "20px",
    background: "linear-gradient(135deg, #D2B4DE 0%, #F5EEF8 100%)"
  },
  {
    name: "Neon Cyber",
    border: "3px solid #2ECC71",
    borderRadius: "8px",
    background: "radial-gradient(circle, #1ABC9C 0%, #16A085 100%)"
  },
  {
    name: "Galactic Foil",
    border: "5px double #8E44AD",
    borderRadius: "16px",
    background: "linear-gradient(120deg, #BEBADA 0%, #E7E7E7 100%)"
  },
  {
    name: "Futuristic Minimal",
    border: "2px solid #666",
    borderRadius: "5px",
    background: "linear-gradient(135deg, #f0f0f0 0%, #fafafa 100%)"
  }
];
function getRandomCardFrame() {
  const idx = Math.floor(Math.random() * cardFrames.length);
  return cardFrames[idx];
}

/** 6) Simple color map for top-level categories. */
const topLevelColors = {
  "Eat": "#E74C3C",
  "Drink": "#8E44AD",
  "Party": "#D35400",
  "Explore": "#27AE60",
  "Culture & History": "#2980B9",
  "Seasonal & Special": "#F39C12",
  "Shop & Leisure": "#16A085"
};

// Darken color
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

// Safe retrieval
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

/** 
 * MAIN COMPONENT
 */
export default function Home() {
  // PATH + INDEX
  const [currentPath, setCurrentPath] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // FINAL MATCH
  const [finalMatch, setFinalMatch] = useState(null);

  // MATCHES
  const [matched, setMatched] = useState([]);
  const [completed, setCompleted] = useState({});
  const [ratings, setRatings] = useState({});

  // SHOW MATCHES
  const [showMatches, setShowMatches] = useState(false);

  // USER scoreboard
  const [rewardPoints, setRewardPoints] = useState(0);

  // NAV HISTORY
  const [history, setHistory] = useState([]);

  // LOADING SPLASH
  const [isShuffling, setIsShuffling] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setIsShuffling(false), 2000);
    return () => clearTimeout(t);
  }, []);

  // "No more" overlay
  const [noMoreMessage, setNoMoreMessage] = useState(false);

  // CODE preference
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

  // Build this layer
  const node = getNodeAtPath(categories, currentPath);
  let thisLayerOptions = [];
  if (!node && currentPath.length === 0) {
    // top-level categories
    thisLayerOptions = Object.keys(categories);
  } else if (node && typeof node === "object" && !Array.isArray(node)) {
    thisLayerOptions = Object.keys(node);
  } else if (Array.isArray(node)) {
    thisLayerOptions = node;
  }

  // Sort by preference
  function sortByPreference(arr) {
    const copy = [...arr];
    copy.sort((a, b) => {
      const wA = weights[a] || 0;
      const wB = weights[b] || 0;
      return wB - wA; // higher weight first
    });
    return copy;
  }
  const sortedOptions = sortByPreference(thisLayerOptions);

  // Do we have more cards at this layer?
  const hasOptions = sortedOptions.length > 0 && currentIndex < sortedOptions.length;

  // Preference inc/dec
  const incPreference = (item) => {
    setWeights((prev) => ({ ...prev, [item]: (prev[item] || 0) + PREFERENCE_INC }));
  };
  const decPreference = (item) => {
    setWeights((prev) => ({ ...prev, [item]: (prev[item] || 0) - PREFERENCE_DEC }));
  };

  // GO BACK => Make it bigger
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

  // RESHUFFLE
  const reshuffleDeck = () => {
    setCurrentPath([]);
    setCurrentIndex(0);
    setFinalMatch(null);
    setRewardPoints(0);
    setHistory([]);
  };

  // FINAL MATCH
  const handleFinalMatch = (choice) => {
    setFinalMatch(choice);
    if (!matched.includes(choice)) {
      setMatched((prev) => [...prev, choice]);
    }
  };

  // Check if final
  function isFinalOption(path, choice) {
    const nextNode = getNodeAtPath(categories, [...path, choice]);
    if (!nextNode) return true;
    if (typeof nextNode === "object" && !Array.isArray(nextNode)) return false;
    if (Array.isArray(nextNode)) return false;
    return true;
  }

  // SWIPE
  const handleSwipe = (direction) => {
    if (!hasOptions) return;
    const choice = sortedOptions[currentIndex];
    if (direction === "right") {
      processContinue(choice);
    } else {
      processDiscard(choice);
    }
  };

  // CONTINUE => user +10, code +5
  const processContinue = (choice) => {
    setRewardPoints((prev) => Math.min(prev + REWARD_CONTINUE, MAX_REWARD_POINTS));
    incPreference(choice);

    if (isFinalOption(currentPath, choice)) {
      handleFinalMatch(choice);
    } else {
      // go deeper
      setHistory((prev) => [...prev, { path: [...currentPath], index: currentIndex }]);
      setCurrentPath((prev) => [...prev, choice]);
      setCurrentIndex(0);
    }
  };

  // DISCARD => user +1, code -1
  const processDiscard = (choice) => {
    setRewardPoints((prev) => Math.min(prev + REWARD_DISCARD, MAX_REWARD_POINTS));
    decPreference(choice);

    const nextIndex = currentIndex + 1;
    if (nextIndex < sortedOptions.length) {
      // we have more siblings
      setCurrentIndex(nextIndex);
    } else {
      // we've used up everything at this layer
      if (currentPath.length === 0) {
        // top-level => if user discards all top-level categories,
        // only then do we show "no more" overlay & reshuffle
        setNoMoreMessage(true);
        setTimeout(() => {
          setNoMoreMessage(false);
          reshuffleDeck();
        }, 2000);
      } else {
        // second layer or deeper => "never go back to top layer if categories are exhausted,
        // just keep recycling options indefinitely"
        setCurrentIndex(0); // reset index => infinite cycle
      }
    }
  };

  // Mark item as completed
  const markCompleted = (item) => {
    setCompleted((prev) => ({ ...prev, [item]: true }));
  };

  // Rate item
  const setItemRating = (item, stars) => {
    setRatings((prev) => ({ ...prev, [item]: stars }));
  };

  // LAYER NAME
  const currentLayerName = currentPath.length === 0
    ? "Shuffling..."
    : currentPath[currentPath.length - 1];

  // 7) UI STYLES: phone-screen layout
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

  // LOADING SPLASH
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

  // random card frame
  const [cardFrame, setCardFrame] = useState(cardFrames[0]);
  useEffect(() => {
    if (hasOptions) {
      setCardFrame(getRandomCardFrame());
    }
  }, [currentIndex, currentPath, hasOptions]);

  // also top-level color
  const cardColor = getColorForPath(currentPath);

  // combine frame style
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

  // bottom bar
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
      {/* final match overlay */}
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
        <h3 style={phoneScreenTitleStyle}>{currentLayerName}</h3>
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
              preventSwipe={["up", "down"]}
            >
              <div style={cardStyle}>
                <div style={cardTopStyle}>
                  {cardFrame.name} | {currentLayerName}
                </div>
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
