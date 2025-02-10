import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// 1) Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  // MAIN SWIPE STATE
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [places, setPlaces] = useState([]);

  // Indices
  const [catIndex, setCatIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [placeIndex, setPlaceIndex] = useState(0);
  const [mode, setMode] = useState("categories"); // "categories", "subcategories", "places"

  // Selected items
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);

  // Matches & celebration
  const [matches, setMatches] = useState([]);
  const [showCelebration, setShowCelebration] = useState(false);

  // Error
  const [errorMsg, setErrorMsg] = useState(null);

  // 2) NEIGHBORHOOD AUTOCOMPLETE
  // We'll fetch all distinct neighborhoods from `places`.
  // By default, no neighborhood is selected => user sees no places if they proceed.
  const [allNeighborhoods, setAllNeighborhoods] = useState([]);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(null); // e.g. "Federal Hill"
  const [searchTerm, setSearchTerm] = useState(""); // user typing partial string
  const [suggestions, setSuggestions] = useState([]); // array of matching neighborhoods
  const [showSuggestions, setShowSuggestions] = useState(false);

  // On mount, load categories/subcategories + neighborhoods
  useEffect(() => {
    loadBaseData();
    loadAllNeighborhoods();
  }, []);

  async function loadBaseData() {
    try {
      // load categories
      const { data: catData, error: catErr } = await supabase
        .from("categories")
        .select("*")
        .order("weight", { ascending: false });
      if (catErr) throw catErr;

      // load subcategories
      const { data: subData, error: subErr } = await supabase
        .from("subcategories")
        .select("*")
        .order("weight", { ascending: false });
      if (subErr) throw subErr;

      setCategories(catData || []);
      setSubcategories(subData || []);
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
      const nbArray = Array.from(nbSet);
      nbArray.sort(); // alphabetical
      setAllNeighborhoods(nbArray);
    } catch (err) {
      console.error("Error loading neighborhoods:", err);
    }
  }

  // Autocomplete logic:
  // 1) Whenever searchTerm changes, compute suggestions from allNeighborhoods
  useEffect(() => {
    if (!searchTerm) {
      setSuggestions([]);
      return;
    }
    const lower = searchTerm.toLowerCase();
    const matched = allNeighborhoods.filter((n) => n.toLowerCase().includes(lower));
    setSuggestions(matched.slice(0, 5)); // up to 5 suggestions
  }, [searchTerm, allNeighborhoods]);

  // When user picks a suggestion
  function pickNeighborhood(nb) {
    setSelectedNeighborhood(nb);
    setSearchTerm(nb);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  // reorder places => if no selectedNeighborhood => return empty => user sees no places
  // else only places with p.neighborhood === selectedNeighborhood
  function reorderPlacesByNeighborhood(placesArray) {
    if (!selectedNeighborhood) {
      // user hasn't chosen => no places
      return [];
    }
    return placesArray.filter((p) => p.neighborhood === selectedNeighborhood);
  }

  // Current items
  const currentCategory = categories[catIndex] || null;
  const currentSubcategory = (() => {
    if (!selectedCategory) return null;
    const scList = subcategories.filter((s) => s.category_id === selectedCategory.id);
    return scList[subIndex] || null;
  })();
  const currentPlace = places[placeIndex] || null;

  // Return the card name & image
  function getCurrentCardData() {
    if (mode === "categories") {
      return currentCategory
        ? {
            name: currentCategory.name,
            image_url: currentCategory.image_url || "",
          }
        : null;
    } else if (mode === "subcategories") {
      return currentSubcategory
        ? {
            name: currentSubcategory.name,
            image_url: currentSubcategory.image_url || "",
          }
        : null;
    } else if (mode === "places") {
      if (!currentPlace) return null;
      return {
        name: currentPlace.name,
        image_url: currentPlace.image_url || "",
      };
    }
    return null;
  }

  // fallback background
  function getBackgroundImage(url) {
    return url && url.trim() !== "" ? url : "/images/default-bg.jpg";
  }

  // Left breadcrumb
  function getLeftBreadcrumb() {
    if (mode === "subcategories" && currentCategory) {
      return currentCategory.name;
    }
    if (mode === "places" && selectedCategory && selectedSubcategory) {
      return `${selectedCategory.name} -> ${selectedSubcategory.name}`;
    }
    return "";
  }

  // Right text => "USA -> Baltimore"
  // Then the user has a text input below it for searching neighborhoods
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
    try {
      const { data, error } = await supabase
        .from("place_subcategories")
        .select("place_id, places(*)")
        .eq("subcategory_id", currentSubcategory.id);
      if (error) throw error;

      let placeItems = data.map((row) => row.places);
      // sort by weight desc
      placeItems.sort((a, b) => (b.weight || 0) - (a.weight || 0));
      // reorder (or filter) by selectedNeighborhood
      placeItems = reorderPlacesByNeighborhood(placeItems);

      setPlaces(placeItems);
      setPlaceIndex(0);
      setMode("places");
    } catch (err) {
      setErrorMsg(err.message);
    }
  }
  function handleNoSubcategory() {
    if (!selectedCategory) return;
    const scList = subcategories.filter((s) => s.category_id === selectedCategory.id);
    const next = subIndex + 1;
    if (next >= scList.length) {
      // next category
      const nextCat = catIndex + 1;
      if (nextCat >= categories.length) {
        alert("No more categories left!");
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
    if (!selectedCategory) return;
    const scList = subcategories.filter((s) => s.category_id === selectedCategory.id);
    const next = subIndex + 1;
    if (next >= scList.length) {
      // next category
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
    // Clear the selected neighborhood => no places
    setSelectedNeighborhood(null);
    setSearchTerm("");
    setSuggestions([]);
    setShowSuggestions(false);
  }

  // RENDER
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

  const bgImage = getBackgroundImage(currentCard.image_url);
  const leftText = getLeftBreadcrumb();
  const rightText = getRightText();

  return (
    <div style={{ ...styles.container, backgroundImage: `url(${bgImage})` }}>
      <div style={styles.overlay}>
        {/* TOP ROW */}
        <div style={styles.topRow}>
          <div style={styles.leftText}>{leftText}</div>

          <div style={styles.rightText}>
            {rightText}
            <div style={{ marginTop: "8px" }}>
              <NeighborhoodSearch
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                suggestions={suggestions}
                showSuggestions={showSuggestions}
                setShowSuggestions={setShowSuggestions}
                onPick={pickNeighborhood}
                selectedNeighborhood={selectedNeighborhood}
                allNeighborhoods={allNeighborhoods}
              />
            </div>
          </div>
        </div>

        <div style={styles.centerContent}></div>

        {/* BOTTOM ROW: card name, neighborhood if in places, yes/no */}
        <div style={styles.bottomTextRow}>
          <h1 style={styles.currentCardName}>{currentCard.name}</h1>

          {/* If we are in places mode, show the place's neighborhood below */}
          {mode === "places" && currentPlace?.neighborhood && (
            <p style={styles.neighborhoodText}>{currentPlace.neighborhood}</p>
          )}

          <div style={styles.yesNoRow}>
            <button
              style={styles.noButton}
              onClick={() => {
                if (mode === "categories") handleNoCategory();
                else if (mode === "subcategories") handleNoSubcategory();
                else handleNoPlace();
              }}
            >
              No
            </button>
            <button
              style={styles.yesButton}
              onClick={() => {
                if (mode === "categories") handleYesCategory();
                else if (mode === "subcategories") handleYesSubcategory();
                else handleYesPlace();
              }}
            >
              Yes
            </button>
          </div>
        </div>

        {/* BOTTOM CORNERS */}
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
}

// The NeighborhoodSearch component: text input + suggestion dropdown
function NeighborhoodSearch({
  searchTerm,
  setSearchTerm,
  suggestions,
  showSuggestions,
  setShowSuggestions,
  onPick,
  selectedNeighborhood,
  allNeighborhoods,
}) {
  // If user clicks inside the box, show suggestions again
  function handleFocus() {
    if (searchTerm) {
      setShowSuggestions(true);
    }
  }

  function handleBlur() {
    // slight timeout to allow picking
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
        placeholder="Type an address or neighborhood..."
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
              onClick={() => onPick(sug)}
            >
              {sug}
            </div>
          ))}
        </div>
      )}
      {selectedNeighborhood && (
        <p style={styles.nbSelectedText}>
          Currently selected: <strong>{selectedNeighborhood}</strong>
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
