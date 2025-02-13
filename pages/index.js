import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ✨ No more CSS imports – rely on your global stylesheet
// import "../styles/tinderSwipe.css";  // removed as requested

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Use a default user ID for the user_progress table
const DEFAULT_USER_ID = "static_user";

export default function Home() {
  // Core state variables
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [userWeight, setUserWeight] = useState(0);
  const [currentLayer, setCurrentLayer] = useState("persona");

  // Loading & error handling
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Overlays / advanced states
  const [showMatch, setShowMatch] = useState(false);
  const [boosterPack, setBoosterPack] = useState(false);

  useEffect(() => {
    initializeUser();
  }, []);

  /** 
   * 1️⃣ Ensure user weight row exists, then fetch initial personas.
   */
  const initializeUser = async () => {
    await fetchUserWeight();
    await fetchCards("persona");
  };

  /** 
   * 2️⃣ Fetch or create the user weight row.
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
   * 3️⃣ Query the correct table based on layer:
   *    - persona -> from "personas"
   *    - tier1,2,3 -> from "tag_mappings"
   *    - places -> from "places" (need weight >= 160)
   */
  const fetchCards = async (layer, previousSelection = null) => {
    setLoading(true);
    setError(null);

    let query;

    try {
      // A) Personaa
      if (layer === "persona") {
        query = supabase.from("personas").select("*");
      } 
      // B) Tier1, Tier2, Tier3 from "tag_mappings"
      else if ((layer === "tier1" || layer === "tier2" || layer === "tier3") && previousSelection) {
        // We interpret the tier number from the layer name
        const tierNum = layer === "tier1" ? 1 : layer === "tier2" ? 2 : 3;
        query = supabase
          .from("tag_mappings")
          .select("child_tag")
          .eq("parent_tag", previousSelection)
          .eq("tier", tierNum);
      }
      // C) Places
      else if (layer === "places" && previousSelection) {
        if (userWeight < 160) {
          console.warn("Not enough weight to unlock places!");
          setLoading(false);
          return [];
        }
        query = supabase
          .from("places")
          .select("*")
          .contains("tags", [previousSelection]);
      } 
      // D) Fallback or unknown
      else {
        setLoading(false);
        return [];
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        console.warn(`No results for layer: ${layer}`);
        setLoading(false);
        return [];
      }

      // Format the results. If "personas" or "places", we expect .name
      // If "tag_mappings", we expect .child_tag
      let formatted;
      if (layer === "persona" || layer === "places") {
        formatted = data.map(item => ({
          name: item.name || "Unnamed"
        }));
      } else {
        // tier1/2/3 => from tag_mappings
        formatted = data.map(item => ({
          name: item.child_tag || "Unnamed"
        }));
      }

      setCards(formatted);
      setCurrentIndex(0);
      setCurrentLayer(layer);

      return data; // Return raw data if we want to do fallback checks
    } catch (err) {
      console.error("fetchCards error:", err);
      setError(`Failed to load ${layer} cards. Try reshuffling.`);
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * 4️⃣ Swiping "Yes" or "No" on the current card
   */
  const handleSwipe = async (accepted) => {
    if (!cards.length) return;

    const selectedCard = cards[currentIndex];
    if (!selectedCard) {
      setError("Invalid card data. Try reshuffling.");
      return;
    }

    // If user swipes left (No), skip to next card
    if (!accepted) {
      const nextIdx = currentIndex + 1;
      if (nextIdx < cards.length) {
        setCurrentIndex(nextIdx);
      } else {
        // If out of cards in this layer, attempt to re-fetch same layer
        const fallback = await fetchCards(currentLayer);
        if (!fallback || fallback.length === 0) {
          console.warn("No more cards in this layer. Try persona again?");
        }
      }
      return;
    }

    // If user swipes right (Yes), determine next layer
    let nextLayer;
    let addedWeight = 0;

    if (currentLayer === "persona") {
      nextLayer = "tier1";
      addedWeight = 100; // ex. +100 for persona->tier1
    } else if (currentLayer === "tier1") {
      nextLayer = "tier2";
      addedWeight = 60;  // ex. +60 for tier1->tier2
    } else if (currentLayer === "tier2") {
      nextLayer = "tier3";
      addedWeight = 60;  // ex. +60 for tier2->tier3
    } else if (currentLayer === "tier3") {
      nextLayer = "places";
      addedWeight = 0;   // maybe no addition?
    } else if (currentLayer === "places") {
      // If we are already in places, then the user is "matching" a place
      setShowMatch(true);
      return;
    }

    // Add to breadcrumbs
    setBreadcrumbs(prev => [...prev, selectedCard.name]);

    // Update user weight
    if (addedWeight > 0) {
      const newWeight = userWeight + addedWeight;
      setUserWeight(newWeight);

      // Update DB
      await updateUserWeightInDB(newWeight);

      // If crossing 160 threshold, show booster
      if (userWeight < 160 && newWeight >= 160) {
        setBoosterPack(true);
        return; // Wait for user to open booster or dialN
      }
    }

    // Get next layer's data
    const newCards = await fetchCards(nextLayer, selectedCard.name);

    // If no data for next layer, fallback to places
    if ((!newCards || newCards.length === 0) && nextLayer !== "places") {
      console.warn(`No ${nextLayer} found. Attempting direct places fallback.`);
      await fetchCards("places", selectedCard.name);
    }
  };

  /**
   * 5️⃣ Booster pack: user chooses to open or do "DialN"
   *    - Subtract 160 from weight
   *    - Either fetch places or dialN for a rare match
   */
  const openBoosterPack = async () => {
    const newWeight = userWeight - 160;
    setUserWeight(newWeight);
    await updateUserWeightInDB(newWeight);
    setBoosterPack(false);

    // We can immediately jump to "places" 
    if (breadcrumbs.length > 0) {
      await fetchCards("places", breadcrumbs[breadcrumbs.length - 1]);
    }
  };

  /**
   * 6️⃣ DialN for a "rare match" if userWeight >= 200
   *    - Example: fetch places with match_score >= 200
   */
  const dialN = async () => {
    setBoosterPack(false);
    try {
      const { data, error } = await supabase
        .from("places")
        .select("*")
        .gte("match_score", 200)
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        // Show the rare match
        setCards(data.map(item => ({ name: item.name || "Unnamed" })));
        setCurrentIndex(0);
        setCurrentLayer("places");
      } else {
        // fallback if no rare match
        await fetchCards("tier3");
      }
    } catch (err) {
      console.error("DialN error:", err);
      await fetchCards("tier3");
    }
  };

  /**
   * 7️⃣ Update user weight in DB
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
      {/* Breadcrumbs */}
      <div className="breadcrumb">
        {breadcrumbs.length > 0 ? breadcrumbs.join(" → ") : "Select a Persona"}
      </div>

      {/* Weight Indicator (optional) */}
      <div className="weight-indicator">Weight: {userWeight}</div>

      {/* Booster Pack Overlay */}
      {boosterPack && (
        <div className="overlay">
          <div className="booster-screen">
            <h2>Booster Pack Unlocked!</h2>
            <p>You’ve reached 160 weight. Select your next action:</p>
            <button className="btn booster-btn" onClick={openBoosterPack}>
              Open Booster
            </button>
            <button className="btn dialn-btn" onClick={dialN}>
              DialN
            </button>
          </div>
        </div>
      )}

      {/* Match Overlay */}
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
      {error && !boosterPack && !showMatch && (
        <div className="overlay">
          <div className="error-screen">
            <h2>{error}</h2>
            <button className="btn retry-btn" onClick={() => fetchCards("persona")}>
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && !error && !boosterPack && !showMatch && (
        <div className="info-screen">
          <p>Loading cards...</p>
        </div>
      )}

      {/* Main Card UI */}
      {!loading && !error && !boosterPack && !showMatch && (
        <div className="card-area">
          {cards.length > 0 ? (
            <>
              <div className="swipe-card">
                <h2>{cards[currentIndex]?.name || "Unnamed Card"}</h2>
              </div>
              <div className="swipe-buttons">
                {/* Left / No */}
                <button className="btn no-btn" onClick={() => handleSwipe(false)}>
                  ❌ No
                </button>
                {/* Right / Yes */}
                <button className="btn yes-btn" onClick={() => handleSwipe(true)}>
                  ✅ Yes
                </button>
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

      {/* Minimal inline styles. You can remove or let your global CSS override. */}
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
        .weight-indicator {
          position: absolute;
          top: 10px;
          right: 10px;
          padding: 6px 12px;
          background: #efefef;
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
          max-width: 400px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
          position: relative;
        }
        .close-btn {
          position: absolute;
          top: 15px;
          right: 15px;
          font-size: 20px;
          cursor: pointer;
          background: transparent;
          border: none;
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
        .booster-btn {
          background: #ff9800;
          color: white;
          margin-right: 10px;
        }
        .dialn-btn {
          background: #9c27b0;
          color: white;
        }
      `}</style>
    </div>
  );
}
