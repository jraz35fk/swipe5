import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// 1) Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  // MAIN STATE
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [places, setPlaces] = useState([]);

  // Indexes: catIndex, subIndex, placeIndex
  const [catIndex, setCatIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [placeIndex, setPlaceIndex] = useState(0);

  // Flow modes: "categories" | "subcategories" | "places" | "matchDeck"
  const [mode, setMode] = useState("categories");

  // Parent selections for breadcrumb or top text
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);

  // Final matches
  const [matches, setMatches] = useState([]);
  const [showCelebration, setShowCelebration] = useState(false);

  // Error
  const [errorMsg, setErrorMsg] = useState(null);

  // 2) Fetch categories & subcategories on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // categories
        const { data: catData, error: catErr } = await supabase
          .from("categories")
          .select("*")
          .order("weight", { ascending: false }); // or not
        if (catErr) throw catErr;

        // subcategories
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

  // Helper for subcats in selectedCategory
  function getSubcatsForCategory(cat) {
    if (!cat) return [];
    return subcategories.filter((s) => s.category_id === cat.id);
  }

  // Current items
  const currentCategory = categories[catIndex] || null;
  const subcatsForCategory = getSubcatsForCategory(selectedCategory);
  const currentSubcategory = subcatsForCategory[subIndex] || null;
  const currentPlace = places[placeIndex] || null;

  // Return an object with {name, image_url} for the current card
  function getCurrentCardData() {
    if (mode === "categories") {
      if (!currentCategory) return null;
      return {
        name: currentCategory.name,
        image_url: currentCategory.image_url || "",
      };
    } else if (mode === "subcategories") {
      if (!currentSubcategory) return null;
      return {
        name: currentSubcategory.name,
        image_url: currentSubcategory.image_url || "",
      };
    } else if (mode === "places") {
      if (!currentPlace) return null;
      return {
        name: currentPlace.name,
        image_url: currentPlace.image_url || "",
      };
    }
    return null;
  }

  // If subcategory or place is missing an image, we fallback
  function getBackgroundImage(imageUrl) {
    return imageUrl && imageUrl.trim() !== ""
      ? imageUrl
      : "/images/default-bg.jpg"; // Fallback
  }

  // Parent text logic
  function getParentText() {
    if (mode === "subcategories" && selectedCategory) {
      return selectedCategory.name;
    }
    if (mode === "places" && selectedSubcategory) {
      return selectedSubcategory.name;
    }
    return "";
  }

  // The current card's info
  const currentCard = getCurrentCardData();
  const parentText = getParentText();

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

  // Go Back & Reshuffle => now at bottom
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

  // If we have no currentCard
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

  // We have a valid card
  const bgImage = getBackgroundImage(currentCard.image_url);

  return (
    <div style={{ ...styles.container, backgroundImage: `url(${bgImage})` }}>
      <div style={styles.overlay}>
        {/* NO / YES icons at the top corners now */}
        <img
          src="/images/no-icon.png" // replace with your own
          alt="No"
          style={styles.noIcon}
          onClick={() => {
            if (mode === "categories") handleNoCategory();
            else if (mode === "subcategories") handleNoSubcategory();
            else handleNoPlace();
          }}
        />
        <img
          src="/images/yes-icon.png" // replace with your own
          alt="Yes"
          style={styles.yesIcon}
          onClick={() => {
            if (mode === "categories") handleYesCategory();
            else if (mode === "subcategories") handleYesSubcategory();
            else handleYesPlace();
          }}
        />

        {/* Parent text (top-left or top-center) */}
        <div style={styles.topTextRow}>
          {parentText && (
            <h2 style={styles.parentText}>
              Explore <span style={styles.parentName}>{parentText}</span>
            </h2>
          )}
        </div>

        {/* Middle area if needed */}
        <div style={styles.centerContent}></div>

        {/* Current card name at bottom */}
        <div style={styles.bottomTextRow}>
          <h1 style={styles.currentCardName}>{currentCard.name}</h1>
          <p style={styles.clickForInfo}>Click for info</p>
        </div>

        {/* Go Back & Reshuffle at bottom corners */}
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
  // NO / YES icons (top corners)
  noIcon: {
    position: "absolute",
    top: "20px",
    left: "20px",
    width: "60px",
    height: "60px",
    cursor: "pointer",
  },
  yesIcon: {
    position: "absolute",
    top: "20px",
    right: "20px",
    width: "60px",
    height: "60px",
    cursor: "pointer",
  },
  topTextRow: {
    padding: "20px",
  },
  parentText: {
    color: "#fff",
    fontSize: "2em",
    margin: 0,
    textTransform: "uppercase",
  },
  parentName: {
    color: "#ffdc00",
    fontSize: "1.2em",
  },
  centerContent: {
    flexGrow: 1,
  },
  bottomTextRow: {
    paddingBottom: "70px",
    textAlign: "center",
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
