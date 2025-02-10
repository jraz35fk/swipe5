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

  // Indices for each layer
  const [catIndex, setCatIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [placeIndex, setPlaceIndex] = useState(0);

  // "mode": "categories" | "subcategories" | "places"
  const [mode, setMode] = useState("categories");

  // Selected category/subcategory
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);

  // For final matches
  const [matches, setMatches] = useState([]);
  const [showCelebration, setShowCelebration] = useState(false);

  // Error handling
  const [errorMsg, setErrorMsg] = useState(null);

  // 2) NEIGHBORHOODS
  // We fetch all distinct neighborhoods from "places" once, so user can enable/disable them at any layer.
  const [allNeighborhoods, setAllNeighborhoods] = useState([]);
  const [enabledNeighborhoods, setEnabledNeighborhoods] = useState([]);

  // On mount, load categories/subcategories + all neighborhoods
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
      // Distinct neighborhoods from places
      const { data, error } = await supabase
        .from("places")
        .select("neighborhood")
        .neq("neighborhood", null);
      if (error) throw error;

      // gather unique
      const nbSet = new Set();
      data.forEach((row) => {
        if (row.neighborhood) {
          nbSet.add(row.neighborhood);
        }
      });
      const nbArray = Array.from(nbSet);

      // Optionally we can sort them alphabetically
      nbArray.sort();

      setAllNeighborhoods(nbArray);
      setEnabledNeighborhoods(nbArray); // all enabled by default
    } catch (err) {
      console.error("Error loading neighborhoods:", err);
    }
  }

  // Toggling neighborhoods persistent across all layers
  function toggleNeighborhood(nb) {
    if (enabledNeighborhoods.includes(nb)) {
      // remove it
      const newList = enabledNeighborhoods.filter((x) => x !== nb);
      setEnabledNeighborhoods(newList);
    } else {
      // add it
      setEnabledNeighborhoods([...enabledNeighborhoods, nb]);
    }
  }

  // Helper to reorder places so "enabled" neighborhoods appear first, then disabled
  function reorderPlacesByNeighborhood(placesArray) {
    if (!placesArray || placesArray.length === 0) return placesArray;
    // if all neighborhoods are enabled => no reorder
    if (
      enabledNeighborhoods.length === 0 ||
      enabledNeighborhoods.length === allNeighborhoods.length
    ) {
      return placesArray;
    }
    const enabledSet = new Set(enabledNeighborhoods);
    const enabledList = [];
    const disabledList = [];
    placesArray.forEach((p) => {
      if (!p.neighborhood) {
        // treat no neighborhood as disabled
        disabledList.push(p);
      } else if (enabledSet.has(p.neighborhood)) {
        enabledList.push(p);
      } else {
        disabledList.push(p);
      }
    });
    return [...enabledList, ...disabledList];
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

  // Fallback
  function getBackgroundImage(url) {
    return url && url.trim() !== "" ? url : "/images/default-bg.jpg";
  }

  // Left breadcrumb (top-left)
  function getLeftBreadcrumb() {
    if (mode === "subcategories" && currentCategory) {
      return currentCategory.name; // e.g. "Food & Dining"
    }
    if (mode === "places" && selectedCategory && selectedSubcategory) {
      return `${selectedCategory.name} -> ${selectedSubcategory.name}`;
    }
    return "";
  }

  // Right text (top-right), we always show "USA -> Baltimore" text
  // Then the user sees the multi-check for neighborhoods below it
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
      // reorder by neighborhoods
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
    // get the subcategories for that category
    const scList = subcategories.filter((s) => s.category_id === selectedCategory.id);
    const next = subIndex + 1;
    if (next >= scList.length) {
      // move to next category
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
      // move to next category
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
      alert("Already at the top-level categories!");
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
    // re-enable all neighborhoods
    setEnabledNeighborhoods(allNeighborhoods);
  }

  // 3) RENDER
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
            {/* NeighborhoodSelector always displayed below "USA -> Baltimore" */}
            <NeighborhoodSelector
              allNeighborhoods={allNeighborhoods}
              enabledNeighborhoods={enabledNeighborhoods}
              onToggle={toggleNeighborhood}
            />
          </div>
        </div>

        <div style={styles.centerContent}></div>

        {/* BOTTOM ROW: card name, neighborhood if places, yes/no */}
        <div style={styles.bottomTextRow}>
          <h1 style={styles.currentCardName}>{currentCard.name}</h1>

          {/* If we are in places mode, show the neighborhood below the name */}
          {mode === "places" && currentPlace && currentPlace.neighborhood && (
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

// NeighborhoodSelector: always visible in top-right below "USA -> Baltimore"
function NeighborhoodSelector({ allNeighborhoods, enabledNeighborhoods, onToggle }) {
  if (!allNeighborhoods || allNeighborhoods.length === 0) {
    return null; // no neighborhoods at all
  }
  return (
    <div style={styles.nbSelectorContainer}>
      {allNeighborhoods.map((nb) => {
        const isEnabled = enabledNeighborhoods.includes(nb);
        return (
          <div key={nb} style={styles.nbCheckRow}>
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={() => onToggle(nb)}
            />
            <label style={{ marginLeft: 5, color: isEnabled ? "#0f0" : "#fff" }}>
              {nb}
            </label>
          </div>
        );
      })}
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
  nbSelectorContainer: {
    marginTop: "8px",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: "8px",
    borderRadius: "6px",
    maxHeight: "150px",
    overflowY: "auto",
  },
  nbCheckRow: {
    display: "flex",
    alignItems: "center",
    marginBottom: "4px",
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
