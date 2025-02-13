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
    fetchUserWeight();
    fetchCards("persona"); // 🚀 Always start with Personas
  }, []);

  /** ✅ Fetch user weight or create a default one if missing **/
  const fetchUserWeight = async () => {
    const { data, error } = await supabase
      .from("user_progress")
      .select("weight")
      .eq("user_id", DEFAULT_USER_ID) // 👈 Uses the static user ID
      .single();

    if (error || !data) {
      console.warn("User weight not found. Creating a default entry...");

      // 🚀 Create a new user_progress row with weight = 0
      const { error: insertError } = await supabase
        .from("user_progress")
        .insert([{ user_id: DEFAULT_USER_ID, weight: 0 }], { upsert: true });

      if (insertError) {
        console.error("Failed to create user weight:", insertError);
        return;
      }

      setUserWeight(0); // Default weight
    } else {
      setUserWeight(data.weight);
    }
  };

  /** ✅ Fetch cards for the correct layer **/
  const fetchCards = async (layer, previousSelection = null) => {
    setLoading(true);
    setError(null);

    let query;

    if (layer === "persona") {
      query = supabase.from("personas").select("*"); // ✅ Always start with Personas
    } else if (layer === "tier1" && previousSelection) {
      query = supabase.from("places").select("*").contains("tags", [previousSelection]);
    } else if (layer === "tier2" && previousSelection) {
      query = supabase.from("places").select("*").contains("tags", [previousSelection]);
    } else if (layer === "places" && previousSelection) {
      if (userWeight < 160) {
        console.log("Not enough weight to unlock places!");
        return;
      }
      query = supabase.from("places").select("*").contains("tags", [previousSelection]);
    } else {
      return;
    }

    try {
      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error(`No cards found for ${layer}.`);
      }

      setCards(data);
      setCurrentIndex(0);
      setCurrentLayer(layer);
    } catch (err) {
      setError(`Failed to load ${layer} cards. Try reshuffling.`);
    } finally {
      setLoading(false);
    }
  };

  /** ✅ Handles swipe and moves to the next layer **/
  const handleSwipe = (accepted) => {
    if (!cards.length) return;

    const selectedCard = cards[currentIndex];

    if (!selectedCard) {
      setError("Invalid card data. Try reshuffling.");
      return;
    }

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
        <button className="no-button" onClick={() => handleSwipe(false)}>❌ No</button>
        <button className="yes-button" onClick={() => handleSwipe(true)}>✅ Yes</button>
      </div>
    </div>
  );
}
