import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import "../styles/tinderSwipe.css"; // 📌 Import mobile-friendly UI

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [userWeight, setUserWeight] = useState(0);
  const [boosterPack, setBoosterPack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUserWeight();
    fetchCards("persona"); // 🚀 Always start with Personas
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

    // 🔥 Step 1: Always start with Personas
    if (layer === "persona") {
      query = query.or("tags.cs.{Food}, tags.cs.{Socialite}, tags.cs.{Adventurer}");
    }
    // 🔥 Step 2: Move to Tier 1 based on Persona selection
    else if (layer === "tier1" && previousSelection) {
      query = query.contains("tags", [previousSelection]);
    }
    // 🔥 Step 3: Move to Tier 2 based on Tier 1 selection
    else if (layer === "tier2" && previousSelection) {
      query = query.contains("tags", [previousSelection]);
    }
    // 🔥 Step 4: Only show places after all Tier 2 tags are exhausted
    else if (layer === "places" && previousSelection) {
      if (userWeight >= 200) {
        query = query.or("tags.cs.{rare_match}");
      } else if (userWeight >= 160) {
        query = query.contains("tags", [previousSelection]);
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
    } catch (err) {
      setError(`Failed to load ${layer} cards. Try reshuffling.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = (accepted) => {
    if (!cards.length) return;

    const selectedCard = cards[currentIndex];

    if (!selectedCard || !selectedCard.tags) {
      setError("Invalid card data. Try reshuffling.");
      return;
    }

    if (accepted) {
      let nextLayer =
        selectedCard.tags.includes("tier1")
          ? "tier1"
          : selectedCard.tags.includes("tier2")
          ? "tier2"
          : "places";

      setBreadcrumbs([...breadcrumbs, selectedCard.tags[0]]);

      if (nextLayer === "tier1") setUserWeight((prev) => prev + 100);
      if (nextLayer === "tier2") setUserWeight((prev) => prev + 60);

      if (userWeight + (nextLayer === "tier1" ? 100 : 60) >= 160) {
        setBoosterPack(true);
      } else {
        fetchCards(nextLayer, selectedCard.tags[0]);
      }
    } else {
      setCurrentIndex((prev) => (prev + 1 < cards.length ? prev + 1 : 0));
    }
  };

  const openBoosterPack = () => {
    setUserWeight((prev) => prev - 160);
    setBoosterPack(false);
    fetchCards("places");
  };

  const dialN = async () => {
    setBoosterPack(false);

    let { data, error } = await supabase
      .from("places")
      .select("*")
      .gte("match_score", 200)
      .limit(1);

    if (error) {
      console.error("Error finding Rare Match:", error);
    } else if (data.length > 0) {
      setCards(data);
    } else {
      fetchCards("tier2");
    }
  };

  return (
    <div className="app">
      {/* Breadcrumbs in Top Left */}
      <div className="breadcrumb">{breadcrumbs.join(" → ")}</div>

      {/* Booster Pack Unlock Screen */}
      {boosterPack ? (
        <div className="booster-screen">
          <h1>Booster Pack Unlocked!</h1>
          <button onClick={openBoosterPack}>Open</button>
          <button onClick={dialN}>DialN</button>
        </div>
      ) : error ? (
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

      {/* Swipe UI Controls */}
      <div className="swipe-buttons">
        <button className="no-button" onClick={() => handleSwipe(false)}>❌ No</button>
        <button className="yes-button" onClick={() => handleSwipe(true)}>✅ Yes</button>
      </div>

      {/* Reshuffle Button */}
      <button className="reshuffle-button" onClick={() => fetchCards("persona")}>🔄 Reshuffle</button>
    </div>
  );
}
