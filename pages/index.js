import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Supabase Configuration
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState([]);
  const [showMatch, setShowMatch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tagVisibility, setTagVisibility] = useState({});
  const [userWeight, setUserWeight] = useState(0);
  const [boosterPack, setBoosterPack] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      fetchCards("persona");
    }
  }, []);

  // Fetch Cards Based on Layer
  const fetchCards = async (layer, previousSelection = null) => {
    setLoading(true);
    setError(null);

    let query = supabase.from("places").select("*");

    if (layer === "persona") {
      query = query.or(
        "tags.cs.{Foodie}, tags.cs.{Socialite}, tags.cs.{Adventurer}, tags.cs.{Curator}, tags.cs.{Wonderer}"
      );
    } else if (layer === "tier1" && previousSelection) {
      query = query.contains("tags", [previousSelection]);
    } else if (layer === "tier2" && previousSelection) {
      query = query.contains("tags", [previousSelection]);
    } else if (layer === "places" && previousSelection) {
      query = query.contains("tags", [previousSelection]);
    } else if (layer === "untagged") {
      query = query.or(
        "tags.cs.{Foodie}, tags.cs.{Socialite}, tags.cs.{Adventurer}, tags.cs.{Curator}, tags.cs.{Wonderer}"
      ); 
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

  // Handle Card Selection
  const handleSelection = (accepted) => {
    if (!cards || cards.length === 0) return;

    if (accepted) {
      const selectedCard = cards[currentIndex];

      if (!selectedCard || !selectedCard.tags) {
        setError("Invalid card data. Try reshuffling.");
        return;
      }

      if (selectedCard.tags.includes("place")) {
        setShowMatch(true);
        return;
      }

      let nextLayer =
        selectedCard.tags.includes("tier1")
          ? "tier1"
          : selectedCard.tags.includes("tier2")
          ? "tier2"
          : "places";

      setHistory([...history, { layer: nextLayer, selection: selectedCard.tags[0] }]);

      if (nextLayer === "tier1") setUserWeight((prev) => prev + 100);
      if (nextLayer === "tier2") setUserWeight((prev) => prev + 60);

      if (userWeight + (nextLayer === "tier1" ? 100 : 60) >= 160) {
        setBoosterPack(true); // Trigger booster pack event
      } else {
        fetchCards(nextLayer, selectedCard.tags[0]);
      }
    } else {
      setCurrentIndex((prevIndex) => (prevIndex + 1 < cards.length ? prevIndex + 1 : 0));

      if (currentIndex + 1 >= cards.length) {
        fetchCards("untagged");
      }
    }
  };

  // Open Booster Pack (Show Places)
  const openBoosterPack = () => {
    setUserWeight((prev) => prev - 160);
    setBoosterPack(false);
    fetchCards("places");
  };

  // DialN (Continue Refining)
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
      ) : showMatch ? (
        <div className="match-screen">
          <h1>Match Made!</h1>
          <button onClick={() => setShowMatch(false)}>X</button>
        </div>
      ) : (
        <div className="card-container">
          {cards.length > 0 ? (
            <>
              <div className="card">
                <h2>{cards[currentIndex]?.name || "Unnamed Card"}</h2>
              </div>

              <div className="buttons">
                <button onClick={() => handleSelection(false)}>No</button>
                <button onClick={() => handleSelection(true)}>Yes</button>
              </div>

              <div className="nav-buttons">
                <button onClick={() => fetchCards("persona")}>Reshuffle</button>
              </div>
            </>
          ) : (
            <p>No cards available. Try reshuffling.</p>
          )}
        </div>
      )}

      <style jsx>{`
        .booster-screen {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background: #f4f4f4;
        }
      `}</style>
    </div>
  );
}
