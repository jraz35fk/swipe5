"use client"; // Important for Next 13 client components

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

// Dynamically import react-tinder-card with SSR disabled
const TinderCard = dynamic(() => import("react-tinder-card"), { ssr: false });

/**
 * 1) REAL ACTIVITIES DATA
 *    Organized under 7 top-level categories: Eat, Drink, Party, Explore,
 *    Culture & History, Seasonal & Special, Shop & Leisure.
 *    Every item (#80–#168) is a final match card. 
 *
 *    The purpose: get all items in front of the user
 *    as quickly and efficiently as possible.
 */

const rawActivities = {
  "Eat": {
    "Markets & Food Halls": [
      "#148 Lexington Market – Historic market with fresh seafood and local eats",
      "#149 Broadway Market – Revamped Fells Point food hall with seafood vendors",
      "#150 Cross Street Market – Trendy indoor market in Federal Hill",
      "#152 Belvedere Square Market – Upscale food hall with local gourmet shops",
      "#153 Baltimore Farmers’ Market & Bazaar – Sunday market with produce & artisan goods"
    ],
    "Unique Restaurants": [
      "#144 Medieval Times Dinner & Tournament – Jousting & feast at Arundel Mills",
      "#162 Papermoon Diner – Toy-filled diner with amazing milkshakes"
    ]
  },

  "Drink": {
    "Breweries & Distilleries": [
      "#80 Sagamore Spirit Distillery – Award-winning rye whiskey tours",
      "#81 Union Craft Brewing – Popular brewery & beer garden in Hampden",
      "#82 Checkerspot Brewing Co. – Female-owned brewery near M&T Bank Stadium",
      "#83 Diamondback Brewing Co. – Brewery with wood-fired pizza in Locust Point",
      "#84 Mobtown Brewing Co. – First brewery in modern Canton",
      "#85 Heavy Seas Beer – Nautical-themed brewery known for Loose Cannon IPA",
      "#86 The Brewer’s Art – Brewpub in a historic townhouse, famous for Resurrection Ale",
      "#87 Baltimore Spirits Company – Distillery known for Shot Tower Gin",
      "#88 Old Line Spirits – Veteran-owned whiskey & rum distillery",
      "#89 Charm City Meadworks – Baltimore’s only meadery",
      "#90 Guinness Open Gate Brewery – U.S. Guinness brewery in Halethorpe",
      "#91 City Brew Tours – Guided brewery-hopping tours"
    ]
  },

  "Party": {
    "Night Bars & Live Music": [
      "#131 Horseshoe Casino – Large casino with table games, slots, & dining",
      "#161 The Horse You Came In On Saloon – America’s oldest continually operating bar"
    ],
    "Other Nightlife": [
      "#130 Urban Axes – Axe-throwing bar for group fun",
      "#134 Baltimore Bike Party – Massive monthly themed group bike ride"
    ]
  },

  "Explore": {
    "Outdoor Adventures": [
      "#123 Inner Harbor Kayaking – Paddle for unique city views",
      "#124 Urban Pirates Cruise – Family & adult-only pirate-themed rides",
      "#125 Baltimore Waterfront Bike Route – Scenic cycling along the harbor",
      "#134 Baltimore Bike Party – (also nightlife, but an outdoor group ride!)",
      "#136 Route 40 Paintball – Outdoor paintball fields in White Marsh",
      "#143 Lake Montebello – Scenic park with playgrounds & nature trails"
    ],
    "Recreation & Sports": [
      "#126 Oriole Park at Camden Yards – Iconic MLB stadium",
      "#127 M&T Bank Stadium – Home of the Ravens",
      "#128 Ice Skating at Inner Harbor – Seasonal rink with skyline views",
      "#129 Topgolf Baltimore – High-tech driving range with food & drinks",
      "#132 Earth Treks Timonium – Rock climbing gym for all skill levels",
      "#133 Leakin Park Miniature Steam Trains – Free rides on second Sundays",
      "#135 Duckpin Bowling – Classic Baltimore bowling variation"
    ],
    "Offbeat & Street Art": [
      "#158 Graffiti Alley – Baltimore’s only legal graffiti zone, full of street art",
      "#163 Self-Guided Mural Tour – Hunt for Baltimore’s best street art"
    ]
  },

  "Culture & History": {
    "Museums & Attractions": [
      "#137 National Aquarium – World-class aquatic exhibits",
      "#138 Port Discovery Children’s Museum – Interactive fun for young kids",
      "#139 Maryland Science Center – Hands-on exhibits & planetarium",
      "#140 Maryland Zoo – African animals & penguin habitat",
      "#142 American Visionary Art Museum – Quirky, colorful exhibits",
      "#159 Bromo Seltzer Arts Tower – Climb inside a working clock tower",
      "#160 Great Blacks in Wax Museum – Life-size wax figures of Black history",
      "#164 BUZZ Lab – DIY biohacking lab for science enthusiasts"
    ],
    "Tours & Historic Places": [
      "#141 B&O Railroad Museum – Historic trains & kids’ ride",
      "#165 Lexington Market Catacombs Tour – Underground burial sites",
      "#167 Baltimore Heritage Walk – Self-guided walking tour of historic sites"
    ]
  },

  "Seasonal & Special": {
    "Spring-Summer": [
      "#92 Opening Day at Camden Yards – Orioles’ first home game celebration",
      "#93 Charm City Bluegrass Festival – Folk & bluegrass music fest",
      "#94 Maryland Film Festival – Annual indie film fest in Station North",
      "#95 Flower Mart – Spring festival with lemon sticks & garden vendors",
      "#96 Kinetic Sculpture Race – Wacky amphibious human-powered race",
      "#97 Preakness Stakes – Maryland’s biggest horse race",
      "#98 Wine Village at Inner Harbor – Outdoor European-style wine market",
      "#99 HonFest – Hampden’s iconic festival celebrating “Bawlmer” culture",
      "#100 Baltimore Pride – LGBTQ+ parade & festival in Mount Vernon",
      "#101 AFRAM – Major African American heritage festival",
      "#102 Artscape – America’s largest free arts festival",
      "#103 Fourth of July Fireworks – Over the Inner Harbor",
      "#104 Baltimore Caribbean Carnival – Parade & festival of Caribbean culture",
      "#105 Arts & Drafts at the Zoo – Craft beer fest at Maryland Zoo",
      "#106 Waterfront Wellness – Free outdoor fitness classes",
      "#168 SoWeBo Arts & Music Festival – Neighborhood festival of local art & music"
    ],
    "Fall-Winter": [
      "#107 Baltimore Book Festival – Literary event with signings",
      "#108 Fell’s Point Fun Festival – Street fest with music & vendors",
      "#109 Baltimore Running Festival – Marathon & running events",
      "#110 Defenders Day at Fort McHenry – Reenactments & fireworks",
      "#111 Edgar Allan Poe Festival – Celebrating Poe’s legacy",
      "#112 Pigtown Festival – Quirky fest with pig races & local food",
      "#113 Great Halloween Lantern Parade – Nighttime lantern parade",
      "#114 Fells Point Ghost Tours – Spooky tours of haunted pubs",
      "#115 Miracle on 34th Street – Famous Christmas lights in Hampden",
      "#116 German Christmas Village – Traditional European holiday market",
      "#117 Lighting of the Washington Monument – Holiday kickoff & fireworks",
      "#118 Dollar or Free Museum Days – Winter discounts at top attractions",
      "#119 MLK Parade – Annual Martin Luther King Jr. Day march",
      "#120 Restaurant Week – Special prix-fixe menus across the city",
      "#121 Frozen Harbor Music Festival – Multi-venue winter music fest",
      "#122 Chinese New Year Celebrations – Lion dances & festivities"
    ]
  },

  "Shop & Leisure": {
    "Unique Shops": [
      "#145 The Bazaar – Oddities, taxidermy & antique medical tools",
      "#146 Atomic Books – Indie bookstore & mail stop for John Waters",
      "#147 The Sound Garden – Baltimore’s best record store",
      "#151 Hampden’s “The Avenue” – Quirky local boutiques & vintage shops",
      "#154 The Book Thing – Free book warehouse (everything is $0)",
      "#155 Fells Point Antiques & Shops – Vintage & unique boutiques",
      "#156 Village Thrift – Bargain second-hand store",
      "#157 Keepers Vintage – Curated retro fashion in Mount Vernon"
    ],
    "Volunteer & Community": [
      "#166 BARCS Animal Shelter – Walk dogs or help with adoptions"
    ]
  }
};

/**
 * 2) Flatten single-child sublayers to avoid lonely categories.
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

// 4) Code preference weighting
const PREFERENCE_INC = 5;
const PREFERENCE_DEC = 1;

/**
 * 5) Trading card frames (neutral theme).
 *    We'll pick one randomly on the client to avoid SSR mismatch.
 */
const cardFrames = [
  {
    name: "Vibrant Stripes",
    border: "4px solid #F8C859",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #7EC0EE 0%, #F8C859 100%)"
  },
  {
    name: "Bold Red",
    border: "4px solid #C0392B",
    borderRadius: "0px",
    background: "linear-gradient(135deg, #BDC3C7 0%, #ECF0F1 100%)"
  },
  {
    name: "Retro Purple",
    border: "4px dashed #9B59B6",
    borderRadius: "20px",
    background: "linear-gradient(135deg, #D2B4DE 0%, #F5EEF8 100%)"
  },
  {
    name: "Neon Green",
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
    name: "Minimal Gray",
    border: "2px solid #666",
    borderRadius: "5px",
    background: "linear-gradient(135deg, #f0f0f0 0%, #fafafa 100%)"
  }
];

function getRandomFrameIndex() {
  return Math.floor(Math.random() * cardFrames.length);
}

/**
 * 6) Simple color map for top-level categories
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

// Safely walk object for next node
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
  // Path + index in the current array
  const [currentPath, setCurrentPath] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Final match (leaf choice)
  const [finalMatch, setFinalMatch] = useState(null);

  // Matched items (the user "collected" these)
  const [matched, setMatched] = useState([]);
  const [completed, setCompleted] = useState({});
  const [ratings, setRatings] = useState({});

  // Show matches modal
  const [showMatches, setShowMatches] = useState(false);

  // Scoreboard
  const [rewardPoints, setRewardPoints] = useState(0);

  // Nav history (to go back)
  const [history, setHistory] = useState([]);

  // Loading splash
  const [isShuffling, setIsShuffling] = useState(true);
  useEffect(() => {
    // Fake 2s loading
    const t = setTimeout(() => setIsShuffling(false), 2000);
    return () => clearTimeout(t);
  }, []);

  // "No more" top-level overlay
  const [noMoreMessage, setNoMoreMessage] = useState(false);

  // Category preference weighting (loaded from localStorage)
  const [weights, setWeights] = useState({});

  useEffect(() => {
    // Load from localStorage after mount
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("categoryWeights");
      if (stored) {
        setWeights(JSON.parse(stored));
      }
    }
  }, []);

  useEffect(() => {
    // Save whenever weights changes
    if (typeof window !== "undefined") {
      localStorage.setItem("categoryWeights", JSON.stringify(weights));
    }
  }, [weights]);

  // Build the array of options for this layer
  const node = getNodeAtPath(categories, currentPath);
  let thisLayerOptions = [];

  if (!node && currentPath.length === 0) {
    // top-level
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
  const hasOptions = sortedOptions.length > 0 && currentIndex < sortedOptions.length;

  // Increase or decrease preference
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
      const newHist = history.slice(0, -1);
      setCurrentPath(prev.path);
      setCurrentIndex(prev.index);
      setHistory(newHist);
      setFinalMatch(null);
    }
  };

  // Reshuffle everything
  const reshuffleDeck = () => {
    setCurrentPath([]);
    setCurrentIndex(0);
    setFinalMatch(null);
    setRewardPoints(0);
    setHistory([]);
  };

  // Final match found
  const handleFinalMatch = (choice) => {
    setFinalMatch(choice);
    if (!matched.includes(choice)) {
      setMatched((prev) => [...prev, choice]);
    }
  };

  // Check if a choice is "final" (no deeper branches)
  function isFinalOption(path, choice) {
    const nextNode = getNodeAtPath(categories, [...path, choice]);
    if (!nextNode) return true;
    if (typeof nextNode === "object" && !Array.isArray(nextNode)) return false;
    if (Array.isArray(nextNode)) return false;
    return true;
  }

  // Handle swipes
  const handleSwipe = (direction) => {
    if (!hasOptions) return;
    const choice = sortedOptions[currentIndex];
    if (direction === "right") {
      processContinue(choice);
    } else {
      processDiscard(choice);
    }
  };

  // "Like"/Continue => user +10, inc pref
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

  // "Nope"/Discard => user +1, dec pref
  const processDiscard = (choice) => {
    setRewardPoints((prev) => Math.min(prev + REWARD_DISCARD, MAX_REWARD_POINTS));
    decPreference(choice);

    const nextIndex = currentIndex + 1;
    if (nextIndex < sortedOptions.length) {
      setCurrentIndex(nextIndex);
    } else {
      // no more at this layer
      if (currentPath.length === 0) {
        // top-level => discard all categories => show overlay, reshuffle
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

  // Mark item as completed & rating
  const markCompleted = (item) => {
    setCompleted((prev) => ({ ...prev, [item]: true }));
  };
  const setItemRating = (item, stars) => {
    setRatings((prev) => ({ ...prev, [item]: stars }));
  };

  // Show current "layer" name
  const currentLayerName =
    currentPath.length === 0 ? "Shuffling..." : currentPath[currentPath.length - 1];

  // Pick a random frame index in an effect so SSR doesn't mismatch
  const [cardFrameIndex, setCardFrameIndex] = useState(0);
  useEffect(() => {
    if (hasOptions) {
      setCardFrameIndex(getRandomFrameIndex());
    }
  }, [currentIndex, currentPath, hasOptions]);

  // Current card frame + color
  const cardFrame = cardFrames[cardFrameIndex];
  const cardColor = getColorForPath(currentPath);

  /* ---------- STYLES ---------- */
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

  // Main area
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

  // Bottom bar
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
      {/* FINAL MATCH OVERLAY */}
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

      {/* "No more" overlay */}
      {noMoreMessage && (
        <div style={noMoreOverlay}>
          No more top-level options! Reshuffling...
        </div>
      )}

      {/* MATCHES MODAL */}
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
