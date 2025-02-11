import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@supabase/supabase-js";

// Make sure your environment variables are set correctly
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Dynamically import the map component
// IMPORTANT: Replace `MapContainer.js` below if your file name is different.
const MyMap = dynamic(() => import("../components/MapContainer.js"), {
  ssr: false,
});

export default function Home() {
  // MAIN DATA
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [places, setPlaces] = useState([]);
  const [neighborhoods, setNeighborhoods] = useState([]);

  // Flow
  const [catIndex, setCatIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [placeIndex, setPlaceIndex] = useState(0);
  const [mode, setMode] = useState("categories");

  // Current selections
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);

  // Matches & deck
  const [matches, setMatches] = useState([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [matchDeckOpen, setMatchDeckOpen] = useState(false);
  const [newMatchesCount, setNewMatchesCount] = useState(0);

  // Search
  const [searchTerm, setSearchTerm] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadBaseData();
  }, []);

  async function loadBaseData() {
    try {
      // 1) Load categories
      let { data: catData } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("weight", { ascending: false });

      // 2) Load subcategories
      let { data: subData } = await supabase
        .from("subcategories")
        .select("*")
        .eq("is_active", true)
        .order("weight", { ascending: false });

      // Filter subcategories referencing places
      let { data: psData } = await supabase
        .from("place_subcategories")
        .select("subcategory_id");
      const validSubs = new Set((psData || []).map((ps) => ps.subcategory_id));
      subData = (subData || []).filter((s) => validSubs.has(s.id));

      // Keep only categories that have subcategories
      const catWithSubs = new Set(subData.map((s) => s.category_id));
      catData = (catData || []).filter((c) => catWithSubs.has(c.id));

      catData.sort((a, b) => (b.weight || 0) - (a.weight || 0));
      subData.sort((a, b) => (b.weight || 0) - (a.weight || 0));

      setCategories(catData);
      setSubcategories(subData);

      // 3) Load neighborhoods
      let { data: hoodData } = await supabase
        .from("neighborhoods")
        .select("*")
        .eq("is_active", true)
        .order("weight", { ascending: false });
      setNeighborhoods(hoodData || []);
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  // Helper
  function getSubcatsForCategory(cat) {
    if (!cat) return [];
    return subcategories.filter((s) => s.category_id === cat.id);
  }

  // Search
  useEffect(() => {
    if (!searchTerm) {
      setSearchSuggestions([]);
      return;
    }
    const lower = searchTerm.toLowerCase();

    const catMatches = categories
      .filter((c) => c.name.toLowerCase().includes(lower))
      .map((c) => ({ type: "category", name: c.name, id: c.id }));

    const subMatches = subcategories
      .filter((s) => s.name.toLowerCase().includes(lower))
      .map((s) => ({ type: "subcategory", name: s.name, id: s.id }));

    const hoodMatches = neighborhoods
      .filter((n) => n.name.toLowerCase().includes(lower))
      .map((n) => ({ type: "neighborhood", name: n.name, id: n.id }));

    const combined = [...catMatches, ...subMatches, ...hoodMatches];
    setSearchSuggestions(combined.slice(0, 8));
  }, [searchTerm, categories, subcategories, neighborhoods]);

  function pickSearchSuggestion(sug) {
    setSearchTerm(sug.name);
    setShowSearchSuggestions(false);

    if (sug.type === "category") {
      const idx = categories.findIndex((c) => c.id === sug.id);
      if (idx !== -1) {
        setCatIndex(idx);
        setMode("categories");
        handleYesCategoryOverride(idx);
      }
    } else if (sug.type === "subcategory") {
      const subObj = subcategories.find((x) => x.id === sug.id);
      if (!subObj) return;
      const catId = subObj.category_id;
      const catIdx = categories.findIndex((c) => c.id === catId);
      if (catIdx !== -1) {
        setCatIndex(catIdx);
        setSelectedCategory(categories[catIdx]);
        setMode("subcategories");

        const scList = getSubcatsForCategory(categories[catIdx]);
        const scIdx = scList.findIndex((x) => x.id === sug.id);
        if (scIdx !== -1) {
          setSubIndex(scIdx);
          handleYesSubcategoryOverride(scList[scIdx].id);
        }
      }
    } else if (sug.type === "neighborhood") {
      loadPlacesByNeighborhood(sug.id);
    }
  }

  async function loadPlacesByNeighborhood(neighborhoodId) {
    try {
      const { data, error } = await supabase
        .from("places")
        .select("*")
        .eq("neighborhood_id", neighborhoodId);
      if (error) throw error;
      if (!data || data.length === 0) {
        alert("No places found in that neighborhood!");
        return;
      }
      data.sort((a, b) => (b.weight || 0) - (a.weight || 0));
      setPlaces(data);
      setPlaceIndex(0);
      setMode("places");
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  // Category
  const currentCategory = categories[catIndex] || null;
  function handleYesCategoryOverride(catIdx) {
    if (catIdx < 0 || catIdx >= categories.length) return;
    const catObj = categories[catIdx];
    setSelectedCategory(catObj);
    setSubIndex(0);
    setPlaceIndex(0);
    setMode("subcategories");
  }
  function handleYesCategory() {
    if (!currentCategory) return;
    setSelectedCategory(currentCategory);
    setSubIndex(0);
    setPlaceIndex(0);
    setMode("subcategories");
  }
  function handleNoCategory() {
    const next = catIndex + 1;
    if (next >= categories.length) {
      alert("No more categories left!");
    } else {
      setCatIndex(next);
    }
  }

  // Subcategory
  const scList = getSubcatsForCategory(selectedCategory);
  const currentSubcat = scList[subIndex] || null;

  async function handleYesSubcategoryOverride(subId) {
    const subObj = subcategories.find((x) => x.id === subId);
    if (!subObj) return;
    setSelectedSubcategory(subObj);

    try {
      const { data, error } = await supabase
        .from("place_subcategories")
        .select("place_id, places(*)")
        .eq("subcategory_id", subId);
      if (error) throw error;

      let placeItems = (data || []).map((row) => row.places);
      placeItems.sort((a, b) => (b.weight || 0) - (a.weight || 0));

      setPlaces(placeItems);
      setPlaceIndex(0);
      setMode("places");
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  function handleYesSubcategory() {
    if (!currentSubcat) return;
    handleYesSubcategoryOverride(currentSubcat.id);
  }
  function handleNoSubcategory() {
    const next = subIndex + 1;
    if (next >= scList.length) {
      const nextCat = catIndex + 1;
      if (nextCat >= categories.length) {
        alert("No more categories left!");
        setMode("categories");
      } else {
        setCatIndex(nextCat);
        setMode("categories");
      }
    } else {
      setSubIndex(next);
    }
  }

  // Places
  const currentPlace = places[placeIndex] || null;
  function handleYesPlace() {
    if (!currentPlace) return;
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 2000);

    // Only places become final matches
    setMatches((prev) => [...prev, currentPlace]);
    if (!matchDeckOpen) {
      setNewMatchesCount((n) => n + 1);
    }

    const next = placeIndex + 1;
    if (next >= places.length) {
      moveToNextSubcategory();
    } else {
      setPlaceIndex(next);
    }
  }
  function handleNoPlace() {
    const next = placeIndex + 1;
    if (next >= places.length) {
      moveToNextSubcategory();
    } else {
      setPlaceIndex(next);
    }
  }
  function moveToNextSubcategory() {
    const next = subIndex + 1;
    if (next >= scList.length) {
      const nextCat = catIndex + 1;
      if (nextCat >= categories.length) {
        alert("No more categories left!");
        setMode("categories");
      } else {
        setCatIndex(nextCat);
        setMode("categories");
      }
    } else {
      setSubIndex(next);
      setMode("subcategories");
    }
  }

  // unify no / yes
  function handleNo() {
    if (mode === "places") {
      handleNoPlace();
    } else if (mode === "subcategories") {
      handleNoSubcategory();
    } else {
      handleNoCategory();
    }
  }
  function handleYes() {
    if (mode === "places") {
      handleYesPlace();
    } else if (mode === "subcategories") {
      handleYesSubcategory();
    } else {
      handleYesCategory();
    }
  }

  // Navigation
  function handleGoBack() {
    if (mode === "places") {
      setMode("subcategories");
    } else if (mode === "subcategories") {
      setMode("categories");
    } else {
      alert("Already at top-level categories!");
    }
  }
  function handleReshuffle() {
    setCatIndex(0);
    setSubIndex(0);
    setPlaceIndex(0);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setPlaces([]);
    setMode("categories");
    setSearchTerm("");
    setSearchSuggestions([]);
    setShowSearchSuggestions(false);
    setMatchDeckOpen(false);
  }

  // Build card data
  function getCurrentCardData() {
    if (mode === "categories") {
      if (!currentCategory) return null;
      return {
        name: currentCategory.name,
        image_url: currentCategory.image_url || "",
        neighborhood: "",
        description: "",
        latitude: null,
        longitude: null,
      };
    } else if (mode === "subcategories") {
      if (!currentSubcat) return null;
      return {
        name: currentSubcat.name,
        image_url: currentSubcat.image_url || "",
        neighborhood: "",
        description: "",
        latitude: null,
        longitude: null,
      };
    } else if (mode === "places") {
      if (!currentPlace) return null;
      return {
        name: currentPlace.name,
        image_url: currentPlace.image_url || "",
        neighborhood: currentPlace.neighborhood || "",
        description: currentPlace.description || "",
        latitude: currentPlace.latitude || null,
        longitude: currentPlace.longitude || null,
      };
    }
    return null;
  }

  const currentCard = getCurrentCardData();
  if (!currentCard) {
    return (
      <div style={styles.container}>
        <h1>DialN</h1>
        <p>No more {mode} to show!</p>
        <button onClick={handleReshuffle} style={styles.reshuffleButton}>
          Reshuffle
        </button>
      </div>
    );
  }

  // Simple approach: if there's an image_url, we use it. Otherwise, fallback
  const bgImage = currentCard.image_url?.trim()
    ? currentCard.image_url
    : "/images/default-bg.jpg";

  // Build links
  // Neighborhood link => Wikipedia (URL-encode the neighborhood)
  const wikiNeighborhoodUrl = currentCard.neighborhood
    ? `https://en.wikipedia.org/wiki/${encodeURIComponent(
        currentCard.neighborhood
      )}`
    : null;

  // Place link => Google Maps with lat/lon
  let googlePlaceUrl = null;
  if (mode === "places" && currentCard.latitude && currentCard.longitude) {
    googlePlaceUrl = `https://www.google.com/maps/search/?api=1&query=${currentCard.latitude},${currentCard.longitude}`;
  }

  return (
    <div style={{ ...styles.container, backgroundImage: `url(${bgImage})` }}>
      <div style={styles.overlay}>
        {/* TOP ROW */}
        <div style={styles.topRow}>
          <div style={styles.topLeftEmpty}></div>

          <MatchedDeckButton
            matches={matches}
            newMatchesCount={newMatchesCount}
            matchDeckOpen={matchDeckOpen}
            setMatchDeckOpen={setMatchDeckOpen}
            setNewMatchesCount={setNewMatchesCount}
          />

          <div style={styles.topRightArea}>
            <div style={styles.usaBaltimoreText}>USA &rarr; Baltimore</div>
            <SubcategorySearchBar
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              suggestions={searchSuggestions}
              showSuggestions={showSearchSuggestions}
              setShowSearchSuggestions={setShowSearchSuggestions}
              onPick={pickSearchSuggestion}
            />
          </div>
        </div>

        <div style={styles.centerContent}>
          {/* If we're in places mode, show the map at the top of the final card */}
          {mode === "places" && (
            <div style={styles.mapWrapper}>
              <MyMap
                placeLat={currentCard.latitude}
                placeLon={currentCard.longitude}
                // If you also store neighborhood lat/lon, pass them here:
                // neighborhoodLat={someValue}
                // neighborhoodLon={someValue}
                zoom={12}
              />
            </div>
          )}
        </div>

        {/* BOTTOM row => neighborhood link, place link, yes/no, desc */}
        <div style={styles.bottomTextRow}>
          {mode === "places" && currentCard.neighborhood && (
            <p style={styles.neighborhoodText}>
              {/* Link to Wikipedia */}
              <a
                href={wikiNeighborhoodUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.neighborhoodLink}
              >
                {currentCard.neighborhood}
              </a>
            </p>
          )}
          {/* If we have a google link, wrap place name in anchor */}
          {mode === "places" && googlePlaceUrl ? (
            <h1 style={styles.cardTitle}>
              <a
                href={googlePlaceUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.placeLink}
              >
                {currentCard.name}
              </a>
            </h1>
          ) : (
            // Otherwise, just plain text for categories/subcats
            <h1 style={styles.cardTitle}>{currentCard.name}</h1>
          )}

          <div style={styles.yesNoRow}>
            <button style={styles.noButton} onClick={handleNo}>
              No
            </button>
            <button style={styles.yesButton} onClick={handleYes}>
              Yes
            </button>
          </div>

          {mode === "places" && currentCard.description && (
            <p style={styles.descriptionText}>{currentCard.description}</p>
          )}
        </div>

        <button style={styles.goBackButton} onClick={handleGoBack}>
          Go Back
        </button>
        <button style={styles.reshuffleButton} onClick={handleReshuffle}>
          Reshuffle
        </button>

        {/* MATCH DECK OVERLAY */}
        {matchDeckOpen && (
          <MatchDeckOverlay
            matches={matches}
            onClose={() => {
              setMatchDeckOpen(false);
              setNewMatchesCount(0);
            }}
          />
        )}
      </div>

      {showCelebration && <CelebrationAnimation />}
      {errorMsg && (
        <p style={{ color: "red", position: "absolute", top: 10, left: 10 }}>
          {errorMsg}
        </p>
      )}
    </div>
  );
}

/* SUBCATEGORY SEARCH BAR */
function SubcategorySearchBar({
  searchTerm,
  setSearchTerm,
  suggestions,
  showSuggestions,
  setShowSearchSuggestions,
  onPick,
}) {
  function handleFocus() {
    if (searchTerm) setShowSearchSuggestions(true);
  }
  function handleBlur() {
    // Delay hiding suggestions so click can register
    setTimeout(() => {
      setShowSearchSuggestions(false);
    }, 200);
  }
  return (
    <div style={styles.searchBarContainer}>
      <input
        style={styles.searchInput}
        type="text"
        placeholder="Type e.g. 'food' or 'Federal Hill'..."
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setShowSearchSuggestions(true);
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div style={styles.suggestionList}>
          {suggestions.map((sug, i) => (
            <div
              key={i}
              style={styles.suggestionItem}
              onClick={() => onPick(sug)}
            >
              {sug.type === "category"
                ? `Category: ${sug.name}`
                : sug.type === "subcategory"
                ? `Subcat: ${sug.name}`
                : `Neighborhood: ${sug.name}`}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* MATCHED DECK BUTTON */
function MatchedDeckButton({
  matches,
  newMatchesCount,
  matchDeckOpen,
  setMatchDeckOpen,
  setNewMatchesCount,
}) {
  return (
    <div style={styles.matchDeckBtnContainer}>
      <button
        style={styles.matchDeckButton}
        onClick={() => {
          setMatchDeckOpen(true);
          setNewMatchesCount(0);
        }}
      >
        Matches {newMatchesCount > 0 && `(+${newMatchesCount})`}
      </button>
    </div>
  );
}

/* MATCH DECK OVERLAY */
function MatchDeckOverlay({ matches, onClose }) {
  return (
    <div style={styles.matchDeckOverlay}>
      <div style={styles.matchDeckBox}>
        <h2>Match Deck</h2>
        <button onClick={onClose} style={styles.closeDeckButton}>
          Close
        </button>
        {matches.length === 0 ? (
          <p>No matches yet.</p>
        ) : (
          <ul>
            {matches.map((m, i) => (
              <li key={i}>
                <strong>{m.name}</strong>
                {m.neighborhood && ` - ${m.neighborhood}`}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* CELEBRATION */
function CelebrationAnimation() {
  return (
    <div style={styles.celebrationOverlay}>
      <div style={styles.celebrationBox}>
        <h2 style={{ margin: 0 }}>MATCH!</h2>
        <p>Great choice!</p>
      </div>
    </div>
  );
}

/* STYLES */
const styles = {
  container: {
    width: "100vw",
    height: "100vh",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    position: "relative",
    fontFamily: "sans-serif",
  },
  overlay: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.3)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    position: "relative",
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "10px 20px",
  },
  topLeftEmpty: {
    width: "20%",
    minWidth: "100px",
  },
  topRightArea: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
  },
  usaBaltimoreText: {
    color: "#ffd700",
    fontSize: "1.2em",
    textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
    marginBottom: "8px",
  },
  matchDeckBtnContainer: {
    width: "60%",
    textAlign: "center",
  },
  matchDeckButton: {
    backgroundColor: "#ff9800",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "1em",
  },
  searchBarContainer: {
    position: "relative",
  },
  searchInput: {
    width: "220px",
    padding: "6px",
    borderRadius: "4px",
    border: "1px solid #888",
  },
  suggestionList: {
    position: "absolute",
    top: "35px",
    left: 0,
    width: "220px",
    backgroundColor: "#333",
    borderRadius: "4px",
    zIndex: 9999,
    maxHeight: "140px",
    overflowY: "auto",
  },
  suggestionItem: {
    padding: "5px",
    color: "#fff",
    cursor: "pointer",
    borderBottom: "1px solid #555",
  },
  centerContent: {
    flexGrow: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  mapWrapper: {
    width: "600px",
    height: "400px",
    border: "2px solid #fff",
    borderRadius: "8px",
    overflow: "hidden",
  },
  bottomTextRow: {
    textAlign: "center",
    marginBottom: "70px",
  },
  neighborhoodText: {
    color: "#FFD700",
    fontSize: "1.3em",
    marginBottom: "5px",
    fontWeight: "bold",
    textShadow: "1px 1px 3px rgba(0,0,0,0.7)",
  },
  neighborhoodLink: {
    color: "#FFD700",
    textDecoration: "underline",
  },
  placeLink: {
    color: "#fff",
    textDecoration: "underline",
  },
  cardTitle: {
    color: "#fff",
    fontSize: "3em",
    textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
    margin: 0,
    textTransform: "uppercase",
  },
  descriptionText: {
    color: "#fff",
    marginTop: "15px",
    fontSize: "1.1em",
    lineHeight: "1.4",
  },
  yesNoRow: {
    marginTop: "20px",
    display: "flex",
    justifyContent: "center",
    gap: "40px",
  },
  noButton: {
    backgroundColor: "#f44336",
    color: "#fff",
    border: "none",
    padding: "12px 24px",
    borderRadius: "5px",
    fontSize: "1.1em",
    cursor: "pointer",
  },
  yesButton: {
    backgroundColor: "#4CAF50",
    color: "#fff",
    border: "none",
    padding: "12px 24px",
    borderRadius: "5px",
    fontSize: "1.1em",
    cursor: "pointer",
  },
  goBackButton: {
    position: "absolute",
    bottom: "20px",
    left: "20px",
    padding: "8px 16px",
    backgroundColor: "#2196F3",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  reshuffleButton: {
    position: "absolute",
    bottom: "20px",
    right: "20px",
    padding: "8px 16px",
    backgroundColor: "#9C27B0",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  matchDeckOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0,0,0,0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10000,
  },
  matchDeckBox: {
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "8px",
    width: "300px",
    maxHeight: "70vh",
    overflowY: "auto",
    position: "relative",
  },
  closeDeckButton: {
    position: "absolute",
    top: "10px",
    right: "10px",
    cursor: "pointer",
  },
  celebrationOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  celebrationBox: {
    backgroundColor: "#fff",
    padding: "30px",
    borderRadius: "10px",
    textAlign: "center",
  },
};
