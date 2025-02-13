import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Rely on your global CSS, not an imported file
// import "../styles/tinderSwipe.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const DEFAULT_USER_ID = "static_user";

/** Layer definitions for clarity */
const LAYER_PERSONA = "persona";
const LAYER_TIER1 = "tier1";
const LAYER_TIER2 = "tier2";
const LAYER_PLACES = "places";

export default function Home() {
  // Core state
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [userWeight, setUserWeight] = useState(0);

  // Current layer + history for "Go Back" functionality
  const [currentLayer, setCurrentLayer] = useState(LAYER_PERSONA);
  const [layerHistory, setLayerHistory] = useState([]);

  // Basic loading/error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Overlay states
  const [showMatch, setShowMatch] = useState(false);
  const [boosterPack, setBoosterPack] = useState(false);
  const [dialNOverlay, setDialNOverlay] = useState(false);

  useEffect(() => {
    initializeUser();
  }, []);

  /**
   * 1) Ensure user weight row exists, then fetch persona cards.
   */
  const initializeUser = async () => {
    await fetchUserWeight();
    await fetchCards(LAYER_PERSONA);
  };

  /**
   * 2) Fetch or create default user weight
   */
  const fetchUserWeight = async () => {
    try {
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
    } catch (err) {
      console.error("Error fetching user weight:", err);
    }
  };

  /**
   * 3) Re-usable function to fetch from correct table based on `layer`.
   *    - persona => "personas" table
   *    - tier1 / tier2 => "tag_mappings" table
   *    - places => "places" table
   */
  const fetchCards = async (layer, previousSelection = null) => {
    setLoading(true);
    setError(null);

    try {
      let query;

      if (layer === LAYER_PERSONA) {
        // from "personas" table
        query = supabase.from("personas").select("*");
      } else if (layer === LAYER_TIER1 && previousSelection) {
        query = supabase
          .from("tag_mappings")
          .select("child_tag")
          .eq("parent_tag", previousSelection)
          .eq("tier", 1);
      } else if (layer === LAYER_TIER2 && previousSelection) {
        query = supabase
          .from("tag_mappings")
          .select("child_tag")
          .eq("parent_tag", previousSelection)
          .eq("tier", 2);
      } else if (layer === LAYER_PLACES && previousSelection) {
        // If weight >= 200, always show places ignoring tags
        if (userWeight >= 200) {
          query = supabase
            .from("places")
            .select("*");
        }
        // Else if weight >= 160, filter by tags
        else if (userWeight >= 160) {
          query = supabase
            .from("places")
            .select("*")
            .contains("tags", [previousSelection]);
        } else {
          // not enough weight for places
          setLoading(false);
          console.warn("Not enough weight to unlock places!");
          return [];
        }
      } else {
        setLoading(false);
        return [];
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) {
        console.warn(`No results found for layer: ${layer}`);
        setLoading(false);
        return [];
      }

      // Format data for UI
      let formatted;
      if (layer === LAYER_PERSONA || layer === LAYER_PLACES) {
        formatted = data.map(item => ({
          name: item.name || "Unnamed"
        }));
      } else {
        // tier1 / tier2 => child_tag
        formatted = data.map(item => ({
          name: item.child_tag || "Unnamed"
        }));
      }

      // Update states
      setCards(formatted);
      setCurrentIndex(0);
      setCurrentLayer(layer);

      // Push new layer & cards to layerHistory for go-back
      setLayerHistory(prev => [
        ...prev,
        {
          layer,
          cards: formatted,
          index: 0,
          previousSelection
        }
      ]);

      return data;
    } catch (err) {
      console.error("Error in fetchCards:", err);
      setError(`Failed to load ${layer} cards.`);
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * 4) The user can always skip (No), or accept (Yes).
   */
  const handleSwipe = async (accepted) => {
    if (!cards.length) return;

    const selectedCard = cards[currentIndex];
    if (!selectedCard) {
      setError("Invalid card data. Try reshuffling.");
      return;
    }

    // If user picks "No" => skip to next card
    if (!accepted) {
      const nextIdx = currentIndex + 1;
      if (nextIdx < cards.length) {
        setCurrentIndex(nextIdx);
      } else {
        // if out of cards, re-fetch same layer
        await fetchCards(currentLayer);
      }
      return;
    }

    // If user picks "Yes" => pick next layer in chain
    let nextLayer = null;
    let weightToAdd = 0;

    if (currentLayer === LAYER_PERSONA) {
      nextLayer = LAYER_TIER1;
      weightToAdd = 100;
    } else if (currentLayer === LAYER_TIER1) {
      nextLayer = LAYER_TIER2;
      weightToAdd = 60;
    } else if (currentLayer === LAYER_TIER2) {
      nextLayer = LAYER_PLACES;
      // no extra weight? or do +60 again if you prefer
      weightToAdd = 0;
    } else if (currentLayer === LAYER_PLACES) {
      // If we are already in places, user is matching a place
      setShowMatch(true);
      return;
    }

    // Add breadcrumb
    setBreadcrumbs(prev => [...prev, selectedCard.name]);

    // Update weight & check thresholds
    if (weightToAdd > 0) {
      const newWeight = userWeight + weightToAdd;
      setUserWeight(newWeight);
      await updateUserWeightInDB(newWeight);

      // If crossing 160 (but below 200), show booster
      if (userWeight < 160 && newWeight >= 160 && newWeight < 200) {
        setBoosterPack(true);
        return;
      }
      // If crossing 200, show dialN
      if (userWeight < 200 && newWeight >= 200) {
        setDialNOverlay(true);
        return;
      }
    }

    // fetch next layer
    const nextData = await fetchCards(nextLayer, selectedCard.name);
    if ((!nextData || nextData.length === 0) && nextLayer !== LAYER_PLACES) {
      // fallback to places if no data in next layer
      await fetchCards(LAYER_PLACES, selectedCard.name);
    }
  };

  /**
   * 5) "Go Back" to the previous layer in layerHistory
   */
  const goBackOneLayer = () => {
    if (layerHistory.length <= 1) {
      // There's no previous layer to go back to
      console.warn("No previous layer in history.");
      return;
    }
    // Remove current layer
    const newHistory = [...layerHistory];
    newHistory.pop(); // remove last item

    // The new last item in history is the "previous" layer
    const { layer, cards, index, previousSelection } = newHistory[newHistory.length - 1];

    // Update states
    setLayerHistory(newHistory);
    setCurrentLayer(layer);
    setCards(cards);
    setCurrentIndex(index);
    // If needed, remove the last breadcrumb
    setBreadcrumbs(prev => prev.slice(0, -1));
  };

  /**
   * 6) Booster Pack logic at 160 weight
   */
  const openBoosterPack = async () => {
    // Subtract 160 from userWeight
    const newWeight = userWeight - 160;
    setUserWeight(newWeight);
    await updateUserWeightInDB(newWeight);

    setBoosterPack(false);
    // We can jump to places if we like, using the last breadcrumb
    if (breadcrumbs.length > 0) {
      await fetchCards(LAYER_PLACES, breadcrumbs[breadcrumbs.length - 1]);
    }
  };

  /**
   * 7) DialN logic at 200 weight
   */
  const dialN = async () => {
    setDialNOverlay(false);
    try {
      // e.g. match_score >= 200
      const { data, error } = await supabase
        .from("places")
        .select("*")
        .gte("match_score", 200)
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const rareMatch = data.map(item => ({
          name: item.name || "Unnamed"
        }));
        setCards(rareMatch);
        setCurrentIndex(0);
        setCurrentLayer(LAYER_PLACES);
        // update layerHistory for "rare match"
        setLayerHistory(prev => [
          ...prev,
          { layer: LAYER_PLACES, cards: rareMatch, index: 0, previousSelection: "rare_match" }
        ]);
      } else {
        // fallback to tier2
        await fetchCards(LAYER_TIER2, breadcrumbs[breadcrumbs.length - 1]);
      }
    } catch (err) {
      console.error("DialN error:", err);
      // fallback
      await fetchCards(LAYER_TIER2, breadcrumbs[breadcrumbs.length - 1]);
    }
  };

  /**
   * 8) Update user weight in DB
   */
  const updateUserWeightInDB = async (newWeight) => {
    const { error } = await supabase
      .from("user_progress")
      .update({ weight: newWeight })
      .eq("user_id", DEFAULT_USER_ID);

    if (error) {
      console.error("Error updating user weight:", error);
    }
  };

  return (
    <div className="app-container">
      {/* (Optional) "Go Back" at top-left or top-right */}
      <div className="top-row">
        <button className="btn back-btn" onClick={goBackOneLayer}>
          ← Go Back
        </button>
        {/* Show weight top-right */}
        <div className="weight-indicator">Weight: {userWeight}</div>
      </div>

      {/* Breadcrumbs */}
      <div className="breadcrumb">
        {breadcrumbs.length > 0 ? breadcrumbs.join(" → ") : "Select a Persona"}
      </div>

      {/* Booster Pack (160) */}
      {boosterPack && (
        <div className="overlay">
          <div className="booster-screen">
            <h2>Booster Pack Unlocked!</h2>
            <p>You’ve reached 160 weight! Next step?</p>
            <button className="btn booster-btn" onClick={openBoosterPack}>
              Open Booster
            </button>
            <button className="btn skip-btn" onClick={() => setBoosterPack(false)}>
              Skip
            </button>
          </div>
        </div>
      )}

      {/* DialN overlay (200) */}
      {dialNOverlay && (
        <div className="overlay">
          <div className="booster-screen">
            <h2>DialN Unlocked!</h2>
            <p>You’ve reached 200 weight—want a Rare Match?</p>
            <button className="btn dialn-btn" onClick={dialN}>
              DialN
            </button>
            <button className="btn skip-btn" onClick={() => setDialNOverlay(false)}>
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Match Found */}
      {showMatch && (
        <div className="overlay">
          <div className="match-screen">
            <h1>Match Found!</h1>
            <button className="close-btn" onClick={() => setShowMatch(false)}>
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && !boosterPack && !showMatch && !dialNOverlay && (
        <div className="overlay">
          <div className="error-screen">
            <h2>{error}</h2>
            <button className="btn retry-btn" onClick={() => fetchCards(LAYER_PERSONA)}>
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && !error && !boosterPack && !showMatch && !dialNOverlay && (
        <div className="info-screen">
          <p>Loading cards...</p>
        </div>
      )}

      {/* Main Card UI */}
      {!loading && !error && !boosterPack && !showMatch && !dialNOverlay && (
        <div className="card-area">
          {cards.length > 0 ? (
            <>
              <div className="swipe-card">
                <h2>{cards[currentIndex]?.name || "Unnamed Card"}</h2>
              </div>
              <div className="swipe-buttons">
                {/* No => skip */}
                <button className="btn no-btn" onClick={() => handleSwipe(false)}>
                  ❌ No
                </button>
                {/* Yes => proceed */}
                <button className="btn yes-btn" onClick={() => handleSwipe(true)}>
                  ✅ Yes
                </button>
              </div>
            </>
          ) : (
            <div className="info-screen">
              <p>No cards available. Try reshuffling.</p>
              <button className="btn reshuffle-btn" onClick={() => fetchCards(LAYER_PERSONA)}>
                🔄 Reshuffle
              </button>
            </div>
          )}
        </div>
      )}

      {/* Minimal inline styles for layout. Let your global CSS override this if needed. */}
      <style jsx>{`
        .app-container {
          position: relative;
          max-width: 480px;
          margin: 0 auto;
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: #fafafa;
          font-family: sans-serif;
          overflow: hidden;
        }
        .top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
        }
        .breadcrumb {
          margin: 0 10px;
          font-size: 14px;
          font-weight: 600;
          color: #555;
        }
        .weight-indicator {
          background: #eee;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 14px;
        }
        .card-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
        }
        .swipe-card {
          background: white;
          border-radius: 8px;
          padding: 20px;
          width: 90%;
          max-width: 340px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }
        .swipe-buttons {
          display: flex;
          justify-content: space-around;
          width: 80%;
          max-width: 320px;
        }
        .btn {
          border: none;
          border-radius: 8px;
          padding: 10px 16px;
          font-size: 16px;
          cursor: pointer;
        }
        .back-btn {
          background: #ccc;
          color: #333;
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
        .overlay {
          position: absolute;
          top: 0;
          left: 0;
          z-index: 999;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .booster-screen,
        .error-screen,
        .match-screen {
          background: #fff;
          border-radius: 8px;
          padding: 25px 20px;
          text-align: center;
          width: 80%;
          max-width: 420px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
          position: relative;
        }
        .match-screen h1 {
          margin-bottom: 20px;
        }
        .close-btn {
          position: absolute;
          top: 15px;
          right: 15px;
          font-size: 20px;
          border: none;
          background: transparent;
          cursor: pointer;
        }
        .info-screen {
          text-align: center;
          margin-top: 50px;
        }
        .retry-btn {
          background: #f44336;
          color: #fff;
          margin-top: 15px;
        }
        .booster-btn {
          background: #ff9800;
          color: #fff;
          margin-right: 10px;
        }
        .dialn-btn {
          background: #9c27b0;
          color: #fff;
          margin-right: 10px;
        }
        .skip-btn {
          background: #ccc;
          color: #333;
        }
      `}</style>
    </div>
  );
}
