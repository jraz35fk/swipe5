import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  // MAIN DATA
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [places, setPlaces] = useState([]);

  // Flow
  const [catIndex, setCatIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [placeIndex, setPlaceIndex] = useState(0);
  const [mode, setMode] = useState("categories"); // "categories", "subcategories", "places"

  // Current selections
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);

  // Matches & deck
  const [matches, setMatches] = useState([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // For the match deck overlay
  const [matchDeckOpen, setMatchDeckOpen] = useState(false);
  const [newMatchesCount, setNewMatchesCount] = useState(0);

  // Subcategory search
  const [searchTerm, setSearchTerm] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadBaseData();
  }, []);

  /**
   * STEP 1: Load top-level categories, subcategories, and neighborhoods.
   * STEP 2: Filter out categories/subcategories that have zero places.
   * STEP 3: Merge neighborhoods in as top-level categories (so they're never a subcategory).
   */
  async function loadBaseData() {
    try {
      // 1. Load only is_active categories
      let { data: catData, error: catErr } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("weight", { ascending: false });
      if (catErr) throw catErr;

      // 2. Load only is_active subcategories
      let { data: subData, error: subErr } = await supabase
        .from("subcategories")
        .select("*")
        .eq("is_active", true)
        .order("weight", { ascending: false });
      if (subErr) throw subErr;

      // 3. Load neighborhoods (treated as top-level "categories" in the UI)
      let { data: hoodData, error: hoodErr } = await supabase
        .from("neighborhoods")
        .select("*")
        .eq("is_active", true)
        .order("weight", { ascending: false });
      if (hoodErr) throw hoodErr;

      // 4. Check which subcategories actually link to a place
      //    We'll see which subcategory_id values appear in place_subcategories.
      let { data: psData, error: psErr } = await supabase
        .from("place_subcategories")
        .select("subcategory_id");
      if (psErr) throw psErr;
      const validSubIds = new Set((psData || []).map((ps) => ps.subcategory_id));

      // Filter subcategories -> keep only those referencing at least 1 place
      subData = (subData || []).filter((s) => validSubIds.has(s.id));

      // Now keep only categories that still have subcategories
      // i.e. subcategories referencing places.
      const catWithSubs = new Set(subData.map((s) => s.category_id));
      catData = (catData || []).filter((c) => catWithSubs.has(c.id));

      // 5. Transform neighborhoods into "fake categories"
      //    so they show at top-level only.
      const hoodCats = (hoodData || []).map((n) => ({
        id: "hood-" + n.id,  // string ID so we can differentiate from normal cat IDs
        name: n.name,
        image_url: n.image_url,
        weight: n.weight,
        // We'll mark it so we know it's a neighborhood "category"
        isNeighborhood: true
      }));

      // 6. Combine real categories + neighborhood categories
      const finalCategories = [...catData, ...hoodCats];

      // Sort them all by weight descending (just to unify the order)
      finalCategories.sort((a, b) => (b.weight || 0) - (a.weight || 0));

      setCategories(finalCategories);
      setSubcategories(subData || []);
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  // Search logic: combine categories + subcategories
  useEffect(() => {
    if (!searchTerm) {
      setSearchSuggestions([]);
      return;
    }
    const lower = searchTerm.toLowerCase();

    const catMatches = categories
      .filter((c) => c.name.toLowerCase().includes(lower))
      .map((c) => ({ type: "category", name: c.name, id: c.id }));

    const subMatches = subcategories
      .filter((s) => s.name.toLowerCase().includes(lower))
      .map((s) => ({ type: "subcategory", name: s.name, id: s.id }));

    const combined = [...catMatches, ...subMatches];
    setSearchSuggestions(combined.slice(0, 5));
  }, [searchTerm, categories, subcategories]);

  function pickSearchSuggestion(sug) {
    setSearchTerm(sug.name);
    setShowSearchSuggestions(false);

    if (sug.type === "category") {
      const idx = categories.findIndex((c) => c.id === sug.id);
      if (idx !== -1) {
        setCatIndex(idx);
        setMode("categories");
        handleYesCategoryOverride(idx);
      }
    } else {
      // subcategory
      const subObj = subcategories.find((x) => x.id === sug.id);
      if (!subObj) return;
      const catId = subObj.category_id;
      // which normal category is that?
      const catIdx = categories.findIndex((c) => c.id === catId);
      if (catIdx !== -1) {
        setCatIndex(catIdx);
        setSelectedCategory(categories[catIdx]);
        setMode("subcategories");
        const scList = subcategories.filter((s) => s.category_id === catId);
        const scIdx = scList.findIndex((x) => x.id === sug.id);
        if (scIdx !== -1) {
          setSubIndex(scIdx);
          handleYesSubcategoryOverride(scList[scIdx].id);
        }
      }
    }
  }

  function handleYesCategoryOverride(catIdx) {
    if (catIdx < 0 || catIdx >= categories.length) return;
    const catObj = categories[catIdx];

    // If it's a neighborhood category, skip subcategories & places flow
    if (catObj.isNeighborhood) {
      // (Option A) If you have logic to show places directly in a neighborhood,
      //   you'd implement that here. Otherwise, we skip to next category:
      const next = catIdx + 1;
      if (next >= categories.length) {
        alert("No more categories left!");
        setMode("categories");
      } else {
        setCatIndex(next);
      }
      return;
    }

    // If it's a normal category
    setSelectedCategory(catObj);
    setSubIndex(0);
    setPlaceIndex(0);
    setMode("subcategories");
  }

  async function handleYesSubcategoryOverride(subId) {
    const subObj = subcategories.find((x) => x.id === subId);
    if (!subObj) return;
    setSelectedSubcategory(subObj);
    try {
      const { data, error } = await supabase
        .from("place_subcategories")
        .select("place_id, places(*)")
        .eq("subcategory_id", subId);
      if (error) throw error;

      const placeItems = (data || []).map((row) => row.places);
      placeItems.sort((a, b) => (b.weight || 0) - (a.weight || 0));

      setPlaces(placeItems);
      setPlaceIndex(0);
      setMode("places");
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  // Normal flow
  const currentCategory = categories[catIndex] || null;
  function getSubcatsForCategory(cat) {
    if (!cat) return [];
    if (cat.isNeighborhood) {
      // If it's a neighborhood, we have no subcategories for it
      return [];
    }
    return subcategories.filter((s) => s.category_id === cat.id);
  }
  const scList = getSubcatsForCategory(selectedCategory);
  const currentSubcat = scList[subIndex] || null;
  const currentPlace = places[placeIndex] || null;

  function getCurrentCardData() {
    if (mode === "categories") {
      if (!currentCategory) return null;
      return {
        name: currentCategory.name,
        image_url: currentCategory.image_url || ""
      };
    } else if (mode === "subcategories") {
      if (!currentSubcat) return null;
      return {
        name: currentSubcat.name,
        image_url: currentSubcat.image_url || ""
      };
    } else if (mode === "places") {
      if (!currentPlace) return null;
      return {
        name: currentPlace.name,
        image_url: currentPlace.image_url || ""
      };
    }
    return null;
  }

  function getBackgroundImage(url) {
    return url && url.trim() !== "" ? url : "/images/default-bg.jpg";
  }

  // Category
  function handleYesCategory() {
    if (!currentCategory) return;

    if (currentCategory.isNeighborhood) {
      // Option A: do something special for neighborhoods (skip to next)
      const next = catIndex + 1;
      if (next >= categories.length) {
        alert("No more categories left!");
        setMode("categories");
      } else {
        setCatIndex(next);
      }
      return;
    }

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

  // Subcategory
  async function handleYesSubcategory() {
    if (!currentSubcat) return;
    setSelectedSubcategory(currentSubcat);
    try {
      const { data, error } = await supabase
        .from("place_subcategories")
        .select("place_id, places(*)")
        .eq("subcategory_id", currentSubcat.id);
      if (error) throw error;

      const placeItems = (data || []).map((row) => row.places);
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
    if (next >= scList.length) {
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

  // Places
  function handleYesPlace() {
    if (!currentPlace) return;
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 2000);

    setMatches((prev) => [...prev, currentPlace]);
    if (!matchDeckOpen) {
      setNewMatchesCount((n) => n + 1);
    }

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
    if (next >= scList.length) {
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
    setSearchTerm("");
    setSearchSuggestions([]);
    setShowSearchSuggestions(false);
    setMatchDeckOpen(false);
  }

  // Current card
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

  return (
    <div style={{ ...styles.container, backgroundImage: `url(${bgImage})` }}>
      <div style={styles.overlay}>

        {/* TOP ROW */}
        <div style={styles.topRow}>

          {/* left side empty */}
          <div style={styles.topLeftEmpty}></div>

          {/* Matches button in center */}
          <MatchedDeckButton
            matches={matches}
            newMatchesCount={newMatchesCount}
            matchDeckOpen={matchDeckOpen}
            setMatchDeckOpen={setMatchDeckOpen}
            setNewMatchesCount={setNewMatchesCount}
          />

          {/* "USA → Baltimore" text, search bar below it */}
          <div style={styles.topRightArea}>
            <div style={styles.usaBaltimoreText}>USA &rarr; Baltimore</div>
            <SubcategorySearchBar
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              suggestions={searchSuggestions}
              showSuggestions={showSearchSuggestions}
              setShowSearchSuggestions={setShowSearchSuggestions}
              onPick={pickSearchSuggestion}
            />
          </div>
        </div>

        <div style={styles.centerContent}></div>

        {/* Bottom row => card name, maybe neighborhood, yes/no */}
        <div style={styles.bottomTextRow}>
          <h1 style={styles.currentCardName}>{currentCard.name}</h1>
          {mode === "places" && currentPlace?.neighborhood && (
            <p style={styles.neighborhoodText}>{currentPlace.neighborhood}</p>
          )}

          <div style={styles.yesNoRow}>
            <button style={styles.noButton} onClick={handleNo}>
              No
            </button>
            <button style={styles.yesButton} onClick={handleYes}>
              Yes
            </button>
          </div>
        </div>

        <button style={styles.goBackButton} onClick={handleGoBack}>
          Go Back
        </button>
        <button style={styles.reshuffleButton} onClick={handleReshuffle}>
          Reshuffle
        </button>

        {/* Match Deck Overlay */}
        {matchDeckOpen && (
          <MatchDeckOverlay
            matches={matches}
            onClose={() => {
              setMatchDeckOpen(false);
              setNewMatchesCount(0);
            }}
          />
        )}
      </div>

      {showCelebration && <CelebrationAnimation />}
      {errorMsg && (
        <p style={{ color: "red", position: "absolute", top: 10, left: 10 }}>
          {errorMsg}
        </p>
      )}
    </div>
  );

  // unify no / yes
  function handleNo() {
    if (mode === "places") {
      handleNoPlace();
    } else if (mode === "subcategories") {
      handleNoSubcategory();
    } else {
      handleNoCategory();
    }
  }
  function handleYes() {
    if (mode === "places") {
      handleYesPlace();
    } else if (mode === "subcategories") {
      handleYesSubcategory();
    } else {
      handleYesCategory();
    }
  }
}

// SEARCH BAR
function SubcategorySearchBar({
  searchTerm,
  setSearchTerm,
  suggestions,
  showSuggestions,
  setShowSearchSuggestions,
  onPick
}) {
  function handleFocus() {
    if (searchTerm) setShowSearchSuggestions(true);
  }
  function handleBlur() {
    // Slight delay so onPick can be triggered
    setTimeout(() => {
      setShowSearchSuggestions(false);
    }, 200);
  }
  return (
    <div style={styles.searchBarContainer}>
      <input
        style={styles.searchInput}
        type="text"
        placeholder="Type e.g. 'food'..."
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setShowSearchSuggestions(true);
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div style={styles.suggestionList}>
          {suggestions.map((sug, i) => (
            <div
              key={i}
              style={styles.suggestionItem}
              onClick={() => onPick(sug)}
            >
              {sug.type === "category"
                ? `Category: ${sug.name}`
                : `Subcat: ${sug.name}`}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// MATCH DECK BUTTON
function MatchedDeckButton({
  matches,
  newMatchesCount,
  matchDeckOpen,
  setMatchDeckOpen,
  setNewMatchesCount
}) {
  return (
    <div style={styles.matchDeckBtnContainer}>
      <button
        style={styles.matchDeckButton}
        onClick={() => {
          setMatchDeckOpen(true);
          setNewMatchesCount(0);
        }}
      >
        Matches {newMatchesCount > 0 && `(+${newMatchesCount})`}
      </button>
    </div>
  );
}

// MATCH DECK OVERLAY
function MatchDeckOverlay({ matches, onClose }) {
  return (
    <div style={styles.matchDeckOverlay}>
      <div style={styles.matchDeckBox}>
        <h2>Match Deck</h2>
        <button onClick={onClose} style={styles.closeDeckButton}>
          Close
        </button>
        {matches.length === 0 ? (
          <p>No matches yet.</p>
        ) : (
          <ul>
            {matches.map((m, i) => (
              <li key={i}>
                <strong>{m.name}</strong>
                {m.neighborhood && ` - ${m.neighborhood}`}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// CELEBRATION
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
    fontFamily: "sans-serif"
  },
  overlay: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.3)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    position: "relative"
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "10px 20px"
  },
  topLeftEmpty: {
    width: "20%",
    minWidth: "100px"
  },
  topRightArea: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end"
  },
  usaBaltimoreText: {
    color: "#ffd700",
    fontSize: "1.2em",
    textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
    marginBottom: "8px"
  },
  matchDeckBtnContainer: {
    width: "60%",
    textAlign: "center"
  },
  matchDeckButton: {
    backgroundColor: "#ff9800",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "1em"
  },
  searchBarContainer: {
    position: "relative"
  },
  searchInput: {
    width: "220px",
    padding: "6px",
    borderRadius: "4px",
    border: "1px solid #888"
  },
  suggestionList: {
    position: "absolute",
    top: "35px",
    left: 0,
    width: "220px",
    backgroundColor: "#333",
    borderRadius: "4px",
    zIndex: 9999,
    maxHeight: "140px",
    overflowY: "auto"
  },
  suggestionItem: {
    padding: "5px",
    color: "#fff",
    cursor: "pointer",
    borderBottom: "1px solid #555"
  },
  centerContent: {
    flexGrow: 1
  },
  bottomTextRow: {
    textAlign: "center",
    marginBottom: "70px"
  },
  currentCardName: {
    color: "#fff",
    fontSize: "3em",
    textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
    margin: 0,
    textTransform: "uppercase"
  },
  neighborhoodText: {
    color: "#FFD700",
    fontSize: "1.5em",
    fontStyle: "italic",
    textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
    marginTop: "10px",
    marginBottom: "15px"
  },
  yesNoRow: {
    marginTop: "20px",
    display: "flex",
    justifyContent: "center",
    gap: "40px"
  },
  noButton: {
    backgroundColor: "#f44336",
    color: "#fff",
    border: "none",
    padding: "12px 24px",
    borderRadius: "5px",
    fontSize: "1.1em",
    cursor: "pointer"
  },
  yesButton: {
    backgroundColor: "#4CAF50",
    color: "#fff",
    border: "none",
    padding: "12px 24px",
    borderRadius: "5px",
    fontSize: "1.1em",
    cursor: "pointer"
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
    cursor: "pointer"
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
    cursor: "pointer"
  },
  matchDeckOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0,0,0,0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10000
  },
  matchDeckBox: {
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "8px",
    width: "300px",
    maxHeight: "70vh",
    overflowY: "auto",
    position: "relative"
  },
  closeDeckButton: {
    position: "absolute",
    top: "10px",
    right: "10px",
    backgroundColor: "#444",
    color: "#fff",
    border: "none",
    padding: "5px 10px",
    borderRadius: "4px",
    cursor: "pointer"
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
    zIndex: 9999
  },
  celebrationBox: {
    backgroundColor: "#fff",
    padding: "30px",
    borderRadius: "10px",
    textAlign: "center"
  }
};
