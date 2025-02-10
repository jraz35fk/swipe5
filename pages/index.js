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

  // Indexes for each layer
  const [catIndex, setCatIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [placeIndex, setPlaceIndex] = useState(0);

  // Flow modes: "categories" | "subcategories" | "places" | "matchDeck"
  const [mode, setMode] = useState("categories");

  // Current "selected" items for breadcrumb
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);

  // Matches & favorites
  const [matches, setMatches] = useState([]);
  const [favorites, setFavorites] = useState([]);

  // Celebration & error
  const [showCelebration, setShowCelebration] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // FETCH data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // 1) Load categories
        const { data: catData, error: catErr } = await supabase
          .from("categories")
          .select("*")
          // You can order by weight if you want the heaviest categories first
          .order("weight", { ascending: false });
        if (catErr) throw catErr;

        // 2) Load subcategories
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

  // HELPER: subcats for the chosen category
  function getSubcatsForCategory(cat) {
    if (!cat) return [];
    return subcategories.filter((s) => s.category_id === cat.id);
  }

  // Identify the current items
  const currentCategory = categories[catIndex] || null;
  const subcatsForCategory = getSubcatsForCategory(selectedCategory);
  const currentSubcategory = subcatsForCategory[subIndex] || null;
  const currentPlace = places[placeIndex] || null;

  // ============= CATEGORIES LAYER =============
  function handleYesCategory() {
    // user picks this category => go to subcategories
    if (!currentCategory) return;
    setSelectedCategory(currentCategory);
    setSubIndex(0);
    setPlaceIndex(0);
    setMode("subcategories");
  }
  function handleNoCategory() {
    // move to next category
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

    // fetch bridging places
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
    // next subcategory
    const next = subIndex + 1;
    if (next >= subcatsForCategory.length) {
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

  // ============= PLACES LAYER =============
  function handleYesPlace() {
    if (!currentPlace) return;
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 2000);

    setMatches((prev) => [...prev, { ...currentPlace, rating: 0 }]);

    // next place
    const next = placeIndex + 1;
    if (next >= places.length) {
      // done with this subcategory
      moveToNextSubcategory();
    } else {
      setPlaceIndex(next);
    }
  }
  function handleNoPlace() {
    // skip this place
    const next = placeIndex + 1;
    if (next >= places.length) {
      moveToNextSubcategory();
    } else {
      setPlaceIndex(next);
    }
  }

  function moveToNextSubcategory() {
    // go to next subcategory in the current selectedCategory
    const next = subIndex + 1;
    const subcats = getSubcatsForCategory(selectedCategory);
    if (next >= subcats.length) {
      // done subcategories => next category
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

  // MATCH DECK + NAV
  function handleGoBack() {
    if (mode === "places") {
      setMode("subcategories");
    } else if (mode === "subcategories") {
      setMode("categories");
    } else if (mode === "matchDeck") {
      setMode("categories");
    } else {
      alert("Already at the top layer!");
    }
  }
  function handleReshuffle() {
    // fully reset
    setCatIndex(0);
    setSubIndex(0);
    setPlaceIndex(0);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setPlaces([]);
    // if you want to clear matches/favorites, uncomment:
    // setMatches([]);
    // setFavorites([]);
    setMode("categories");
  }
  function handleShowMatches() {
    setMode("matchDeck");
  }

  // Rate & Archive
  function handleRateMatch(placeId, newRating) {
    setMatches((prev) =>
      prev.map((m) => (m.id === placeId ? { ...m, rating: newRating } : m))
    );
  }
  function handleArchive(placeId) {
    const match = matches.find((m) => m.id === placeId);
    if (match) {
      setFavorites((prev) => [...prev, match]);
    }
  }

  // RENDER
  if (mode === "matchDeck") {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>DialN — Match Deck</h1>
        <button onClick={handleGoBack} style={styles.goBackButton}>
          Go Back
        </button>
        {matches.length === 0 ? (
          <p>No matches yet!</p>
        ) : (
          <div>
            <h3>Your Matches:</h3>
            {matches.map((m) => (
              <div key={m.id} style={styles.matchCard}>
                <p><strong>{m.name}</strong></p>
                <label>
                  Rating:{" "}
                  <select
                    value={m.rating || 0}
                    onChange={(e) => handleRateMatch(m.id, Number(e.target.value))}
                  >
                    {[0,1,2,3,4,5].map((val) => (
                      <option key={val} value={val}>{val}</option>
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
                <li key={f.id}>{f.name} (rated {f.rating})</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>DialN</h1>
      <button style={styles.matchesBtn} onClick={handleShowMatches}>
        Matches ({matches.length})
      </button>

      {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}

      {/* Breadcrumb */}
      <div style={styles.breadcrumb}>
        {selectedCategory && <p style={styles.smallText}>Category: {selectedCategory.name}</p>}
        {selectedSubcategory && <p style={styles.smallText}>Subcategory: {selectedSubcategory.name}</p>}
      </div>

      {mode === "categories" && (
        <CategoryLayer
          cat={currentCategory}
          onYes={handleYesCategory}
          onNo={handleNoCategory}
        />
      )}
      {mode === "subcategories" && (
        <SubcategoryLayer
          subcat={currentSubcategory}
          onYes={handleYesSubcategory}
          onNo={handleNoSubcategory}
        />
      )}
      {mode === "places" && (
        <PlacesLayer
          plc={currentPlace}
          onYes={handleYesPlace}
          onNo={handleNoPlace}
        />
      )}

      <div style={styles.navRow}>
        <button onClick={handleGoBack} style={styles.goBackButton}>Go Back</button>
        <button onClick={handleReshuffle} style={styles.reshuffleButton}>Reshuffle</button>
      </div>

      {showCelebration && <CelebrationAnimation />}
    </div>
  );
}

// Category layer
function CategoryLayer({ cat, onYes, onNo }) {
  if (!cat) return <p>No more categories left!</p>;
  return (
    <div style={styles.card}>
      <h2>{cat.name}</h2>
      <p style={styles.description}>Category: {cat.name}</p>
      <div style={styles.buttonRow}>
        <button onClick={onNo} style={styles.noButton}>No</button>
        <button onClick={onYes} style={styles.yesButton}>Yes</button>
      </div>
    </div>
  );
}

// Subcategory layer
function SubcategoryLayer({ subcat, onYes, onNo }) {
  if (!subcat) return <p>No more subcategories left!</p>;
  return (
    <div style={styles.card}>
      <h2>{subcat.name}</h2>
      <p style={styles.description}>Subcategory: {subcat.name}</p>
      <div style={styles.buttonRow}>
        <button onClick={onNo} style={styles.noButton}>No</button>
        <button onClick={onYes} style={styles.yesButton}>Yes</button>
      </div>
    </div>
  );
}

// Places layer
function PlacesLayer({ plc, onYes, onNo }) {
  if (!plc) return <p>No more places left!</p>;
  return (
    <div style={styles.card}>
      <h2>{plc.name}</h2>
      <p style={styles.description}>Activity: {plc.description || plc.name}</p>
      <div style={styles.buttonRow}>
        <button onClick={onNo} style={styles.noButton}>No</button>
        <button onClick={onYes} style={styles.yesButton}>Yes</button>
      </div>
    </div>
  );
}

// Celebration popup
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

// Styles
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
