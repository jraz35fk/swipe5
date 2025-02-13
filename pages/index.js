import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const DEFAULT_USER_ID = "static_user";

export default function Home() {
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [currentLayer, setCurrentLayer] = useState("persona");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCards("persona");
  }, []);

  /** Fetch cards for a specific layer */
  const fetchCards = async (layer, previousSelection = null) => {
    setLoading(true);
    setError(null);

    let query;
    try {
      if (layer === "persona") {
        query = supabase.from("personas").select("*");
      } else if (layer === "tier1" || layer === "tier2" || layer === "tier3") {
        query = supabase
          .from("tag_mappings")
          .select("child_tag")
          .eq("parent_tag", previousSelection)
          .eq("tier", layer === "tier1" ? 1 : layer === "tier2" ? 2 : 3);
      } else if (layer === "places") {
        query = supabase.from("places").select("*").contains("tags", [previousSelection]);
      } else {
        setLoading(false);
        return;
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) {
        console.warn(`No results for ${layer}`);
        setLoading(false);
        return;
      }

      setCards(data.map(item => ({ name: item.child_tag || item.name })));
      setCurrentIndex(0);
      setCurrentLayer(layer);
    } catch (err) {
      console.error(`Error fetching ${layer}:`, err);
      setError(`Failed to load ${layer} cards.`);
    } finally {
      setLoading(false);
    }
  };

  /** Handle swiping interaction */
  const handleSwipe = async (accepted) => {
    if (!cards.length || currentIndex >= cards.length) return;

    const selectedCard = cards[currentIndex];

    if (!accepted) {
      const nextIdx = currentIndex + 1;
      if (nextIdx < cards.length) {
        setCurrentIndex(nextIdx);
      } else {
        console.warn("No more cards. Try reshuffling.");
      }
      return;
    }

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
      return;
    }

    setBreadcrumbs([...breadcrumbs, selectedCard.name]);
    fetchCards(nextLayer, selectedCard.name);
  };

  return (
    <div className="app-container">
      {/* Breadcrumbs */}
      <div className="breadcrumb">
        {breadcrumbs.length > 0 ? breadcrumbs.join(" → ") : "Select a Persona"}
      </div>

      {/* Error Message */}
      {error && (
        <div className="info-screen">
          <h2>{error}</h2>
          <button className="btn retry-btn" onClick={() => fetchCards("persona")}>
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && !error && (
        <div className="info-screen">
          <p>Loading cards...</p>
        </div>
      )}

      {/* Card Display */}
      {!loading && !error && (
        <div className="card-area">
          {cards.length > 0 ? (
            <>
              <div className="swipe-card">
                <h2>{cards[currentIndex]?.name || "Unnamed Card"}</h2>
              </div>
              <div className="swipe-buttons">
                <button className="btn no-btn" onClick={() => handleSwipe(false)}>❌ No</button>
                <button className="btn yes-btn" onClick={() => handleSwipe(true)}>✅ Yes</button>
              </div>
            </>
          ) : (
            <div className="info-screen">
              <p>No cards available. Try reshuffling.</p>
              <button className="btn reshuffle-btn" onClick={() => fetchCards("persona")}>
                🔄 Reshuffle
              </button>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .app-container {
          position: relative;
          width: 100%;
          max-width: 420px;
          margin: 0 auto;
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: #fdfdfd;
          font-family: sans-serif;
        }
        .breadcrumb {
          margin: 10px;
          font-size: 14px;
          font-weight: 600;
          color: #555;
        }
        .card-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          padding: 10px;
        }
        .swipe-card {
          background: white;
          border-radius: 8px;
          width: 90%;
          max-width: 340px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .swipe-buttons {
          display: flex;
          justify-content: space-around;
          width: 80%;
          max-width: 300px;
        }
        .btn {
          border: none;
          border-radius: 8px;
          padding: 10px 16px;
          font-size: 16px;
          cursor: pointer;
        }
        .no-btn {
          background: #f44336;
          color: #fff;
        }
        .yes-btn {
          background: #4caf50;
          color: #fff;
        }
        .reshuffle-btn {
          background: #2196f3;
          color: white;
        }
        .info-screen {
          text-align: center;
          margin-top: 50px;
        }
        .retry-btn {
          background: #f44336;
          color: white;
          margin-top: 20px;
        }
      `}</style>
    </div>
  );
}
