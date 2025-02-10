import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// 1) Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  // MAIN DATA
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [places, setPlaces] = useState([]);

  // Flow indexes
  const [catIndex, setCatIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [placeIndex, setPlaceIndex] = useState(0);
  const [mode, setMode] = useState("categories"); // "categories" | "subcategories" | "places"

  // Chosen cat/subcat
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);

  // Matches + celebration
  const [matches, setMatches] = useState([]);
  const [showCelebration, setShowCelebration] = useState(false);

  // Error handling
  const [errorMsg, setErrorMsg] = useState(null);

  // 2) NEIGHBORHOOD SEARCH & WEIGHTS
  // All neighborhoods start weight=1. If the user picks a neighborhood, that one has weight=2 => places from that neighborhood appear first
  const [allNeighborhoods, setAllNeighborhoods] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [selectedNeighborhood, setSelectedNeighborhood] = useState(null); // weight=2 if chosen

  useEffect(() => {
    loadBaseData();
    loadAllNeighborhoods();
  }, []);

  // ------------- LOAD DATA -------------
  async function loadBaseData() {
    try {
      // categories
      const { data: catData, error: catErr } = await supabase
        .from("categories")
        .select("*");
      if (catErr) throw catErr;

      // subcategories
      const { data: subData, error: subErr } = await supabase
        .from("subcategories")
        .select("*");
      if (subErr) throw subErr;

      // reorder so "Neighborhoods" is always first in categories
      const reorderedCats = reorderForNeighborhoodsFirst(catData);
      setCategories(reorderedCats || []);

      // reorder subcategories so subcat "Neighborhoods" is first if it exists
      const reorderedSubs = reorderForNeighborhoodsFirst(subData);
      setSubcategories(reorderedSubs || []);
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  async function loadAllNeighborhoods() {
    try {
      const { data, error } = await supabase
        .from("places")
        .select("neighborhood")
        .neq("neighborhood", null);
      if (error) throw error;
      const nbSet = new Set();
      data.forEach((row) => {
        if (row.neighborhood) {
          nbSet.add(row.neighborhood);
        }
      });
      const nbArray = Array.from(nbSet).sort();
      setAllNeighborhoods(nbArray);
    } catch (err) {
      console.error("Error loading neighborhoods:", err);
    }
  }

  // If there's a "Neighborhoods" row, put it at the front
  function reorderForNeighborhoodsFirst(array) {
    if (!array) return [];
    // e.g. find any item whose name === "Neighborhoods"
    const idx = array.findIndex((x) => x.name === "Neighborhoods");
    if (idx === -1) {
      return array;
    }
    // move that item to the front
    const item = array[idx];
    const newArr = array.slice();
    newArr.splice(idx, 1);
    newArr.unshift(item);
    return newArr;
  }

  // ------------- NEIGHBORHOOD SEARCH LOGIC -------------
  useEffect(() => {
    if (!searchTerm) {
      setSuggestions([]);
      return;
    }
    const lower = searchTerm.toLowerCase();
    const matched = allNeighborhoods.filter((n) => n.toLowerCase().includes(lower));
    setSuggestions(matched.slice(0, 5)); 
  }, [searchTerm, allNeighborhoods]);

  function pickNeighborhood(nb) {
    setSelectedNeighborhood(nb); // weight=2 for this nb
    setSearchTerm(nb);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  // ------------- REORDER PLACES -------------
  // We'll reorder so the chosen neighborhood has weight=2, others have weight=1, then we compare place.weight
  function reorderPlaces(placeArray) {
    return placeArray.slice().sort((a, b) => {
      const aw = getNeighborhoodWeight(a.neighborhood);
      const bw = getNeighborhoodWeight(b.neighborhood);
      if (bw === aw) {
        // tie => place.weight
        return (b.weight || 0) - (a.weight || 0);
      }
      return bw - aw;
    });
  }
  function getNeighborhoodWeight(nbName) {
    if (!nbName) return 1;
    if (nbName === selectedNeighborhood) return 2;
    return 1;
  }

  // ------------- LAYER QUERIES -------------
  const currentCategory = categories[catIndex] || null;

  function getSubcatsForCategory(cat) {
    if (!cat) return [];
    const sc = subcategories.filter((s) => s.category_id === cat.id);
    // reorder so subcat "Neighborhoods" is first
    return reorderForNeighborhoodsFirst(sc);
  }
  const scList = getSubcatsForCategory(selectedCategory);
  const currentSubcategory = scList[subIndex] || null;

  const currentPlace = places[placeIndex] || null;

  function getCurrentCard() {
    if (mode === "categories") {
      return currentCategory
        ? { name: currentCategory.name, image_url: currentCategory.image_url || "" }
        : null;
    } else if (mode === "subcategories") {
      return currentSubcategory
        ? { name: currentSubcategory.name, image_url: currentSubcategory.image_url || "" }
        : null;
    } else if (mode === "places") {
      return currentPlace
        ? { name: currentPlace.name, image_url: currentPlace.image_url || "" }
        : null;
    }
    return null;
  }

  // fallback bkg
  function getBackgroundImage(url) {
    return url && url.trim() !== "" ? url : "/images/default-bg.jpg";
  }

  // BREADCRUMB
  function getLeftBreadcrumb() {
    if (mode === "subcategories" && selectedCategory) {
      return selectedCategory.name;
    }
    if (mode === "places" && selectedCategory && selectedSubcategory) {
      return `${selectedCategory.name} -> ${selectedSubcategory.name}`;
    }
    return "";
  }
  function getRightText() {
    return "USA -> Baltimore";
  }

  // ============= SWIPE HANDLERS =============
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

  async function handleYesSubcategory() {
    if (!currentSubcategory) return;
    setSelectedSubcategory(currentSubcategory);

    // bridging
    try {
      const { data, error } = await supabase
        .from("place_subcategories")
        .select("place_id, places(*)")
        .eq("subcategory_id", currentSubcategory.id);
      if (error) throw error;

      let placeItems = data.map((row) => row.places);
      // reorder by neighborhood weight => then place.weight
      placeItems = reorderPlaces(placeItems);

      setPlaces(placeItems);
      setPlaceIndex(0);
      setMode("places");
    } catch (err) {
      setErrorMsg(err.message);
    }
  }
  function handleNoSubcategory() {
    const sc2 = getSubcatsForCategory(selectedCategory);
    const next = subIndex + 1;
    if (next >= sc2.length) {
      // next category
      const nextCat = catIndex + 1;
      if (nextCat >= categories.length) {
        alert("No more categories!");
        setMode("categories");
      } else {
        setCatIndex(nextCat);
        setMode("categories");
      }
    } else {
      setSubIndex(next);
    }
  }

  function handleYesPlace() {
    if (!currentPlace) return;
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 2000);

    setMatches((prev) => [...prev, currentPlace]);
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
    const sc2 = getSubcatsForCategory(selectedCategory);
    const next = subIndex + 1;
    if (next >= sc2.length) {
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
    // Clear chosen neighborhood => all neighborhoods weight=1
    setSelectedNeighborhood(null);
    setSearchTerm("");
    setSuggestions([]);
    setShowSuggestions(false);
  }

  // DETERMINE CURRENT CARD
  const currentCardObj = getCurrentCard();
  if (!currentCardObj) {
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
  const bgImage = getBackgroundImage(currentCardObj.image_url);
  const leftText = getLeftBreadcrumb();
  const rightText = getRightText();

  const currentPlaceObj = places[placeIndex] || null;
  const currentNeighborhood = mode === "places" && currentPlaceObj?.neighborhood ? currentPlaceObj.neighborhood : "";

  return (
    <div style={{ ...styles.container, backgroundImage: `url(${bgImage})` }}>
      <div style={styles.overlay}>
        {/* Top Row */}
        <div style={styles.topRow}>
          <div style={styles.leftText}>{leftText}</div>
          <div style={styles.rightText}>
            {rightText}
            {/* NeighborhoodSearch */}
            <div style={{ marginTop: 8 }}>
              <NeighborhoodSearch
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                suggestions={suggestions}
                showSuggestions={showSuggestions}
                setShowSuggestions={setShowSuggestions}
                pickNeighborhood={pickNeighborhood}
                selectedNeighborhood={selectedNeighborhood}
              />
            </div>
          </div>
        </div>

        <div style={styles.centerContent}></div>

        {/* Bottom row => card name + maybe place neighborhood + yes/no */}
        <div style={styles.bottomTextRow}>
          <h1 style={styles.currentCardName}>{currentCardObj.name}</h1>
          {mode === "places" && currentNeighborhood && (
            <p style={styles.neighborhoodText}>{currentNeighborhood}</p>
          )}

          <div style={styles.yesNoRow}>
            <button style={styles.noButton} onClick={handleNo}>
              No
            </button>
            <button style={styles.yesButton} onClick={handleYes}>
              Yes
            </button>
          </div>
        </div>

        <button style={styles.goBackButton} onClick={handleGoBack}>
          Go Back
        </button>
        <button style={styles.reshuffleButton} onClick={handleReshuffle}>
          Reshuffle
        </button>
      </div>

      {showCelebration && <CelebrationAnimation />}
      {errorMsg && (
        <p style={{ color: "red", position: "absolute", top: 10, left: 10 }}>
          {errorMsg}
        </p>
      )}
    </div>
  );

  // handleNo / handleYes unify
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
}

// NeighborhoodSearch
function NeighborhoodSearch({
  searchTerm,
  setSearchTerm,
  suggestions,
  showSuggestions,
  setShowSuggestions,
  pickNeighborhood,
  selectedNeighborhood,
}) {
  function handleFocus() {
    if (searchTerm) {
      setShowSuggestions(true);
    }
  }
  function handleBlur() {
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  }
  return (
    <div style={styles.nbSearchContainer}>
      <label style={{ color: "#fff", fontSize: "0.9em" }}>Neighborhood:</label>
      <input
        style={styles.nbSearchInput}
        type="text"
        placeholder="Type a neighborhood..."
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div style={styles.nbSuggestionList}>
          {suggestions.map((sug) => (
            <div
              key={sug}
              style={styles.nbSuggestionItem}
              onClick={() => pickNeighborhood(sug)}
            >
              {sug}
            </div>
          ))}
        </div>
      )}
      {selectedNeighborhood && (
        <p style={styles.nbSelectedText}>
          Weighted Neighborhood: <strong>{selectedNeighborhood}</strong>
        </p>
      )}
    </div>
  );
}

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

// STYLES
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
  leftText: {
    color: "#fff",
    fontSize: "1.3em",
    textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
    margin: 0,
    textTransform: "uppercase",
    maxWidth: "40%",
  },
  rightText: {
    color: "#ffd700",
    fontSize: "1.2em",
    textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
    margin: 0,
    textAlign: "right",
    maxWidth: "60%",
  },
  nbSearchContainer: {
    position: "relative",
    marginTop: "5px",
  },
  nbSearchInput: {
    width: "220px",
    padding: "5px",
    borderRadius: "4px",
    border: "1px solid #888",
  },
  nbSuggestionList: {
    position: "absolute",
    top: "33px",
    left: 0,
    width: "220px",
    backgroundColor: "#333",
    borderRadius: "4px",
    zIndex: 999,
    maxHeight: "140px",
    overflowY: "auto",
  },
  nbSuggestionItem: {
    padding: "5px",
    color: "#fff",
    cursor: "pointer",
    borderBottom: "1px solid #555",
  },
  nbSelectedText: {
    color: "#fff",
    fontSize: "0.8em",
    marginTop: "3px",
  },
  centerContent: {
    flexGrow: 1,
  },
  bottomTextRow: {
    textAlign: "center",
    marginBottom: "70px",
  },
  currentCardName: {
    color: "#fff",
    fontSize: "3em",
    textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
    margin: 0,
    textTransform: "uppercase",
  },
  neighborhoodText: {
    color: "#FFD700",
    fontSize: "1.5em",
    fontStyle: "italic",
    textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
    marginTop: "10px",
    marginBottom: "15px",
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
