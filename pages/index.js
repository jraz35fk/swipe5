import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Create the Supabase client from env variables
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  // Store fetched data
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [places, setPlaces] = useState([]);

  // Which "mode" are we in? (categories, subcategories, places)
  const [mode, setMode] = useState("categories");

  // List of current items (cards) we’re swiping through
  const [currentList, setCurrentList] = useState([]);

  // Current index in the currentList
  const [currentIndex, setCurrentIndex] = useState(0);

  // Track user’s chosen Category/Subcategory for breadcrumbs
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);

  const [errorMsg, setErrorMsg] = useState(null);

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
        setCurrentList(catRes.data || []);
        setCurrentIndex(0);
      } catch (error) {
        setErrorMsg(error.message);
      }
    };

    fetchTables();
  }, []);

  // -------------------
  //    NAVIGATION
  // -------------------

  // GO BACK one step
  const handleGoBack = () => {
    if (mode === "places") {
      // Return to subcategories
      if (selectedCategory) {
        // Filter subcategories for this category again
        const filteredSubs = subcategories.filter(
          (sub) => sub.category_id === selectedCategory.id
        );
        setMode("subcategories");
        setCurrentList(filteredSubs);
        setCurrentIndex(0);
      }
    } else if (mode === "subcategories") {
      // Return to categories
      setMode("categories");
      setCurrentList(categories);
      setCurrentIndex(0);
      // Reset the subcategory selection since we're going back
      setSelectedSubcategory(null);
    } else {
      // Already at categories; can't go further back
      alert("You're already at the top-level categories!");
    }
  };

  // RESET everything to the start
  const handleReshuffle = () => {
    setMode("categories");
    setCurrentList(categories);
    setCurrentIndex(0);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
  };

  // -------------------
  //    SWIPE LOGIC
  // -------------------
  const handleYes = () => {
    // "Yes" means we advance to the next "level," or move to the next card in "places" mode.
    if (mode === "categories") {
      // Chose a category
      const acceptedCategory = currentList[currentIndex];
      setSelectedCategory(acceptedCategory);

      // Filter subcategories for that category
      const filteredSubs = subcategories.filter(
        (sub) => sub.category_id === acceptedCategory.id
      );

      setMode("subcategories");
      setCurrentList(filteredSubs);
      setCurrentIndex(0);
    } else if (mode === "subcategories") {
      // Chose a subcategory
      const acceptedSub = currentList[currentIndex];
      setSelectedSubcategory(acceptedSub);

      // Filter places for that subcategory
      const filteredPlaces = places.filter(
        (pl) => pl.subcategory_id === acceptedSub.id
      );

      setMode("places");
      setCurrentList(filteredPlaces);
      setCurrentIndex(0);
    } else if (mode === "places") {
      // In places mode, "Yes" means "I like this place!"
      // Go to next place, or end if no more places
      const nextIndex = currentIndex + 1;
      if (nextIndex < currentList.length) {
        setCurrentIndex(nextIndex);
      } else {
        alert("You’ve swiped through all places in this subcategory!");
      }
    }
  };

  const handleNo = () => {
    // Skip this item, move to next in the same mode
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
  //     RENDER
  // -------------------
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>dialN</h1>

      {errorMsg && <p style={{ color: "red" }}>Error: {errorMsg}</p>}

      {/* BREADCRUMB: show selected Category -> Subcategory */}
      <div style={styles.breadcrumb}>
        {selectedCategory && (
          <p style={styles.smallText}>
            Category: {selectedCategory.name || "Unknown"}
          </p>
        )}
        {selectedSubcategory && (
          <p style={styles.smallText}>
            Subcategory: {selectedSubcategory.name || "Unknown"}
          </p>
        )}
      </div>

      {/* MAIN CARD AREA */}
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
                This is a place: {currentCard.name}
              </p>
            </>
          )}
        </div>
      ) : (
        <p>No more {mode} to show!</p>
      )}

      {/* BUTTONS: No / Yes */}
      <div style={styles.buttonRow}>
        <button onClick={handleNo} style={styles.noButton}>
          No
        </button>
        <button onClick={handleYes} style={styles.yesButton}>
          Yes
        </button>
      </div>

      {/* NAVIGATION BUTTONS: Go Back / Reshuffle */}
      <div style={styles.navRow}>
        <button onClick={handleGoBack} style={styles.goBackButton}>
          Go Back
        </button>
        <button onClick={handleReshuffle} style={styles.reshuffleButton}>
          Reshuffle
        </button>
      </div>
    </div>
  );
}

// -------------------
//     STYLES
// -------------------
const styles = {
  container: {
    maxWidth: "500px",
    margin: "40px auto",
    fontFamily: "sans-serif",
    textAlign: "center",
  },
  title: {
    marginBottom: "20px",
  },
  breadcrumb: {
    marginBottom: "10px",
  },
  smallText: {
    fontSize: "14px",
    margin: "0",
    color: "#777",
  },
  card: {
    border: "1px solid #ccc",
    borderRadius: "10px",
    padding: "20px",
    marginBottom: "20px",
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
};
