import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------
// 1) SUPABASE CLIENT
// ---------------------------------------------------
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  // --------------------------
  // 2) STATE: Data & Workflow
  // --------------------------
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  // We do NOT store all places at once; we fetch them on demand for each subcategory.
  const [mode, setMode] = useState("categories"); // "categories" | "subcategories" | "places" | "matchDeck"
  const [currentList, setCurrentList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Selected category/subcategory for breadcrumb
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);

  // Matches & Favorites
  const [matches, setMatches] = useState([]);
  const [favorites, setFavorites] = useState([]);

  // Celebration
  const [showCelebration, setShowCelebration] = useState(false);

  // Error handling
  const [errorMsg, setErrorMsg] = useState(null);

  // ---------------------------------------------------
  // 3) SKIP TRACKING: No repeats even after "Yes."
  // ---------------------------------------------------
  // We store IDs that we've "used" (Yes or No) so they never show again in that layer.
  const [usedCategories, setUsedCategories] = useState([]);
  const [usedSubcategories, setUsedSubcategories] = useState([]);
  const [usedPlaces, setUsedPlaces] = useState([]);

  // --------------------------
  // 4) INITIAL DATA FETCH
  // --------------------------
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1) Load categories
        const { data: catData, error: catError } = await supabase
          .from("categories")
          .select("*")
          .order("weight", { ascending: false });
        if (catError) throw catError;

        // 2) Load subcategories
        const { data: subData, error: subError } = await supabase
          .from("subcategories")
          .select("*")
          .order("weight", { ascending: false });
        if (subError) throw subError;

        setCategories(catData || []);
        setSubcategories(subData || []);

        // Start with categories (filter out used ones if any)
        const filteredCats = (catData || []).filter(
          (c) => !usedCategories.includes(c.id)
        );
        setMode("categories");
        setCurrentList(filteredCats);
        setCurrentIndex(0);
      } catch (err) {
        setErrorMsg(err.message);
      }
    };

    fetchData();
  }, []);

  // --------------------------
  // 5) HELPER: GO TO SUBCATEGORIES
  // --------------------------
  const goToSubcategories = (category) => {
    // Filter subcategories for this category, removing used ones
    const filteredSubs = subcategories
      .filter((sub) => sub.category_id === category.id)
      .filter((sub) => !usedSubcategories.includes(sub.id));

    setMode("subcategories");
    setCurrentList(filteredSubs);
    setCurrentIndex(0);
  };

  // --------------------------
  // 6) HELPER: GO TO PLACES (bridging)
  // --------------------------
  const goToPlaces = async (subcategory) => {
    try {
      const { data, error } = await supabase
        .from("place_subcategories")
        .select("place_id, places(*)")
        .eq("subcategory_id", subcategory.id);
      if (error) throw error;

      // Map bridging rows to place objects
      let placeItems = data
        .map((row) => row.places)
        .filter((pl) => pl && !usedPlaces.includes(pl.id));

      // Sort by weight descending
      placeItems = placeItems.sort((a, b) => (b.weight || 0) - (a.weight || 0));

      setMode("places");
      setCurrentList(placeItems);
      setCurrentIndex(0);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // --------------------------
  // 7) HELPER: GO TO CATEGORIES
  // --------------------------
  const goToCategories = () => {
    const filteredCats = categories.filter(
      (c) => !usedCategories.includes(c.id)
    );
    setMode("categories");
    setCurrentList(filteredCats);
    setCurrentIndex(0);
  };

  // --------------------------
  // 8) NAVIGATION: GO BACK, RESHUFFLE, SHOW MATCHES
  // --------------------------
  const handleGoBack = async () => {
    if (mode === "places") {
      // Return to subcategories for selectedCategory
      if (!selectedCategory) {
        alert("No selected category. Going back to categories...");
        goToCategories();
        return;
      }
      goToSubcategories(selectedCategory);
    } else if (mode === "subcategories") {
      setSelectedSubcategory(null);
      goToCategories();
    } else if (mode === "matchDeck") {
      // Return to categories from match deck
      setSelectedCategory(null);
      setSelectedSubcategory(null);
      goToCategories();
    } else {
      alert("You're already at the top-level categories!");
    }
  };

  const handleReshuffle = async () => {
    // Clear all used arrays
    setUsedCategories([]);
    setUsedSubcategories([]);
    setUsedPlaces([]);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    // If you want to keep matches, comment these out:
    // setMatches([]);
    // setFavorites([]);

    // Reload categories
    const filteredCats = categories.filter(
      (c) => !usedCategories.includes(c.id)
    );
    setMode("categories");
    setCurrentList(filteredCats);
    setCurrentIndex(0);
  };

  const handleShowMatches = () => {
    setMode("matchDeck");
  };

  // --------------------------
  // 9) SWIPE LOGIC: YES / NO
  // --------------------------
  const handleYes = async () => {
    const currentItem = currentList[currentIndex];
    if (!currentItem) return;

    if (mode === "categories") {
      // We skip it from this list so it won't appear again
      setUsedCategories((prev) => [...prev, currentItem.id]);

      setSelectedCategory(currentItem);
      goToSubcategories(currentItem);
    } else if (mode === "subcategories") {
      setUsedSubcategories((prev) => [...prev, currentItem.id]);

      setSelectedSubcategory(currentItem);
      await goToPlaces(currentItem);
    } else if (mode === "places") {
      // final match
      setUsedPlaces((prev) => [...prev, currentItem.id]);

      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);

      setMatches((prev) => [
        ...prev,
        {
          ...currentItem,
          rating: 0, // default rating
        },
      ]);

      const nextIndex = currentIndex + 1;
      if (nextIndex < currentList.length) {
        setCurrentIndex(nextIndex);
      } else {
        alert("You’ve matched all places in this subcategory!");
      }
    }
  };

  const handleNo = () => {
    const currentItem = currentList[currentIndex];
    if (!currentItem) return;

    // If user says No, also skip it from this layer
    if (mode === "categories") {
      setUsedCategories((prev) => [...prev, currentItem.id]);
    } else if (mode === "subcategories") {
      setUsedSubcategories((prev) => [...prev, currentItem.id]);
    } else if (mode === "places") {
      setUsedPlaces((prev) => [...prev, currentItem.id]);
    }

    // Move to next
    const nextIndex = currentIndex + 1;
    if (nextIndex < currentList.length) {
      setCurrentIndex(nextIndex);
    } else {
      alert(`No more ${mode} left!`);
    }
  };

  // --------------------------
  // 10) MATCH DECK LOGIC
  // --------------------------
  const handleRateMatch = (placeId, newRating) => {
    setMatches((prev) =>
      prev.map((m) => (m.id === placeId ? { ...m, rating: newRating } : m))
    );
  };

  const handleArchive = (placeId) => {
    const placeToArchive = matches.find((m) => m.id === placeId);
    if (placeToArchive) {
      setFavorites((prev) => [...prev, placeToArchive]);
    }
    // optionally remove from matches
    // setMatches((prev) => prev.filter((m) => m.id !== placeId));
  };

  // --------------------------
  // 11) RENDERING
  // --------------------------
  if (mode === "matchDeck") {
    // ---- MATCH DECK MODE ----
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>dialN — Match Deck</h1>
        <button onClick={handleGoBack} style={styles.goBackButton}>
          Go Back
        </button>

        {matches.length === 0 ? (
          <p>You have no matches yet.</p>
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
                    {[0, 1, 2, 3, 4, 5].map((val) => (
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
              {favorites.map((fav) => (
                <li key={fav.id}>
                  {fav.name} (rated {fav.rating})
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // ---- MAIN SWIPE MODES ----
  const currentItem = currentList[currentIndex];
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>dialN</h1>

      {/* Matches Button */}
      <button style={styles.matchesBtn} onClick={handleShowMatches}>
        Matches ({matches.length})
      </button>

      {errorMsg && <p style={{ color: "red" }}>Error: {errorMsg}</p>}

      {/* Breadcrumb */}
      <div style={styles.breadcrumb}>
        {selectedCategory && (
          <p style={styles.smallText}>Category: {selectedCategory.name}</p>
        )}
        {selectedSubcategory && (
          <p style={styles.smallText}>Subcategory: {selectedSubcategory.name}</p>
        )}
      </div>

      {currentItem ? (
        <div style={styles.card}>
          <h2>{currentItem.name}</h2>
          {mode === "categories" && (
            <p style={styles.description}>Category: {currentItem.name}</p>
          )}
          {mode === "subcategories" && (
            <p style={styles.description}>Subcategory: {currentItem.name}</p>
          )}
          {mode === "places" && (
            <>
              <p style={styles.description}>
                Activity: {currentItem.description || currentItem.name}
              </p>
              <p style={styles.description}>
                Address: {currentItem.address || "N/A"}
              </p>
              {currentItem.website_url && (
                <p>
                  <a
                    href={currentItem.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Visit Website
                  </a>
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        <p>No more {mode} to show!</p>
      )}

      <div style={styles.buttonRow}>
        <button onClick={handleNo} style={styles.noButton}>
          No
        </button>
        <button onClick={handleYes} style={styles.yesButton}>
          Yes
        </button>
      </div>

      <div style={styles.navRow}>
        <button onClick={handleGoBack} style={styles.goBackButton}>
          Go Back
        </button>
        <button onClick={handleReshuffle} style={styles.reshuffleButton}>
          Reshuffle
        </button>
      </div>

      {showCelebration && <CelebrationAnimation />}
    </div>
  );
}

// ---------------------------------------------------
// Celebration popup
// ---------------------------------------------------
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

// ---------------------------------------------------
// STYLES
// ---------------------------------------------------
const styles = {
  container: {
    maxWidth: "600px",
    margin: "40px auto",
    fontFamily: "sans-serif",
    textAlign: "center",
    position: "relative",
  },
  title: {
    marginBottom: "20px",
  },
  breadcrumb: {
    marginBottom: "10px",
  },
  smallText: {
    fontSize: "14px",
    margin: 0,
    color: "#777",
  },
  card: {
    border: "1px solid #ccc",
    borderRadius: "10px",
    padding: "20px",
    margin: "20px",
    backgroundColor: "#fff",
  },
  description: {
    color: "#555",
    fontSize: "16px",
  },
  buttonRow: {
    display: "flex",
    justifyContent: "center",
    gap: "20px",
    marginBottom: "20px",
  },
  yesButton: {
    backgroundColor: "#4CAF50",
    color: "#fff",
    border: "none",
    padding: "10px 20px",
    borderRadius: "5px",
    cursor: "pointer",
  },
  noButton: {
    backgroundColor: "#f44336",
    color: "#fff",
    border: "none",
    padding: "10px 20px",
    borderRadius: "5px",
    cursor: "pointer",
  },
  navRow: {
    display: "flex",
    justifyContent: "center",
    gap: "20px",
    marginTop: "10px",
  },
  goBackButton: {
    backgroundColor: "#2196F3",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "5px",
    cursor: "pointer",
  },
  reshuffleButton: {
    backgroundColor: "#9C27B0",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "5px",
    cursor: "pointer",
  },
  matchesBtn: {
    position: "absolute",
    right: "20px",
    top: "20px",
    backgroundColor: "#FF9800",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
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
