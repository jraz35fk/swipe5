import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Supabase Configuration
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  const [cards, setCards] = useState([]); // Ensure it's always an array
  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState([]);
  const [showMatch, setShowMatch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); 

  // Debugging function
  const logDebug = (message, data = null) => {
    console.log(`[DEBUG]: ${message}`, data);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      fetchCards("persona");
    }
  }, []);

  // Fetch Cards from Supabase
  const fetchCards = async (layer, previousSelection = null) => {
    setLoading(true);
    setError(null);
    logDebug(`Fetching ${layer} cards...`);

    let query = supabase.from("places").select("*");

    if (layer === "persona") {
      query = query.eq("persona", true);
    } else if (layer === "tags" && previousSelection) {
      query = query.contains("tags", [previousSelection]);
    } else if (layer === "places" && previousSelection) {
      query = query.contains("tags", [previousSelection]);
    }

    try {
      const { data, error } = await query;
      if (error) throw error;

      logDebug(`Supabase Response for ${layer}:`, data);

      if (!data || data.length === 0) {
        throw new Error(`No cards found for ${layer}.`);
      }

      setCards(data);
      setCurrentIndex(0);
    } catch (err) {
      logDebug(`Fetch Error: ${err.message}`);
      setError(`Failed to load ${layer} cards. Try reshuffling.`);
    } finally {
      setLoading(false);
    }
  };

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

      setHistory([...history, { layer: "tags", selection: selectedCard.tags[0] }]);
      fetchCards(
        selectedCard.tags.includes("tier2") ? "tags" : "places",
        selectedCard.tags[0]
      );
    } else {
      setCurrentIndex((prevIndex) => (prevIndex + 1 < cards.length ? prevIndex + 1 : 0));
    }
  };

  const handleGoBack = () => {
    if (history.length === 0) return;
    const previous = history.pop();
    setHistory(history);
    fetchCards(previous.layer, previous.selection);
  };

  const handleReshuffle = () => {
    setHistory([]);
    fetchCards("persona");
  };

  return (
    <div className="app">
      {error ? (
        <div className="error-screen">
          <h2>{error}</h2>
          <button onClick={handleReshuffle}>Retry</button>
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
                <div className="card-image" />
                <h2>{cards[currentIndex]?.name || "Unnamed Card"}</h2>
              </div>
              <div className="buttons">
                <button onClick={() => handleSelection(false)}>No</button>
                <button onClick={() => handleSelection(true)}>Yes</button>
              </div>
              <div className="nav-buttons">
                <button onClick={handleGoBack}>Go Back</button>
                <button onClick={handleReshuffle}>Reshuffle</button>
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
        .card {
          width: 300px;
          height: 400px;
          background: #ccc;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          border-radius: 10px;
        }
        .card-image {
          width: 100%;
          height: 80%;
          background: gray;
        }
        .buttons {
          display: flex;
          gap: 20px;
          margin-top: 20px;
        }
        .buttons button {
          padding: 10px 20px;
          border: none;
          cursor: pointer;
        }
        .error-screen {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: red;
        }
        .match-screen {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </div>
  );
}
