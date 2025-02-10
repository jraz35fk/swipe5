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

  // Current "mode" controls which list we're swiping: "categories", "subcategories", or "places".
  const [mode, setMode] = useState("categories");

  // A dynamic list of "cards" we’re currently swiping through (based on the mode).
  const [currentList, setCurrentList] = useState([]);

  // Track which item in currentList we're displaying
  const [currentIndex, setCurrentIndex] = useState(0);

  // Keep track of the user’s chosen category/subcategory so we can filter the next step
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);

  const [errorMsg, setErrorMsg] = useState(null);

  // Fetch data from all three tables on mount
  useEffect(() => {
    const fetchTables = async () => {
      try {
        // Fetch all three tables in parallel
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

        // Start by showing categories
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
  //    SWIPE LOGIC
  // -------------------
  const handleYes = () => {
    // "Yes" means we move to the next step, or if we're in the final step, just go to next card.
    if (mode === "categories") {
      // 1) User accepted this category
      const acceptedCategory = currentList[currentIndex];
      setSelectedCategory(acceptedCategory);

      // 2) Filter subcategories for that category
      const filteredSubs = subcategories.filter(
        (sub) => sub.category_id === acceptedCategory.id
      );

      // 3) Move to subcategories step
      setMode("subcategories");
      setCurrentList(filteredSubs);
      setCurrentIndex(0);
    } else if (mode === "subcategories") {
      // 1) User accepted this subcategory
      const acceptedSub = currentList[currentIndex];
      setSelectedSubcategory(acceptedSub);

      // 2) Filter places for that subcategory
      const filteredPlaces = places.filter(
        (pl) => pl.subcategory_id === acceptedSub.id
      );

      // 3) Move to places step
      setMode("places");
      setCurrentList(filteredPlaces);
      setCurrentIndex(0);
    } else if (mode === "places") {
      // In "places" mode, a "Yes" might just mean "I like this place!"
      // Then we can go to the next place card until we're out of places.

      const nextIndex = currentIndex + 1;
      if (nextIndex < currentList.length) {
        setCurrentIndex(nextIndex);
      } else {
        // No more places, you could reset or show a "No more content" message
        alert("You’ve swiped through all places!");
      }
    }
  };

  const handleNo = () => {
    // "No" means skip this card and go to the next one in the current mode
    const nextIndex = currentIndex + 1;
    if (nextIndex < currentList.length) {
      setCurrentIndex(nextIndex);
    } else {
      // If we're out of cards in this mode, you could handle it differently
      alert(`No more ${mode} left!`);
    }
  };

  // Get the current card
  const currentCard = currentList[currentIndex];

  // -------------------
  //     RENDER
  // -------------------
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Tinder-Style Activity App</h1>

      {errorMsg && <p style={{ color: "red" }}>Error: {errorMsg}</p>}

      {/* If no data yet or out of cards, show a message */}
      {!currentCard ? (
        <p>No more {mode} to show!</p>
      ) : (
        <div style={styles.card}>
          <h2>{mode === "categories" && currentCard?.name}</h2>
          {mode === "categories" && (
            <p style={styles.description}>
              Category: {currentCard.name || "No name"}
            </p>
          )}

          {mode === "subcategories" && (
            <>
              <h2>{currentCard?.name}</h2>
              <p style={styles.description}>
                Subcategory: {currentCard.name || "No name"}
              </p>
            </>
          )}

          {mode === "places" && (
            <>
              <h2>{currentCard?.name}</h2>
              <p style={styles.description}>
                Location/Activity: {currentCard.name || "No name"}
              </p>
            </>
          )}
        </div>
      )}

      <div style={styles.buttonRow}>
        <button onClick={handleNo} style={styles.noButton}>
          No
        </button>
        <button onClick={handleYes} style={styles.yesButton}>
          Yes
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
};
