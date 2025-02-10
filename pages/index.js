import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  // MAIN STATE
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [places, setPlaces] = useState([]);

  // Indexes for our three-layer flow
  const [catIndex, setCatIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [placeIndex, setPlaceIndex] = useState(0);

  // Flow modes: "categories" | "subcategories" | "places" | "matchDeck"
  const [mode, setMode] = useState("categories");

  // Track what category / subcategory we've selected
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);

  // Matches & favorites
  const [matches, setMatches] = useState([]);
  const [favorites, setFavorites] = useState([]);

  // Celebration & error
  const [showCelebration, setShowCelebration] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Initial fetch of categories & subcategories
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load categories (with image_url)
        const { data: catData, error: catErr } = await supabase
          .from("categories")
          .select("*");
        if (catErr) throw catErr;

        // Load subcategories (with image_url)
        const { data: subData, error: subErr } = await supabase
          .from("subcategories")
          .select("*");
        if (subErr) throw subErr;

        setCategories(catData || []);
        setSubcategories(subData || []);
      } catch (err) {
        setErrorMsg(err.message);
      }
    };
    loadData();
  }, []);

  // Helper: get subcats for selectedCategory
  function getSubcatsForCat(cat) {
    if (!cat) return [];
    return subcategories.filter((s) => s.category_id === cat.id);
  }

  // Identify current items
  const currentCategory = categories[catIndex] || null;
  const subcats = getSubcatsForCat(selectedCategory);
  const currentSubcategory = subcats[subIndex] || null;
  const currentPlace = places[placeIndex] || null;

  // LAYER LOGIC

  // ============ CATEGORIES ============
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

  // ============ SUBCATEGORIES ============
  async function handleYesSubcategory() {
    if (!currentSubcategory) return;
    setSelectedSubcategory(currentSubcategory);

    // fetch places bridging
    try {
      const { data, error } = await supabase
        .from("place_subcategories")
        .select("place_id, places(*)")
        .eq("subcategory_id", currentSubcategory.id);
      if (error) throw error;

      const placeItems = data.map((row) => row.places);
      setPlaces(placeItems);
      setPlaceIndex(0);
      setMode("places");
    } catch (err) {
      setErrorMsg(err.message);
    }
  }
  function handleNoSubcategory() {
    const next = subIndex + 1;
    if (next >= subcats.length) {
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
    }
  }

  // ============ PLACES ============
  function handleYesPlace() {
    if (!currentPlace) return;
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 2000);

    setMatches((prev) => [...prev, { ...currentPlace, rating: 0 }]);

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
    if (next >= subcats.length) {
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

  // MATCH DECK & NAV
  function handleGoBack() {
    if (mode === "places") {
      setMode("subcategories");
    } else if (mode === "subcategories") {
      setMode("categories");
    } else if (mode === "matchDeck") {
      setMode("categories");
    } else {
      alert("Already at top layer!");
    }
  }
  function handleReshuffle() {
    // reset everything
    setCatIndex(0);
    setSubIndex(0);
    setPlaceIndex(0);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setPlaces([]);
    // if you want to reset matches/favorites, uncomment:
    // setMatches([]);
    // setFavorites([]);
    setMode("categories");
  }
  function handleShowMatches() {
    setMode("matchDeck");
  }

  // Rating & Archive
  function handleRateMatch(placeId, newRating) {
    setMatches((prev) =>
      prev.map((m) => (m.id === placeId ? { ...m, rating: newRating } : m))
    );
  }
  function handleArchive(placeId) {
    const found = matches.find((m) => m.id === placeId);
    if (found) {
      setFavorites((prev) => [...prev, found]);
    }
  }

  // RENDER MATCH DECK
  if (mode === "matchDeck") {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>dialN — Match Deck</h1>
        <button onClick={handleGoBack} style={styles.goBackButton}>Go Back</button>
        {matches.length === 0 ? (
          <p>No matches yet!</p>
        ) : (
          <div>
            <h3>Your Matches:</h3>
            {matches.map((m) => (
              <div key={m.id} style={styles.matchCard}>
                <p>
                  <strong>{m.name}</strong>
                </p>
                <label>
                  Rating:{" "}
                  <select
                    value={m.rating || 0}
                    onChange={(e) => handleRateMatch(m.id, Number(e.target.value))}
                  >
                    {[0,1,2,3,4,5].map((val) => (
                      <option key={val} value={val}>
                        {val}
                      </option>
                    ))}
                  </select>
                </label>
                <button onClick={() => handleArchive(m.id)} style={styles.archiveButton}>
                  Archive to Favorites
                </button>
              </div>
            ))}
          </div>
        )}
        {favorites.length > 0 && (
          <div style={styles.favoritesBar}>
            <h3>Favorites:</h3>
            <ul>
              {favorites.map((f) => (
                <li key={f.id}>
                  {f.name} (rated {f.rating})
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // Identify the "current card" + parent text
  let currentCard = null;
  let parentText = "";
  let currentImage = null;
  let currentTitle = "";

  if (mode === "categories") {
    currentCard = currentCategory;
    parentText = ""; // no parent for top-level categories
    currentImage = currentCategory?.image_url || "";
    currentTitle = currentCategory?.name || "";
  } else if (mode === "subcategories") {
    currentCard = currentSubcategory;
    parentText = selectedCategory ? selectedCategory.name : "";
    currentImage = currentSubcategory?.image_url || "";
    currentTitle = currentSubcategory?.name || "";
  } else if (mode === "places") {
    currentCard = currentPlace;
    parentText = selectedSubcategory ? selectedSubcategory.name : "";
    currentImage = currentPlace?.image_url || "";
    currentTitle = currentPlace?.name || "";
  }

  function handleYes() {
    if (mode === "categories") handleYesCategory();
    else if (mode === "subcategories") handleYesSubcategory();
    else if (mode === "places") handleYesPlace();
  }
  function handleNo() {
    if (mode === "categories") handleNoCategory();
    else if (mode === "subcategories") handleNoSubcategory();
    else if (mode === "places") handleNoPlace();
  }

  return (
    <div style={styles.container}>
      <button style={styles.matchesBtn} onClick={handleShowMatches}>
        Matches ({matches.length})
      </button>
      {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}

      {currentCard ? (
        <div
          style={{
            ...styles.cardBackground,
            backgroundImage: `url(${currentImage})`
          }}
        >
          {/* Parent text at top (if any) */}
          {parentText && (
            <div style={styles.parentText}>
              {parentText}
            </div>
          )}

          {/* Title at bottom center */}
          <div style={styles.cardTitle}>
            {currentTitle}
          </div>

          {/* "Click for info" overlay - optional */}
          <div style={styles.infoOverlay}>
            CLICK FOR INFO
          </div>

          {/* Thumbs down (no) / Thumbs up (yes) */}
          <img
            src="/thumbs_down_red.png"
            alt="No"
            onClick={handleNo}
            style={styles.noThumb}
          />
          <img
            src="/thumbs_up_green.png"
            alt="Yes"
            onClick={handleYes}
            style={styles.yesThumb}
          />
        </div>
      ) : (
        <p>No more {mode} left!</p>
      )}

      <div style={styles.navRow}>
        <button onClick={handleGoBack} style={styles.goBackButton}>Go Back</button>
        <button onClick={handleReshuffle} style={styles.reshuffleButton}>Reshuffle</button>
      </div>

      {showCelebration && <CelebrationAnimation />}
    </div>
  );
}

// Celebration overlay
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
    margin: 0,
    padding: 0,
    position: "relative",
    fontFamily: "Arial, sans-serif",
    overflow: "hidden",
  },
  matchesBtn: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 9999,
    backgroundColor: "#FF9800",
    color: "#fff",
    padding: "8px 16px",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  cardBackground: {
    width: "100%",
    height: "100%",
    backgroundSize: "cover",
    backgroundPosition: "center",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  parentText: {
    marginTop: "20px",
    marginLeft: "20px",
    color: "#FFD700",
    fontSize: "3rem",
    textShadow: "2px 2px 4px #000",
  },
  cardTitle: {
    color: "#fff",
    fontSize: "4rem",
    textAlign: "center",
    marginBottom: "40px",
    textShadow: "3px 3px 6px #000",
  },
  infoOverlay: {
    position: "absolute",
    bottom: 0,
    color: "#fff",
    backgroundColor: "rgba(0,0,0,0.3)",
    padding: "10px",
    fontSize: "1.5rem",
    left: "50%",
    transform: "translateX(-50%)",
    marginBottom: "10rem",
    textShadow: "2px 2px 4px #000",
    cursor: "pointer",
  },
  noThumb: {
    position: "absolute",
    bottom: "20px",
    left: "30px",
    width: "80px",
    height: "80px",
    cursor: "pointer",
  },
  yesThumb: {
    position: "absolute",
    bottom: "20px",
    right: "30px",
    width: "80px",
    height: "80px",
    cursor: "pointer",
  },
  navRow: {
    position: "absolute",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    gap: "20px",
    zIndex: 9999,
  },
  goBackButton: {
    backgroundColor: "#2196F3",
    color: "#fff",
    border: "none",
    padding: "10px 20px",
    borderRadius: "5px",
    cursor: "pointer",
  },
  reshuffleButton: {
    backgroundColor: "#9C27B0",
    color: "#fff",
    border: "none",
    padding: "10px 20px",
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
    zIndex: 99999,
  },
  celebrationBox: {
    backgroundColor: "#fff",
    padding: "30px",
    borderRadius: "10px",
    textAlign: "center",
    animation: "popIn 0.5s ease",
  },
  title: {
    position: "absolute",
    top: 10,
    left: 10,
    fontSize: "1px", // We'll hide it but keep the structure if needed
    color: "#fff",
  },
  // Match deck styles
  matchCard: {
    backgroundColor: "#eee",
    padding: "10px",
    margin: "10px",
    borderRadius: "8px",
  },
  archiveButton: {
    marginLeft: "10px",
    backgroundColor: "#9C27B0",
    color: "#fff",
    border: "none",
    padding: "6px 12px",
    borderRadius: "5px",
    cursor: "pointer",
  },
  favoritesBar: {
    marginTop: "30px",
    borderTop: "1px solid #ccc",
    paddingTop: "10px",
  },
};
