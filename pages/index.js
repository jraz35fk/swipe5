import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Initialize the Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  // -------------------
  //   State: data arrays
  // -------------------
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  // We do NOT store all places in state. Instead, we fetch places for a subcategory on demand.

  // Current layer: "categories", "subcategories", "places", or "matchDeck"
  const [mode, setMode] = useState("categories");

  // The items we’re currently swiping through
  const [currentList, setCurrentList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // User-chosen items for breadcrumbs
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);

  // For final “matched” places, plus favorites
  const [matches, setMatches] = useState([]);
  const [favorites, setFavorites] = useState([]);

  // Celebration animation
  const [showCelebration, setShowCelebration] = useState(false);

  // Error messaging
  const [errorMsg, setErrorMsg] = useState(null);

  // -------------------
  //   Skip Tracking
  // -------------------
  // So we don't repeat an item after "No," we store IDs here:
  const [skippedCategories, setSkippedCategories] = useState([]);
  const [skippedSubcategories, setSkippedSubcategories] = useState([]);
  const [skippedPlaces, setSkippedPlaces] = useState([]);

  // -------------------
  //   Initial Fetch of Categories & Subcategories
  // -------------------
  useEffect(() => {
    const fetchCategoriesAndSubs = async () => {
      try {
        // Get all categories
        const { data: catData, error: catError } = await supabase
          .from("categories")
          .select("*")
          .order("weight", { ascending: false }); // Highest weight first

        if (catError) throw catError;

        // Get all subcategories
        const { data: subData, error: subError } = await supabase
          .from("subcategories")
          .select("*")
          .order("weight", { ascending: false });

        if (subError) throw subError;

        setCategories(catData || []);
        setSubcategories(subData || []);

        // Start swiping on categories (filter out any skipped, if any)
        const filteredCats = (catData || []).filter(
          (c) => !skippedCategories.includes(c.id)
        );
        setMode("categories");
        setCurrentList(filteredCats);
        setCurrentIndex(0);
      } catch (error) {
        setErrorMsg(error.message);
      }
    };

    fetchCategoriesAndSubs();
  }, []); // run once on mount

  // -------------------
  //   NAVIGATION
  // -------------------
  // GO BACK
  const handleGoBack = async () => {
    if (mode === "places") {
      // Go back to subcategories for the selectedCategory
      if (!selectedCategory) {
        alert("No selected category found. Returning to categories...");
        goToCategories();
        return;
      }
      goToSubcategories(selectedCategory);
    } else if (mode === "subcategories") {
      // Go back to categories
      goToCategories();
      setSelectedSubcategory(null);
    } else if (mode === "matchDeck") {
      // Return to categories or subcategories if you want, but let's go categories
      goToCategories();
      setSelectedCategory(null);
      setSelectedSubcategory(null);
    } else {
      alert("You're already at the top-level categories!");
    }
  };

  // RESHUFFLE everything (clear skip arrays, go back to categories)
  const handleReshuffle = async () => {
    setSkippedCategories([]);
    setSkippedSubcategories([]);
    setSkippedPlaces([]);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setMode("categories");
    setMatches([]);
    setFavorites([]);

    // refetch categories from state (since we already loaded them once)
    const filteredCats = categories.filter(
      (c) => !skippedCategories.includes(c.id)
    );
    setCurrentList(filteredCats);
    setCurrentIndex(0);
  };

  // Show the match deck
  const handleShowMatches = () => {
    setMode("matchDeck");
  };

  // -------------------
  //   HELPER: Go to Categories
  // -------------------
  const goToCategories = () => {
    setMode("categories");
    const filteredCats = categories.filter(
      (c) => !skippedCategories.includes(c.id)
    );
    setCurrentList(filteredCats);
    setCurrentIndex(0);
  };

  // -------------------
  //   HELPER: Go to Subcategories
  // -------------------
  const goToSubcategories = (category) => {
    // filter subcategories by category_id
    const filteredSubs = subcategories
      .filter((sub) => sub.category_id === category.id)
      .filter((sub) => !skippedSubcategories.includes(sub.id));

    setMode("subcategories");
    setCurrentList(filteredSubs);
    setCurrentIndex(0);
  };

  // -------------------
  //   HELPER: Fetch & Go to Places for a Subcategory
  // -------------------
  const goToPlaces = async (subcategory) => {
    try {
      // We do a bridging query: place_subcategories -> places(*)
      // Using the Supabase "foreign table" syntax: "places(*)"
      const { data, error } = await supabase
        .from("place_subcategories")
        .select("place_id, places(*)")
        .eq("subcategory_id", subcategory.id);

      if (error) throw error;

      // `data` is an array of { place_id, places: {...} } objects
      // Map them to just the place object, ignoring any that are in skippedPlaces
      const placeItems = data
        .map((row) => row.places)
        .filter((pl) => pl && !skippedPlaces.includes(pl.id));

      // Sort by weight descending (optional)
      placeItems.sort((a, b) => (b.weight || 0) - (a.weight || 0));

      setMode("places");
      setCurrentList(placeItems);
      setCurrentIndex(0);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // -------------------
  //   SWIPE LOGIC: Yes / No
  // -------------------
  const handleYes = async () => {
    const currentItem = currentList[currentIndex];
    if (!currentItem) return;

    if (mode === "categories") {
      // user chose this category
      setSelectedCategory(currentItem);
      // go to subcategories
      goToSubcategories(currentItem);
    } else if (mode === "subcategories") {
      // user chose this subcategory
      setSelectedSubcategory(currentItem);
      // fetch places for this subcategory
      await goToPlaces(currentItem);
    } else if (mode === "places") {
      // final match
      const matchedPlace = currentItem;

      // show celebration
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);

      // add to matches
      setMatches((prev) => [
        ...prev,
        {
          ...matchedPlace,
          rating: 0, // default rating
        },
      ]);

      // move to next place
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

    // Mark item as skipped
    if (mode === "categories") {
      setSkippedCategories((prev) => [...prev, currentItem.id]);
    } else if (mode === "subcategories") {
      setSkippedSubcategories((prev) => [...prev, currentItem.id]);
    } else if (mode === "places") {
      setSkippedPlaces((prev) => [...prev, currentItem.id]);
    }

    // Move to next
    const nextIndex = currentIndex + 1;
    if (nextIndex < currentList.length) {
      setCurrentIndex(nextIndex);
    } else {
      alert(`No more ${mode} left!`);
    }
  };

  // Current card
  const currentCard = currentList[currentIndex];

  // -------------------
  //   MATCH DECK VIEW
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
                    {[0, 1, 2, 3, 4, 5].map((val) => (
                      <option value={val} key={val}>
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

  // -------------------
  //   MAIN SWIPE PAGE
  // -------------------
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>dialN</h1>

      {/* Matches button with count */}
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

      {/* Current Card */}
      {currentCard ? (
        <div style={styles.card}>
          <h2>{currentCard.name}</h2>
          {mode === "categories" && (
            <p style={styles.description}>This is a category: {currentCard.name}</p>
          )}
          {mode === "subcategories" && (
            <p style={styles.description}>
              This is a subcategory: {currentCard.name}
            </p>
          )}
          {mode === "places" && (
            <>
              <p style={styles.description}>
                Activity: {currentCard.description || currentCard.name}
              </p>
              <p style={styles.description}>
                Address: {currentCard.address || "N/A"}
              </p>
              {currentCard.website_url && (
                <p>
                  <a
                    href={currentCard.website_url}
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
// Additional Handlers for Matches
// ---------------------------------------------------
function handleRateMatch(placeId, newRating) {
  // `this` is outside component scope, so we define inside the component
  // Moved into the main component above: see "const handleRateMatch = ..."
}

// We'll define them directly in the main component for scoping:

// But let's define them in the main component:

/* Pseudocode:
function handleRateMatch(placeId, newRating) {
  setMatches(prevMatches =>
    prevMatches.map(m =>
      m.id === placeId ? { ...m, rating: newRating } : m
    )
  );
}

function handleArchive(placeId) {
  // Move from matches to favorites, if desired
}
*/

// ---------------------------------------------------
//   STYLES
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
