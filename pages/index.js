import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

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

  /** ✅ Initialize user weight & fetch first set of cards */
  const initializeUser = async () => {
    await fetchUserWeight();
    await fetchCards("persona");
  };

  /** ✅ Fetch or create user weight */
  const fetchUserWeight = async () => {
    const { data, error } = await supabase
      .from("user_progress")
      .select("weight")
      .eq("user_id", DEFAULT_USER_ID)
      .single();

    if (error || !data) {
      console.warn("User weight not found. Creating a default entry...");

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

    try {
      if (layer === "persona") {
        query = supabase.from("personas").select("*");
      } else if (layer === "tier1" && previousSelection) {
        query = supabase.from("tag_mappings").select("child_tag").eq("parent_tag", previousSelection).eq("tier", 1);
      } else if (layer === "tier2" && previousSelection) {
        query = supabase.from("tag_mappings").select("child_tag").eq("parent_tag", previousSelection).eq("tier", 2);
      } else if (layer === "places" && previousSelection) {
        if (userWeight < 160) {
          console.warn("Not enough weight to unlock places!");
          setLoading(false);
          return [];
        }
        query = supabase.from("places").select("*").contains("tags", [previousSelection]);
      } else {
        setLoading(false);
        return [];
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        console.warn(`No ${layer} found.`);
        setLoading(false);
        return [];
      }

      setCards(data.map(item => ({ name: item.child_tag || item.name })));
      setCurrentIndex(0);
      setCurrentLayer(layer);

      return data;
    } catch (err) {
      console.error(`Failed to load ${layer} cards:`, err);
      setError(`Failed to load ${layer} cards.`);
      setLoading(false);
      return [];
    }
  };

  /** ✅ Handles swipe interaction */
  const handleSwipe = async (accepted) => {
    if (!cards.length || currentIndex >= cards.length) {
      setError("Invalid card data. Try reshuffling.");
      return;
    }

    const selectedCard = cards[currentIndex];

    let nextLayer;
    if (currentLayer === "persona") {
      nextLayer = "tier1";
    } else if (currentLayer === "tier1") {
      nextLayer = "tier2";
    } else if (currentLayer === "tier2") {
      nextLayer = "places";
    } else {
      return;
    }

    setBreadcrumbs([...breadcrumbs, selectedCard.name]);

    const newCards = await fetchCards(nextLayer, selectedCard.name);
    if (!newCards || newCards.length === 0) {
      if (nextLayer !== "places") {
        console.warn(`No ${nextLayer} tags found. Fetching places instead.`);
        await fetchCards("places", selectedCard.name);
      }
    }

    setCurrentIndex(currentIndex + 1);
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
        <button className="no-button" onClick={() => handleSwipe(false)}>❌ No</button>
        <button className="yes-button" onClick={() => handleSwipe(true)}>✅ Yes</button>
      </div>
    </div>
  );
}
