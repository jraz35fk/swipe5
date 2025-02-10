import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  // MAIN STATE
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [places, setPlaces] = useState([]);

  // Index flow
  const [catIndex, setCatIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [placeIndex, setPlaceIndex] = useState(0);
  const [mode, setMode] = useState("categories"); // "categories", "subcategories", "places"

  // Selected category/subcategory
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);

  // Matches + Celebration
  const [matches, setMatches] = useState([]);
  const [showCelebration, setShowCelebration] = useState(false);

  // Error
  const [errorMsg, setErrorMsg] = useState(null);

  // NEIGHBORHOOD UI
  // For each category, we fetch distinct neighborhoods that have places in that category
  const [allNeighborhoodsForCategory, setAllNeighborhoodsForCategory] = useState([]);
  // Which neighborhoods are "enabled"? By default, all are enabled
  const [enabledNeighborhoods, setEnabledNeighborhoods] = useState([]);

  // 1) On mount, fetch categories & subcategories
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: catData, error: catErr } = await supabase
          .from("categories")
          .select("*")
          .order("weight", { ascending: false });
        if (catErr) throw catErr;

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
    };
    loadData();
  }, []);

  // Helper: filter subcats for category
  function getSubcatsForCategory(cat) {
    if (!cat) return [];
    return subcategories.filter((s) => s.category_id === cat.id);
  }

  // Current items
  const currentCategory = categories[catIndex] || null;
  const subcatsForCategory = getSubcatsForCategory(selectedCategory);
  const currentSubcategory = subcatsForCategory[subIndex] || null;
  const currentPlace = places[placeIndex] || null;

  // Return { name, image_url } for the current item
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
      return currentPlace
        ? {
            name: currentPlace.name,
            image_url: currentPlace.image_url || "",
          }
        : null;
    }
    return null;
  }

  // Fallback image
  function getBackgroundImage(url) {
    return url && url.trim() !== "" ? url : "/images/default-bg.jpg";
  }

  // Left breadcrumb
  function getLeftBreadcrumb() {
    if (mode === "subcategories" && selectedCategory) {
      return selectedCategory.name;
    }
    if (mode === "places" && selectedCategory && selectedSubcategory) {
      return `${selectedCategory.name} -> ${selectedSubcategory.name}`;
    }
    return "";
  }

  // Right text: If places mode & place has neighborhood => "USA -> Baltimore -> Neighborhood"
  function getRightNeighborhood() {
    if (mode === "places" && currentPlace && currentPlace.neighborhood) {
      return `USA -> Baltimore -> ${currentPlace.neighborhood}`;
    }
    return "";
  }

  // ============= NEIGHBORHOOD LOGIC =============
  // We only show the NeighborhoodSelector in "categories" mode (the first layer).
  // Then the user picks a category, we gather neighborhoods for that category's places.
  // All are enabled by default. If user toggles them, we reorder the places in subcategory -> places step.

  // 1) If we are in categories mode, load the neighborhoods for the current category
  useEffect(() => {
    if (mode === "categories" && currentCategory) {
      fetchNeighborhoodsForCategory(currentCategory.id);
    }
  }, [mode, catIndex]);

  async function fetchNeighborhoodsForCategory(categoryId) {
    try {
      // We want distinct neighborhoods for all places that belong to subcategories of this category
      // We'll do a bridging query: subcategories -> place_subcategories -> places
      // But let's do a simpler approach: get subcategories => get place_subcategories => ...
      // Or we can do a custom RPC. For demonstration, let's do a simpler approach:

      const { data: subcatData, error: scErr } = await supabase
        .from("subcategories")
        .select("id")
        .eq("category_id", categoryId);

      if (scErr) throw scErr;
      if (!subcatData || subcatData.length === 0) {
        setAllNeighborhoodsForCategory([]);
        setEnabledNeighborhoods([]);
        return;
      }

      const subcatIds = subcatData.map((s) => s.id);

      // Now fetch place_subcategories for those subcatIds
      const { data: bridgingData, error: brErr } = await supabase
        .from("place_subcategories")
        .select("place_id, places(*)")
        .in("subcategory_id", subcatIds);

      if (brErr) throw brErr;

      // from bridgingData, gather distinct neighborhoods
      const neighborhoodsSet = new Set();
      bridgingData.forEach((row) => {
        if (row.places.neighborhood) {
          neighborhoodsSet.add(row.places.neighborhood);
        }
      });

      const neighborhoodsArray = Array.from(neighborhoodsSet);

      // We can order them by place_count if we want. Let's do that quickly:
      // We'll count how many places are in each neighborhood
      const countMap = {};
      bridgingData.forEach((row) => {
        const nb = row.places.neighborhood;
        if (!nb) return;
        countMap[nb] = (countMap[nb] || 0) + 1;
      });
      neighborhoodsArray.sort((a, b) => (countMap[b] || 0) - (countMap[a] || 0));

      setAllNeighborhoodsForCategory(neighborhoodsArray);
      setEnabledNeighborhoods(neighborhoodsArray); // by default, ALL are enabled
    } catch (error) {
      console.error("fetchNeighborhoodsForCategory error:", error);
    }
  }

  // Toggle a neighborhood (enable/disable)
  function toggleNeighborhood(nb) {
    if (enabledNeighborhoods.includes(nb)) {
      // remove it
      const newList = enabledNeighborhoods.filter((x) => x !== nb);
      setEnabledNeighborhoods(newList);
    } else {
      // add it
      const newList = [...enabledNeighborhoods, nb];
      setEnabledNeighborhoods(newList);
    }
  }

  // We'll reorder places to put "enabled" neighborhoods first. If a place's neighborhood is not in enabledNeighborhoods, it goes after.
  // We'll do this reordering after we fetch subcategory -> places
  function reorderPlacesByNeighborhood(placesArray) {
    // if no neighborhoods are disabled, we just keep as is
    if (!enabledNeighborhoods || enabledNeighborhoods.length === 0) {
      return placesArray; // all are disabled?? means they'd all go last. But let's keep it simple
    }
    // if all are enabled => no reorder
    if (
      allNeighborhoodsForCategory.length > 0 &&
      enabledNeighborhoods.length === allNeighborhoodsForCategory.length
    ) {
      return placesArray;
    }

    // separate into enabled vs. disabled
    const enabledSet = new Set(enabledNeighborhoods);
    const enabledPlaces = [];
    const disabledPlaces = [];
    placesArray.forEach((p) => {
      if (!p.neighborhood) {
        // treat missing as disabled? or put it last
        disabledPlaces.push(p);
      } else if (enabledSet.has(p.neighborhood)) {
        enabledPlaces.push(p);
      } else {
        disabledPlaces.push(p);
      }
    });
    return [...enabledPlaces, ...disabledPlaces];
  }

  // ============= CATEGORIES LAYER =============
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

  // ============= SUBCATEGORIES LAYER =============
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

      // now reorder by neighborhood preference
      placeItems = reorderPlacesByNeighborhood(placeItems);

      setPlaces(placeItems);
      setPlaceIndex(0);
      setMode("places");
    } catch (err) {
      setErrorMsg(err.message);
    }
  }
  function handleNoSubcategory() {
    const next = subIndex + 1;
    if (next >= subcatsForCategory.length) {
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

  // ============= PLACES LAYER =============
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
    const next = subIndex + 1;
    if (next >= subcatsForCategory.length) {
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

  // Go Back & Reshuffle
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
    // re-enable all neighborhoods
    setEnabledNeighborhoods(allNeighborhoodsForCategory);
    setMode("categories");
  }

  // Construct the current card for the UI
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

  // Left breadcrumb
  function getLeftBreadcrumb() {
    if (mode === "subcategories" && selectedCategory) {
      return selectedCategory.name;
    }
    if (mode === "places" && selectedCategory && selectedSubcategory) {
      return `${selectedCategory.name} -> ${selectedSubcategory.name}`;
    }
    return "";
  }
  const leftText = getLeftBreadcrumb();

  // Right text (only for places mode)
  function getRightText() {
    if (mode === "places" && currentPlace && currentPlace.neighborhood) {
      return `USA -> Baltimore -> ${currentPlace.neighborhood}`;
    }
    return "";
  }
  const rightText = getRightText();

  return (
    <div style={{ ...styles.container, backgroundImage: `url(${bgImage})` }}>
      <div style={styles.overlay}>

        {/* TOP ROW */}
        <div style={styles.topRow}>
          <div style={styles.leftText}>{leftText}</div>

          {/* If we are in categories mode, show the NeighborhoodSelector. */}
          {mode === "categories" && currentCategory && (
            <NeighborhoodSelector
              neighborhoods={allNeighborhoodsForCategory}
              enabledNeighborhoods={enabledNeighborhoods}
              onToggle={toggleNeighborhood}
            />
          )}

          <div style={styles.rightText}>{rightText}</div>
        </div>

        <div style={styles.centerContent}></div>

        {/* BOTTOM ROW (CARD NAME + YES/NO) */}
        <div style={styles.bottomTextRow}>
          <h1 style={styles.currentCardName}>{currentCard.name}</h1>
          <p style={styles.clickForInfo}>Click for info</p>

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

// A simple multi-checkbox selector for neighborhoods
function NeighborhoodSelector({ neighborhoods, enabledNeighborhoods, onToggle }) {
  return (
    <div style={styles.neighborhoodSelector}>
      <p style={{ margin: 0, color: "#fff" }}>Neighborhoods:</p>
      {neighborhoods.map((nb) => {
        const isEnabled = enabledNeighborhoods.includes(nb);
        return (
          <div key={nb} style={styles.neighborhoodCheckRow}>
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={() => onToggle(nb)}
            />
            <label style={{ marginLeft: "5px", color: isEnabled ? "#0f0" : "#fff" }}>
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
    alignItems: "center",
    padding: "10px 20px",
  },
  leftText: {
    color: "#fff",
    fontSize: "1.4em",
    textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
    margin: 0,
    textTransform: "uppercase",
  },
  rightText: {
    color: "#ffdc00",
    fontSize: "1.2em",
    textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
    margin: 0,
    textAlign: "right",
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
  clickForInfo: {
    color: "#fff",
    textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
    marginTop: "10px",
    fontSize: "1em",
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
  // Neighborhood selector style
  neighborhoodSelector: {
    display: "flex",
    flexDirection: "column",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: "10px",
    borderRadius: "8px",
    maxHeight: "200px",
    overflowY: "auto",
  },
  neighborhoodCheckRow: {
    display: "flex",
    alignItems: "center",
    marginBottom: "4px",
  },
};
