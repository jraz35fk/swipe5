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
  // ---------------------------------------------------
  // 2) STATE: Data Arrays, Current Flow, Matches, etc.
  // ---------------------------------------------------
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  // We do NOT store all places at once. We fetch them on demand for each subcategory.
  const [mode, setMode] = useState("categories"); // can be "categories", "subcategories", "places", or "matchDeck"
  const [currentList, setCurrentList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Selected category/subcategory for breadcrumbs
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);

  // For final matches and favorites
  const [matches, setMatches] = useState([]);
  const [favorites, setFavorites] = useState([]);

  // Show/hide celebration animation
  const [showCelebration, setShowCelebration] = useState(false);

  // Error messaging
  const [errorMsg, setErrorMsg] = useState(null);

  // ---------------------------------------------------
  // 3) SKIP TRACKING (No repeats)
  // ---------------------------------------------------
  const [skippedCategories, setSkippedCategories] = useState([]);
  const [skippedSubcategories, setSkippedSubcategories] = useState([]);
  const [skippedPlaces, setSkippedPlaces] = useState([]);

  // ---------------------------------------------------
  // 4) INITIAL DATA FETCH: Categories & Subcategories
  // ---------------------------------------------------
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch categories (ordered by weight descending, so high weight appears first)
        const { data: catData, error: catError } = await supabase
          .from("categories")
          .select("*")
          .order("weight", { ascending: false });
        if (catError) throw catError;

        // Fetch subcategories
        const { data: subData, error: subError } = await supabase
          .from("subcategories")
          .select("*")
          .order("weight", { ascending: false });
        if (subError) throw subError;

        setCategories(catData || []);
        setSubcategories(subData || []);

        // Start with categories (filter out any that were previously skipped, if any)
        const filteredCats = (catData || []).filter(
          (cat) => !skippedCategories.includes(cat.id)
        );
        setCurrentList(filteredCats);
        setMode("categories");
        setCurrentIndex(0);
      } catch (err) {
        setErrorMsg(err.message);
      }
    };

    fetchInitialData();
  }, []);

  // ---------------------------------------------------
  // 5) HELPER FUNCTIONS TO LOAD THE NEXT "LAYER"
  // ---------------------------------------------------
  // Move from categories to subcategories
  const goToSubcategories = (category) => {
    // Filter subcategories by category_id
    const filteredSubs = subcategories
      .filter((sub) => sub.category_id === category.id)
      .filter((sub) => !skippedSubcategories.includes(sub.id));

    setMode("subcategories");
    setCurrentList(filteredSubs);
    setCurrentIndex(0);
  };

  // Move from subcategories to places (bridging table)
  const goToPlaces = async (subcategory) => {
    try {
      // place_subcategories -> places(*)
      // So if a place belongs to multiple subcategories, it can appear in multiple flows
      const { data, error } = await supabase
        .from("place_subcategories")
        .select("place_id, places(*)")
        .eq("subcategory_id", subcategory.id);

      if (error) throw error;

      // `data` = array of { place_id, places: { ...placeRow } }
      let placeItems = data
        .map((row) => row.places)
        .filter((pl) => pl && !skippedPlaces.includes(pl.id));

      // Sort by weight descending (optional: highest priority first)
      placeItems = placeItems.sort((a, b) => (b.weight || 0) - (a.weight || 0));

      setMode("places");
      setCurrentList(placeItems);
      setCurrentIndex(0);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Go back to top-level categories
  const goToCategories = () => {
    const filteredCats = categories.filter(
      (cat) => !skippedCategories.includes(cat.id)
    );
    setMode("categories");
    setCurrentList(filteredCats);
    setCurrentIndex(0);
  };

  // ---------------------------------------------------
  // 6) NAVIGATION: Go Back, Reshuffle, Show Matches
  // ---------------------------------------------------
  const handleGoBack = async () => {
    if (mode === "places") {
      // Go back to subcategories for the selectedCategory
      if (!selectedCategory) {
        alert("No selected category. Returning to categories...");
        goToCategories();
        return;
      }
      goToSubcategories(selectedCategory);
    } else if (mode === "subcategories") {
      // Go back to categories
      setSelectedSubcategory(null);
      goToCategories();
    } else if (mode === "matchDeck") {
      // Return to categories from the match deck
      setSelectedCategory(null);
      setSelectedSubcategory(null);
      goToCategories();
    } else {
      alert("You're already at the top-level categories!");
    }
  };

  // Reshuffle: clears skip arrays, resets matches/favorites if you want
  const handleReshuffle = async () => {
    setSkippedCategories([]);
    setSkippedSubcategories([]);
    setSkippedPlaces([]);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    // If you want to keep matches/favorites, comment these out
    // setMatches([]);
    // setFavorites([]);

    // Go back to categories
    const filteredCats = categories.filter(
      (cat) => !skippedCategories.includes(cat.id)
    );
    setMode("categories");
    setCurrentList(filteredCats);
    setCurrentIndex(0);
  };

  const handleShowMatches = () => {
    setMode("matchDeck");
  };

  // ---------------------------------------------------
  // 7) SWIPE LOGIC: Yes / No
  // ---------------------------------------------------
  const handleYes = async () => {
    const item = currentList[currentIndex];
    if (!item) return;

    if (mode === "categories") {
      // user accepted this category
      setSelectedCategory(item);
      goToSubcategories(item);
    } else if (mode === "subcategories") {
      // user accepted this subcategory
      setSelectedSubcategory(item);
      await goToPlaces(item);
    } else if (mode === "places") {
      // final match
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);

      setMatches((prev) => [
        ...prev,
        {
          ...item,
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
    const item = currentList[currentIndex];
    if (!item) return;

    // Mark it as skipped
    if (mode === "categories") {
      setSkippedCategories((prev) => [...prev, item.id]);
    } else if (mode === "subcategories") {
      setSkippedSubcategories((prev) => [...prev, item.id]);
    } else if (mode === "places") {
      setSkippedPlaces((prev) => [...prev, item.id]);
    }

    // Move to next item
    const nextIndex = currentIndex + 1;
    if (nextIndex < currentList.length) {
      setCurrentIndex(nextIndex);
    } else {
      alert(`No more ${mode} left!`);
    }
  };

  // ---------------------------------------------------
  // 8) MATCH DECK: Rating & Archiving
  // ---------------------------------------------------
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
    // Optionally remove from matches if you want:
    // setMatches(prev => prev.filter(m => m.id !== placeId));
  };

  // ---------------------------------------------------
  // 9) RENDER MODES
  // ---------------------------------------------------
  // MATCH DECK VIEW
  if (mode === "matchDeck") {
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

  // MAIN SWIPE PAGE
  const currentItem = currentList[currentIndex];

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>dialN</h1>

      <button style={styles.matchesBtn} onClick={handleShowMatches}>
        Matches ({matches.length})
      </button>

      {errorMsg && <p style={{ color: "red" }}>Error: {errorMsg}</p>}

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
            <p style={styles.description}>
              This is a category: {currentItem.name}
            </p>
          )}
          {mode === "subcategories" && (
            <p style={styles.description}>
              This is a subcategory: {currentItem.name}
            </p>
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
// 10) CELEBRATION COMPONENT
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
// 11) STYLES
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
