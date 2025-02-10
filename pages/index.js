import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  // MAIN STATE
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [places, setPlaces] = useState([]);

  // Indexes for each layer
  const [catIndex, setCatIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [placeIndex, setPlaceIndex] = useState(0);

  // "mode": "categories" | "subcategories" | "places"
  const [mode, setMode] = useState("categories");

  // Selected parent items
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);

  // For final matches & celebration
  const [matches, setMatches] = useState([]);
  const [showCelebration, setShowCelebration] = useState(false);

  // Error handling
  const [errorMsg, setErrorMsg] = useState(null);

  // 1) Fetch categories & subcategories on mount
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

  // Helper: subcats for a given category
  function getSubcatsForCategory(cat) {
    if (!cat) return [];
    return subcategories.filter((s) => s.category_id === cat.id);
  }

  // Current items
  const currentCategory = categories[catIndex] || null;
  const subcatsForCategory = getSubcatsForCategory(selectedCategory);
  const currentSubcategory = subcatsForCategory[subIndex] || null;
  const currentPlace = places[placeIndex] || null;

  // Return {name, image_url} for the current card
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

  // Fallback if no image_url
  function getBackgroundImage(url) {
    return url && url.trim() !== "" ? url : "/images/default-bg.jpg";
  }

  // Left side: Category -> Subcategory breadcrumb
  // - If subcategories mode => show category name
  // - If places mode => show "Category -> Subcategory"
  function getLeftBreadcrumb() {
    if (mode === "subcategories" && selectedCategory) {
      return selectedCategory.name;
    }
    if (mode === "places" && selectedCategory && selectedSubcategory) {
      return `${selectedCategory.name} -> ${selectedSubcategory.name}`;
    }
    return "";
  }

  // Right side: "USA -> Baltimore -> Neighborhood" if we're in places mode
  //   and the current place has a neighborhood
  function getRightNeighborhood() {
    if (mode === "places" && currentPlace && currentPlace.neighborhood) {
      return `USA -> Baltimore -> ${currentPlace.neighborhood}`;
    }
    return "";
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

      const placeItems = data.map((row) => row.places);
      placeItems.sort((a, b) => (b.weight || 0) - (a.weight || 0));
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

  // Go Back & Reshuffle => bottom corners
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

  // Background image fallback
  const bgImage = getBackgroundImage(currentCard.image_url);

  // Build top-left + top-right text
  const leftText = getLeftBreadcrumb();         // e.g. "Food & Dining -> Cafés"
  const rightText = getRightNeighborhood();     // e.g. "USA -> Baltimore -> Fells Point"

  return (
    <div style={{ ...styles.container, backgroundImage: `url(${bgImage})` }}>
      <div style={styles.overlay}>

        {/* Top row with left + right text */}
        <div style={styles.topRow}>
          <div style={styles.leftText}>{leftText}</div>
          <div style={styles.rightText}>{rightText}</div>
        </div>

        {/* Center content can remain empty or for future usage */}
        <div style={styles.centerContent}></div>

        {/* Bottom text row with card name, yes/no */}
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

        {/* Bottom corners: Go Back + Reshuffle */}
        <button style={styles.goBackButton} onClick={handleGoBack}>
          Go Back
        </button>
        <button style={styles.reshuffleButton} onClick={handleReshuffle}>
          Reshuffle
        </button>
      </div>

      {showCelebration && <CelebrationAnimation />}
      {errorMsg && (
        <p style={{ color: "red", position: "absolute", top: "10px", left: "10px" }}>
          {errorMsg}
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
    alignItems: "center",
    padding: "20px",
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
    marginBottom: "70px", // space for bottom corners
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
};
