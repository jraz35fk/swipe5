import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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
    fetchCards("persona"); // 🚀 Always start with Personas first
  }, []);

  const fetchUserWeight = async () => {
    const { data, error } = await supabase
      .from("user_progress")
      .select("weight")
      .single();

    if (error) {
      console.error("Error fetching weight:", error);
      return;
    }
    setUserWeight(data.weight);
  };

  const fetchCards = async (layer, previousSelection = null) => {
    setLoading(true);
    setError(null);
    let query = supabase.from("places").select("*");

    // 🚀 **Force Personas to Load First**
    if (layer === "persona") {
      query = supabase.from("personas").select("*"); // ✅ Pull from the Personas table
    } else if (layer === "tier1" && previousSelection) {
      query = supabase.from("places").select("*").contains("tags", [previousSelection]);
    } else if (layer === "tier2" && previousSelection) {
      query = supabase.from("places").select("*").contains("tags", [previousSelection]);
    } else if (layer === "places" && previousSelection) {
      if (userWeight >= 160) {
        query = supabase.from("places").select("*").contains("tags", [previousSelection]);
      } else {
        console.log("Not enough weight to unlock places!");
        return;
      }
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

  const handleSwipe = (accepted) => {
    if (!cards.length) return;

    const selectedCard = cards[currentIndex];

    if (!selectedCard) {
      setError("Invalid card data. Try reshuffling.");
      return;
    }

    if (accepted) {
      let nextLayer;
      if (currentLayer === "persona") {
        nextLayer = "tier1";
      } else if (currentLayer === "tier1") {
        nextLayer = "tier2";
      } else if (currentLayer === "tier2") {
        nextLayer = "places";
      }

      setBreadcrumbs([...breadcrumbs, selectedCard.name]);
      fetchCards(nextLayer, selectedCard.name);
    } else {
      setCurrentIndex((prev) => (prev + 1 < cards.length ? prev + 1 : 0));
    }
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
