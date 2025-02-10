import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Create the Supabase client from env variables
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  // -------------------
  //      DATA STATE
  // -------------------
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [places, setPlaces] = useState([]);

  // 'mode' controls the current layer: "categories", "subcategories", "places", or "matchDeck"
  const [mode, setMode] = useState("categories");

  // Current list of items to swipe through + current index
  const [currentList, setCurrentList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Track user’s chosen Category/Subcategory for breadcrumbs
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);

  // Matches array: places user said "Yes" to (final step)
  const [matches, setMatches] = useState([]);

  // Favorites array: items user archives from the match deck
  const [favorites, setFavorites] = useState([]);

  // Show/hide the celebratory animation
  const [showCelebration, setShowCelebration] = useState(false);

  // Error messaging
  const [errorMsg, setErrorMsg] = useState(null);

  // -------------------
  //   SKIP TRACKING
  // -------------------
  // We store IDs of items the user clicked "No" on so they don't reappear.
  const [skippedCategories, setSkippedCategories] = useState([]);
  const [skippedSubcategories, setSkippedSubcategories] = useState([]);
  const [skippedPlaces, setSkippedPlaces] = useState([]);

  // -------------------
  //    FETCH DATA
  // -------------------
  useEffect(() => {
    const fetchTables = async () => {
      try {
        // Fetch all tables in parallel
        const [catRes, subRes, placesRes] = await Promise.all([
          supabase.from("categories").select("*"),
          supabase.from("subcategories").select("*"),
          supabase.from("places").select("*"),
        ]);

        if (catRes.error) throw catRes.error;
        if (subRes.error) throw subRes.error;
        if (placesRes.error) throw placesRes.error;

        setCategories(catRes.data || []);
        setSubcategories(subRes.data || []);
        setPlaces(placesRes.data || []);

        // Start with categories
        setMode("categories");
        // Filter out any skipped categories (none yet, but let's be consistent)
        const filteredCats = (catRes.data || []).filter(
          (c) => !skippedCategories.includes(c.id)
        );
        setCurrentList(filteredCats);
        setCurrentIndex(0);
      } catch (error) {
        setErrorMsg(error.message);
      }
    };

    fetchTables();
  }, []);

  // -------------------
  //   NAVIGATION
  // -------------------
  const handleGoBack = () => {
    if (mode === "places") {
      // Return to subcategories
      if (selectedCategory) {
        // Filter subcategories for this category, excluding any we skipped
        const filteredSubs = subcategories
          .filter((sub) => sub.category_id === selectedCategory.id)
          .filter((sub) => !skippedSubcategories.includes(sub.id));

        setMode("subcategories");
        setCurrentList(filteredSubs);
        setCurrentIndex(0);
      }
    } else if (mode === "subcategories") {
      // Return to categories, excluding skipped
      const filteredCats = categories.filter(
        (c) => !skippedCategories.includes(c.id)
      );
      setMode("categories");
      setCurrentList(filteredCats);
      setCurrentIndex(0);
      // We keep the selectedSubcategory null because we're back at categories
      setSelectedSubcategory(null);
    } else if (mode === "matchDeck") {
      // Leaving match deck -> return to categories (or subcategories if you prefer)
      const filteredCats = categories.filter(
        (c) => !skippedCategories.includes(c.id)
      );
      setMode("categories");
      setCurrentList(filteredCats);
      setCurrentIndex(0);
      setSelectedCategory(null);
      setSelectedSubcategory(null);
    } else {
      // Already at categories
      alert("You're already at the top-level categories!");
    }
  };

  // Reset everything (including skip arrays)
  const handleReshuffle = () => {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setMode("categories");
    setErrorMsg(null);
    setCurrentIndex(0);
    // Clear skip arrays
    setSkippedCategories([]);
    setSkippedSubcategories([]);
    setSkippedPlaces([]);

    // Reset the matches & favorites? (optional)
    // setMatches([]);
    // setFavorites([]);

    // Refresh the filtered categories
    const filteredCats = categories.filter(
      (c) => !skippedCategories.includes(c.id)
    );
    setCurrentList(filteredCats);
  };

  // Show the match deck
  const handleShowMatches = () => {
    setMode("matchDeck");
  };

  // -------------------
  //    SWIPE LOGIC
  // -------------------
  const handleYes = () => {
    if (mode === "categories") {
      // Chose a category
      const acceptedCategory = currentList[currentIndex];
      setSelectedCategory(acceptedCategory);

      // Filter subcategories for that category, excluding skipped
      const filteredSubs = subcategories
        .filter((sub) => sub.category_id === acceptedCategory.id)
        .filter((sub) => !skippedSubcategories.includes(sub.id));

      setMode("subcategories");
      setCurrentList(filteredSubs);
      setCurrentIndex(0);
    } else if (mode === "subcategories") {
      // Chose a subcategory
      const acceptedSub = currentList[currentIndex];
      setSelectedSubcategory(acceptedSub);

      // Filter places for that subcategory, excluding skipped
      const filteredPlaces = places
        .filter((pl) => pl.subcategory_id === acceptedSub.id)
        .filter((pl) => !skippedPlaces.includes(pl.id));

      setMode("places");
      setCurrentList(filteredPlaces);
      setCurrentIndex(0);
    } else if (mode === "places") {
      // Final match scenario
      const matchedPlace = currentList[currentIndex];

      // 1) Show celebration animation
      setShowCelebration(true);
      setTimeout(() => {
        setShowCelebration(false);
      }, 2000);

      // 2) Add to matches deck
      setMatches((prev) => [
        ...prev,
        {
          ...matchedPlace,
          rating: 0, // default rating
        },
      ]);

      // 3) Move to next place card
      const nextIndex = currentIndex + 1;
      if (nextIndex < currentList.length) {
        setCurrentIndex(nextIndex);
      } else {
        alert("You’ve matched all places in this subcategory!");
      }
    }
  };

  const handleNo = () => {
    if (!currentList[currentIndex]) return;
    const itemId = currentList[currentIndex].id;

    // Mark this item as skipped
    if (mode === "categories") {
      setSkippedCategories((prev) => [...prev, itemId]);
    } else if (mode === "subcategories") {
      setSkippedSubcategories((prev) => [...prev, itemId]);
    } else if (mode === "places") {
      setSkippedPlaces((prev) => [...prev, itemId]);
    }

    // Move to the next item
    const nextIndex = currentIndex + 1;
    if (nextIndex < currentList.length) {
      setCurrentIndex(nextIndex);
    } else {
      alert(`No more ${mode} left!`);
    }
  };

  const currentCard = currentList[currentIndex];

  // -------------------
  //   MATCH DECK LOGIC
  // -------------------
  const handleRateMatch = (placeId, newRating) => {
    setMatches((prevMatches) =>
      prevMatches.map((m) =>
        m.id === placeId ? { ...m, rating: newRating } : m
      )
    );
  };

  const handleArchive = (placeId) => {
    // Move the matched place to "favorites"
    const placeToArchive = matches.find((m) => m.id === placeId);
    if (placeToArchive) {
      setFavorites((prev) => [...prev, placeToArchive]);
    }
    // Optionally remove from matches
    // setMatches(prev => prev.filter(m => m.id !== placeId));
  };

  // -------------------
  //   RENDER MODES
  // -------------------
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
                    <option value={0}>0</option>
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                    <option value={5}>5</option>
                  </select>
                </label>
                <button onClick={() => handleArchive(m.id)} style={styles.archiveButton}>
                  Archive to Favorites
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Favorites bar */}
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

  // -------------------
  //  MAIN SWIPE PAGE
  // -------------------
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>dialN</h1>

      {/* Notification-style Matches Button */}
      <button style={styles.matchesBtn} onClick={handleShowMatches}>
        Matches ({matches.length})
      </button>

      {/* Show error if any */}
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

      {/* Current card */}
      {currentCard ? (
        <div style={styles.card}>
          {mode === "categories" && (
            <>
              <h2>{currentCard.name}</h2>
              <p style={styles.description}>
                This is a category: {currentCard.name}
              </p>
            </>
          )}
          {mode === "subcategories" && (
            <>
              <h2>{currentCard.name}</h2>
              <p style={styles.description}>
                This is a subcategory: {currentCard.name}
              </p>
            </>
          )}
          {mode === "places" && (
            <>
              <h2>{currentCard.name}</h2>
              <p style={styles.description}>
                Location/Activity: {currentCard.name}
              </p>
            </>
          )}
        </div>
      ) : (
        <p>No more {mode} to show!</p>
      )}

      {/* Yes / No Buttons */}
      <div style={styles.buttonRow}>
        <button onClick={handleNo} style={styles.noButton}>
          No
        </button>
        <button onClick={handleYes} style={styles.yesButton}>
          Yes
        </button>
      </div>

      {/* Go Back / Reshuffle */}
      <div style={styles.navRow}>
        <button onClick={handleGoBack} style={styles.goBackButton}>
          Go Back
        </button>
        <button onClick={handleReshuffle} style={styles.reshuffleButton}>
          Reshuffle
        </button>
      </div>

      {/* Celebration Animation */}
      {showCelebration && <CelebrationAnimation />}
    </div>
  );
}

// -------------------
// CELEBRATION POPUP
// -------------------
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

// -------------------
//     STYLES
// -------------------
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
    animation: "popIn 0.5s ease",
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
