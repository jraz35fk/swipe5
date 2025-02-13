import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Supabase Configuration
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  const [cards, setCards] = useState(null); // Holds the stack of cards
  const [currentIndex, setCurrentIndex] = useState(0); // Tracks current card index
  const [history, setHistory] = useState([]); // Tracks previous selections for "Go Back"
  const [showMatch, setShowMatch] = useState(false); // Controls "Match Made" screen
  const [loading, setLoading] = useState(true); // Prevents hydration issues

  // Prevent Hydration Mismatch: Ensure this runs only on the client
  useEffect(() => {
    if (typeof window !== "undefined") {
      fetchCards("persona");
    }
  }, []);

  // Fetch Cards from Supabase based on Layer
  const fetchCards = async (layer, previousSelection = null) => {
    setLoading(true); // Show loading state while fetching

    let query = supabase.from("places").select("*");

    if (layer === "persona") {
      query = query.eq("persona", true);
    } else if (layer === "tags" && previousSelection) {
      query = query.contains("tags", [previousSelection]); // Get Tier 2 tags
    } else if (layer === "places" && previousSelection) {
      query = query.contains("tags", [previousSelection]); // Get places matching tags
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching cards:", error);
      setLoading(false);
      return;
    }

    setCards(data);
    setCurrentIndex(0);
    setLoading(false); // Stop loading after data is set
  };

  // Handle Card Selection
  const handleSelection = (accepted) => {
    if (!cards || cards.length === 0) return;

    if (accepted) {
      const selectedCard = cards[currentIndex];

      // If a place card is selected, show "Match Made"
      if (selectedCard.tags.includes("place")) {
        setShowMatch(true);
        return;
      }

      // Save to history for "Go Back"
      setHistory([...history, { layer: "tags", selection: selectedCard.tags[0] }]);

      // Load the next layer (tags or places)
      fetchCards(
        selectedCard.tags.includes("tier2") ? "tags" : "places",
        selectedCard.tags[0]
      );
    } else {
      // Move to next card
      setCurrentIndex((prevIndex) => (prevIndex + 1 < cards.length ? prevIndex + 1 : 0));
    }
  };

  // Go Back to Previous Layer
  const handleGoBack = () => {
    if (history.length === 0) return;

    const previous = history.pop();
    setHistory(history);
    fetchCards(previous.layer, previous.selection);
  };

  // Reshuffle (Return to Persona Selection)
  const handleReshuffle = () => {
    setHistory([]);
    fetchCards("persona");
  };

  return (
    <div className="app">
      {loading ? (
        <p>Loading cards...</p>
      ) : showMatch ? (
        <div className="match-screen">
          <h1>Match Made!</h1>
          <button onClick={() => setShowMatch(false)}>X</button>
        </div>
      ) : (
        <div className="card-container">
          {cards && cards.length > 0 ? (
            <>
              <div className="card">
                <div className="card-image" />
                <h2>{cards[currentIndex]?.name || "Loading..."}</h2>
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
            <p>No cards available.</p>
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
        .nav-buttons {
          display: flex;
          gap: 20px;
          margin-top: 20px;
        }
        .match-screen {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background: white;
        }
        .match-screen h1 {
          font-size: 24px;
          margin-bottom: 20px;
        }
        .match-screen button {
          padding: 10px;
          font-size: 16px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
