import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Removed: import "../styles/tinderSwipe.css"; // ❌ (No longer importing CSS)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const DEFAULT_USER_ID = "static_user"; // ✅ Always use this ID

export default function Home() {
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [userWeight, setUserWeight] = useState(0);
  const [currentLayer, setCurrentLayer] = useState("persona");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    initializeUser();
  }, []);

  /** ✅ Initialize user by ensuring they have a weight entry */
  const initializeUser = async () => {
    await fetchUserWeight();
    await fetchCards("persona"); // 🚀 Always start with Personas first
  };

  /** ✅ Fetch user weight from Supabase */
  const fetchUserWeight = async () => {
    const { data, error } = await supabase
      .from("user_progress")
      .select("weight")
      .eq("user_id", DEFAULT_USER_ID)
      .single();

    if (error || !data) {
      console.warn("User weight not found. Creating a default entry...");

      // 🚀 Create a new user_progress row with weight = 0 if missing
      const { error: insertError } = await supabase
        .from("user_progress")
        .upsert([{ user_id: DEFAULT_USER_ID, weight: 0 }]);

      if (insertError) {
        console.error("Failed to create user weight:", insertError);
        return;
      }

      setUserWeight(0);
    } else {
      setUserWeight(data.weight);
    }
  };

  /** ✅ Fetch cards for the current layer */
  const fetchCards = async (layer, previousSelection = null) => {
    setLoading(true);
    setError(null);
    let query;

    if (layer === "persona") {
      // ✅ Fetch Personas first
      query = supabase.from("personas").select("*");
    } 
    else if (layer === "tier1" && previousSelection) {
      // ✅ Tier 1 from tag_mappings
      query = supabase
        .from("tag_mappings")
        .select("child_tag")
        .eq("parent_tag", previousSelection)
        .eq("tier", 1);
    } 
    else if (layer === "tier2" && previousSelection) {
      // ✅ Tier 2
      query = supabase
        .from("tag_mappings")
        .select("child_tag")
        .eq("parent_tag", previousSelection)
        .eq("tier", 2);
    } 
    else if (layer === "tier3" && previousSelection) {
      // ✅ Tier 3
      query = supabase
        .from("tag_mappings")
        .select("child_tag")
        .eq("parent_tag", previousSelection)
        .eq("tier", 3);
    } 
    else if (layer === "places" && previousSelection) {
      // ✅ Only unlock if userWeight >= 160
      if (userWeight < 160) {
        console.warn("Not enough weight to unlock places!");
        setLoading(false);
        return;
      }
      query = supabase
        .from("places")
        .select("*")
        .contains("tags", [previousSelection]);
    } else {
      // If no valid path, just return
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error(`No cards found for ${layer}.`);
      }

      // ✅ Format for UI. If using "child_tag" (tier mapping),
      // set name = child_tag. If using "personas"/"places", keep name as is.
      const formatted = data.map(item => ({
        name: item.child_tag || item.name || "Unnamed"
      }));

      setCards(formatted);
      setCurrentIndex(0);
      setCurrentLayer(layer);
    } catch (err) {
      setError(`Failed to load ${layer} cards. Try reshuffling.`);
    } finally {
      setLoading(false);
    }
  };

  /** ✅ Handles swipe interaction */
  const handleSwipe = (accepted) => {
    if (!cards.length) return;

    const selectedCard = cards[currentIndex];

    if (!selectedCard) {
      setError("Invalid card data. Try reshuffling.");
      return;
    }

    if (!accepted) {
      // If "No" clicked, skip to next card
      const nextIndex = currentIndex + 1;
      if (nextIndex < cards.length) {
        setCurrentIndex(nextIndex);
      } else {
        // If out of cards, re-fetch same layer or do fallback
        fetchCards(currentLayer);
      }
      return;
    }

    // If "Yes" clicked, determine next layer
    let nextLayer;

    if (currentLayer === "persona") {
      nextLayer = "tier1";
    } else if (currentLayer === "tier1") {
      nextLayer = "tier2";
    } else if (currentLayer === "tier2") {
      nextLayer = "tier3";
    } else if (currentLayer === "tier3") {
      nextLayer = "places";
    } else {
      // If we're beyond tier3, do nothing or fallback
      return;
    }

    // Update breadcrumbs and fetch next layer
    setBreadcrumbs(prev => [...prev, selectedCard.name]);
    fetchCards(nextLayer, selectedCard.name);
  };

  return (
    <div className="app">
      <div className="breadcrumb">{breadcrumbs.join(" → ")}</div>

      {error ? (
        <div className="error-screen">
          <h2>{error}</h2>
          <button onClick={() => fetchCards("persona")}>Retry</button>
        </div>
      ) : loading ? (
        <p>Loading cards...</p>
      ) : (
        <div className="card-container">
          {cards.length > 0 ? (
            <div className="card">
              <h2>{cards[currentIndex]?.name || "Unnamed Card"}</h2>
            </div>
          ) : (
            <p>No cards available. Try reshuffling.</p>
          )}
        </div>
      )}

      <div className="swipe-buttons">
        {/* Left / No */}
        <button className="no-button" onClick={() => handleSwipe(false)}>
          ❌ No
        </button>
        {/* Right / Yes */}
        <button className="yes-button" onClick={() => handleSwipe(true)}>
          ✅ Yes
        </button>
      </div>

      {/* Inline styling (optional). Remove if you have global CSS. */}
      <style jsx>{`
        .app {
          position: relative;
          max-width: 420px;
          margin: 0 auto;
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: #f8f8f8;
          font-family: sans-serif;
        }
        .breadcrumb {
          margin: 10px;
          font-weight: 600;
          color: #555;
        }
        .card-container {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .card {
          background: white;
          border-radius: 8px;
          padding: 20px;
          width: 80%;
          max-width: 340px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          text-align: center;
        }
        .swipe-buttons {
          display: flex;
          justify-content: space-evenly;
          padding: 10px 0;
          background: #f0f0f0;
        }
        button {
          padding: 12px 16px;
          font-size: 16px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }
        .no-button {
          background: #f44336;
          color: #fff;
        }
        .yes-button {
          background: #4caf50;
          color: #fff;
        }
        .error-screen {
          text-align: center;
          margin-top: 50px;
        }
      `}</style>
    </div>
  );
}
