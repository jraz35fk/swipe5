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

  // 2) NEIGHBORHOODS
  // We'll fetch all distinct neighborhoods once, 
  // then separate them into "within 5 miles" vs "outside city"
  const [allNeighborhoods, setAllNeighborhoods] = useState([]);
  const [enabledNeighborhoods, setEnabledNeighborhoods] = useState([]);

  // On mount: load categories/subcategories & neighborhoods
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

      // sort them alphabetically or some custom logic
      nbArray.sort();

      setAllNeighborhoods(nbArray);
      setEnabledNeighborhoods(nbArray); // all enabled
    } catch (err) {
      console.error("Error loading neighborhoods:", err);
    }
  }

  // Toggling neighborhoods
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

  // reorder places => enabled neighborhoods first, then disabled
  function reorderPlacesByNeighborhood(placesArray) {
    if (!placesArray || placesArray.length === 0) return placesArray;
    if (!enabledNeighborhoods || enabledNeighborhoods.length === 0) {
      // if none are enabled => no special reorder
      return placesArray;
    }
    if (enabledNeighborhoods.length === allNeighborhoods.length) {
      // if all enabled => no reorder
      return placesArray;
    }
    const enabledSet = new Set(enabledNeighborhoods);
    const enabledList = [];
    const disabledList = [];
    placesArray.forEach((p) => {
      if (!p.neighborhood) {
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
      // sort by weight
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
            {/* NeighborhoodSelector below "USA -> Baltimore" */}
            <NeighborhoodSelector
              allNeighborhoods={allNeighborhoods}
              enabledNeighborhoods={enabledNeighborhoods}
              onToggle={toggleNeighborhood}
            />
          </div>
        </div>

        <div style={styles.centerContent}></div>

        {/* BOTTOM ROW: card name, maybe neighborhood if place, yes/no */}
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

// NeighborhoodSelector => splits neighborhoods into within 5 miles vs outside city
function NeighborhoodSelector({ allNeighborhoods, enabledNeighborhoods, onToggle }) {
  if (!allNeighborhoods || allNeighborhoods.length === 0) {
    return null;
  }

  // Define your "within 5 miles" set manually:
  const withinSet = new Set([
    "Federal Hill",
    "Fells Point",
    "Canton",
    "Mount Vernon",
    "Locust Point",
    "Remington",
    "Hampden",
    "Station North",
    "Highlandtown",
    "Little Italy",
    "Patterson Park",
    "Downtown",
    "Harbor East",
    "Inner Harbor",
    "Woodberry",
    "Hamilton",
    "Charles Village",
    "Upton",
    "Poppleton",
    "Old Goucher",
    "Jonestown",
    // add more as needed
  ]);

  const [showOutside, setShowOutside] = useState(false);

  // separate them
  const withinMiles = [];
  const outsideCity = [];
  allNeighborhoods.forEach((nb) => {
    if (withinSet.has(nb)) {
      withinMiles.push(nb);
    } else {
      outsideCity.push(nb);
    }
  });

  // If you want "withinMiles" sorted by name or other logic, we can do:
  withinMiles.sort();
  outsideCity.sort();

  return (
    <div style={styles.nbSelectorContainer}>
      <div style={{ fontWeight: "bold", marginBottom: "5px" }}>Neighborhoods</div>

      {/* Within city */}
      {withinMiles.map((nb) => {
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

      {/* OUTSIDE CITY (collapsible) */}
      <div style={{ marginTop: "8px" }}>
        <button
          style={styles.outsideToggleBtn}
          onClick={() => setShowOutside(!showOutside)}
        >
          {showOutside ? "Hide Outside City" : "Show Outside City"}
        </button>
      </div>
      {showOutside && (
        <div style={{ marginTop: "5px" }}>
          {outsideCity.map((nb) => {
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
  nbSelectorContainer: {
    marginTop: "8px",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: "8px",
    borderRadius: "6px",
    maxHeight: "170px",
    overflowY: "auto",
  },
  nbCheckRow: {
    display: "flex",
    alignItems: "center",
    marginBottom: "4px",
  },
  outsideToggleBtn: {
    border: "none",
    backgroundColor: "#444",
    color: "#fff",
    padding: "5px 10px",
    borderRadius: "4px",
    cursor: "pointer",
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
