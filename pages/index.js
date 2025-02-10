import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// 1) SUPABASE CLIENT
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  // ---------------------------------------------------
  // A) MAIN STATE: the 3-layer indexes & data arrays
  // ---------------------------------------------------
  const [categories, setCategories] = useState([]);  // All categories from DB
  const [subcategories, setSubcategories] = useState([]); // All subcategories from DB

  // For the "places" layer, we fetch them on demand for the chosen subcategory
  const [places, setPlaces] = useState([]); // The current subcategory’s places

  // We track the user’s position in each layer
  const [catIndex, setCatIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [placeIndex, setPlaceIndex] = useState(0);

  // Flow control: "categories" | "subcategories" | "places" | "matchDeck"
  const [mode, setMode] = useState("categories");

  // For “Yes” decisions, we store the current selected category & subcategory
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);

  // Matches (final step) & favorites
  const [matches, setMatches] = useState([]);
  const [favorites, setFavorites] = useState([]);

  // For a celebratory animation after final match
  const [showCelebration, setShowCelebration] = useState(false);

  // For error display
  const [errorMsg, setErrorMsg] = useState(null);

  // ---------------------------------------------------
  // B) INITIAL FETCH: Load categories & subcategories
  // ---------------------------------------------------
  useEffect(() => {
    const loadData = async () => {
      try {
        // 1) Load categories
        const { data: catData, error: catErr } = await supabase
          .from("categories")
          .select("*")
          .order("weight", { ascending: false }); // top recommended categories first
        if (catErr) throw catErr;

        // 2) Load subcategories
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

  // ---------------------------------------------------
  // C) HELPER: get current category or subcategory or place
  // ---------------------------------------------------
  const currentCategory = categories[catIndex] || null;

  // subcategories for the currently selected category (once we pick it)
  function getCurrentSubcategories() {
    if (!selectedCategory) return [];
    const catId = selectedCategory.id;
    // filter the full subcategories array
    return subcategories.filter((s) => s.category_id === catId);
  }

  // the current subcategory in that filtered array
  const subcatsForCategory = getCurrentSubcategories();
  const currentSubcategory = subcatsForCategory[subIndex] || null;

  // the current place from the "places" array
  const currentPlace = places[placeIndex] || null;

  // ---------------------------------------------------
  // D) LAYER ACTIONS
  // ---------------------------------------------------

  // 1) In categories layer:
  //    - Yes => pick this category, go subcategories
  //    - No => catIndex++
  function handleYesCategory() {
    // select this category
    const cat = currentCategory;
    if (!cat) return; // safety check

    // store it so subIndex = 0, load subcategories flow
    setSelectedCategory(cat);
    setSubIndex(0);
    setMode("subcategories");
  }

  function handleNoCategory() {
    // go to the next category
    const next = catIndex + 1;
    if (next >= categories.length) {
      // no more categories to show
      alert("No more categories left!");
    } else {
      setCatIndex(next);
    }
  }

  // 2) In subcategories layer:
  //    - Yes => pick this subcategory, go places
  //    - No => subIndex++
  async function handleYesSubcategory() {
    const subcat = currentSubcategory;
    if (!subcat) return;

    setSelectedSubcategory(subcat);

    // fetch places bridging from place_subcategories => places(*)
    try {
      const { data, error } = await supabase
        .from("place_subcategories")
        .select("place_id, places(*)")
        .eq("subcategory_id", subcat.id);
      if (error) throw error;
      // map bridging rows to pure place objects
      const placeItems = data.map((row) => row.places);

      // sort by weight descending
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
      // done with subcategories for this category
      // move to next category
      const nextCat = catIndex + 1;
      if (nextCat >= categories.length) {
        alert("No more categories left!");
      } else {
        setCatIndex(nextCat);
        setMode("categories");
      }
    } else {
      // show next subcategory
      setSubIndex(next);
    }
  }

  // 3) In places layer (final match):
  //    - Yes => match & next place
  //    - No => next place
  function handleYesPlace() {
    const plc = currentPlace;
    if (!plc) return;

    // final match
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 2000);

    setMatches((prev) => [
      ...prev,
      {
        ...plc,
        rating: 0,
      },
    ]);

    // next place
    const next = placeIndex + 1;
    if (next >= places.length) {
      // done with places in this subcategory
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

  // after finishing places in a subcategory (Yes or No for all),
  // go to subIndex++ or next category if subcategories are exhausted
  function moveToNextSubcategory() {
    const nextSub = subIndex + 1;
    if (nextSub >= subcatsForCategory.length) {
      // done with subcategories for this category
      const nextCat = catIndex + 1;
      if (nextCat >= categories.length) {
        alert("No more categories left!");
        setMode("categories");
        return;
      }
      setCatIndex(nextCat);
      setMode("categories");
    } else {
      // next subcategory
      setSubIndex(nextSub);
      setMode("subcategories");
    }
  }

  // ---------------------------------------------------
  // E) GO BACK / RESHUFFLE / MATCH DECK
  // ---------------------------------------------------
  function handleGoBack() {
    if (mode === "places") {
      // go back to subcategories
      setMode("subcategories");
    } else if (mode === "subcategories") {
      // go back to categories
      setMode("categories");
    } else if (mode === "matchDeck") {
      // go back to places? or subcategories? 
      // We'll just default to categories for simplicity
      setMode("categories");
    } else {
      alert("Already at categories layer!");
    }
  }

  function handleReshuffle() {
    // start over from the first category
    setCatIndex(0);
    setSubIndex(0);
    setPlaceIndex(0);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setPlaces([]);
    // If you also want to clear matches/favorites, uncomment:
    // setMatches([]);
    // setFavorites([]);

    setMode("categories");
  }

  function handleShowMatches() {
    setMode("matchDeck");
  }

  // ---------------------------------------------------
  // F) MATCH DECK: rating & favorites
  // ---------------------------------------------------
  function handleRateMatch(placeId, newRating) {
    setMatches((prev) =>
      prev.map((m) => (m.id === placeId ? { ...m, rating: newRating } : m))
    );
  }

  function handleArchive(placeId) {
    const matched = matches.find((m) => m.id === placeId);
    if (matched) {
      setFavorites((prev) => [...prev, matched]);
    }
    // Optionally remove from matches
    // setMatches((prev) => prev.filter((m) => m.id !== placeId));
  }

  // ---------------------------------------------------
  // G) RENDERING
  // ---------------------------------------------------
  if (mode === "matchDeck") {
    // =========== MATCH DECK ===========
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

  // =========== MAIN SWIPE PAGE ===========
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>dialN</h1>
      <button style={styles.matchesBtn} onClick={handleShowMatches}>
        Matches ({matches.length})
      </button>

      {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}

      {/* BREADCRUMB */}
      <div style={styles.breadcrumb}>
        {selectedCategory && (
          <p style={styles.smallText}>Category: {selectedCategory.name}</p>
        )}
        {selectedSubcategory && (
          <p style={styles.smallText}>Subcategory: {selectedSubcategory.name}</p>
        )}
      </div>

      {/* LAYER-SPECIFIC RENDER */}
      {mode === "categories" && (
        <CategoryLayer
          currentCategory={currentCategory}
          onYes={handleYesCategory}
          onNo={handleNoCategory}
        />
      )}

      {mode === "subcategories" && (
        <SubcategoryLayer
          currentSubcategory={currentSubcategory}
          onYes={handleYesSubcategory}
          onNo={handleNoSubcategory}
        />
      )}

      {mode === "places" && (
        <PlacesLayer
          currentPlace={currentPlace}
          onYes={handleYesPlace}
          onNo={handleNoPlace}
        />
      )}

      {/* If we have no more items in a layer, show a message */}
      {mode === "categories" && !currentCategory && <p>No more categories!</p>}
      {mode === "subcategories" && !currentSubcategory && <p>No more subcategories!</p>}
      {mode === "places" && !currentPlace && <p>No more places!</p>}

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
// H) SUB-COMPONENTS FOR RENDERING LAYERS
// ---------------------------------------------------
function CategoryLayer({ currentCategory, onYes, onNo }) {
  if (!currentCategory) {
    return <p>No more categories to show!</p>;
  }
  return (
    <div style={styles.card}>
      <h2>{currentCategory.name}</h2>
      <p style={styles.description}>
        This is a category: {currentCategory.name}
      </p>
      <div style={styles.buttonRow}>
        <button onClick={onNo} style={styles.noButton}>
          No
        </button>
        <button onClick={onYes} style={styles.yesButton}>
          Yes
        </button>
      </div>
    </div>
  );
}

function SubcategoryLayer({ currentSubcategory, onYes, onNo }) {
  if (!currentSubcategory) {
    return <p>No more subcategories to show!</p>;
  }
  return (
    <div style={styles.card}>
      <h2>{currentSubcategory.name}</h2>
      <p style={styles.description}>
        This is a subcategory: {currentSubcategory.name}
      </p>
      <div style={styles.buttonRow}>
        <button onClick={onNo} style={styles.noButton}>
          No
        </button>
        <button onClick={onYes} style={styles.yesButton}>
          Yes
        </button>
      </div>
    </div>
  );
}

function PlacesLayer({ currentPlace, onYes, onNo }) {
  if (!currentPlace) {
    return <p>No more places to show!</p>;
  }
  return (
    <div style={styles.card}>
      <h2>{currentPlace.name}</h2>
      <p style={styles.description}>
        Activity: {currentPlace.description || currentPlace.name}
      </p>
      <p style={styles.description}>
        Address: {currentPlace.address || "N/A"}
      </p>
      {currentPlace.website_url && (
        <p>
          <a
            href={currentPlace.website_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit Website
          </a>
        </p>
      )}
      <div style={styles.buttonRow}>
        <button onClick={onNo} style={styles.noButton}>
          No
        </button>
        <button onClick={onYes} style={styles.yesButton}>
          Yes
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------
// I) CELEBRATION POPUP
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
// J) STYLES
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
