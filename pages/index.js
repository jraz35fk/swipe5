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
  const [searchTag, setSearchTag] = useState("");
  const [tagVisibility, setTagVisibility] = useState({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      fetchCards("persona"); // Start at Persona selection
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
      fetchCards(nextLayer, selectedCard.tags[0]);
    } else {
      setCurrentIndex((prevIndex) => (prevIndex + 1 < cards.length ? prevIndex + 1 : 0));

      if (currentIndex + 1 >= cards.length) {
        fetchCards("untagged");
      }
    }
  };

  // Toggle Tag Visibility
  const toggleTags = (placeId) => {
    setTagVisibility((prev) => ({
      ...prev,
      [placeId]: !prev[placeId],
    }));
  };

  // Remove a Tag
  const removeTag = async (placeId, tagToRemove) => {
    const place = cards.find(p => p.id === placeId);
    if (!place) return;

    const updatedTags = place.tags.filter(tag => tag !== tagToRemove);

    try {
      const { error } = await supabase
        .from("places")
        .update({ tags: updatedTags })
        .eq("id", placeId);

      if (error) throw error;
      fetchCards("untagged");
    } catch (err) {
      console.error("Error removing tag:", err);
    }
  };

  return (
    <div className="app">
      {error ? (
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
                <button onClick={() => toggleTags(cards[currentIndex].id)}>Show Tags</button>

                {tagVisibility[cards[currentIndex].id] && (
                  <div className="tag-container">
                    {cards[currentIndex].tags.map(tag => (
                      <span key={tag} className="tag">
                        {tag} <button className="remove-tag" onClick={() => removeTag(cards[currentIndex].id, tag)}>×</button>
                      </span>
                    ))}
                  </div>
                )}
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
        .app {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background: #f4f4f4;
        }
        .card-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .buttons, .nav-buttons {
          display: flex;
          gap: 20px;
          margin-top: 20px;
        }
        .tag-container {
          margin-top: 10px;
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }
        .tag {
          background: #ddd;
          padding: 5px 10px;
          border-radius: 5px;
          display: flex;
          align-items: center;
        }
        .remove-tag {
          margin-left: 5px;
          border: none;
          background: red;
          color: white;
          cursor: pointer;
          font-weight: bold;
          padding: 2px 5px;
          border-radius: 50%;
        }
      `}</style>
    </div>
  );
}
