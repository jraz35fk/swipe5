import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import "../styles/tinderSwipe.css"; // Import your mobile-friendly CSS

// 👈 Use a default user ID so we always fetch/update the same row
const DEFAULT_USER_ID = "static_user";

// Create Supabase client with your environment variables
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  // State variables
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [userWeight, setUserWeight] = useState(0);
  const [currentLayer, setCurrentLayer] = useState("persona");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Optional: If you want overlays like a "Match Found" or "Booster"
  const [showMatch, setShowMatch] = useState(false);
  const [boosterPack, setBoosterPack] = useState(false);

  // Load user weight & fetch the first layer (personas)
  useEffect(() => {
    fetchUserWeight();
    fetchCards("persona");
  }, []);

  // 1️⃣ Always fetch or initialize user weight
  const fetchUserWeight = async () => {
    const { data, error } = await supabase
      .from("user_progress")
      .select("weight")
      .eq("user_id", DEFAULT_USER_ID)
      .single();

    if (error || !data) {
      console.warn("User weight not found. Creating a default entry...");

      // Create a new user_progress row with weight=0 if none exists
      const { error: insertError } = await supabase
        .from("user_progress")
        .insert([{ user_id: DEFAULT_USER_ID, weight: 0 }], { upsert: true });

      if (insertError) {
        console.error("Failed to create user weight:", insertError);
        return;
      }
      setUserWeight(0);
    } else {
      setUserWeight(data.weight);
    }
  };

  // 2️⃣ Universal function to fetch cards from the correct table
  const fetchCards = async (layer, previousSelection = null) => {
    setLoading(true);
    setError(null);

    try {
      let query;

      if (layer === "persona") {
        // **Separate Personas Table** (e.g. "personas")
        query = supabase.from("personas").select("*");

      } else if (layer === "tier1" && previousSelection) {
        // **Tier1** from your tag_mapping table (example)
        //  - Possibly filter by `persona_name` or some foreign key
        query = supabase
          .from("tag_mapping")
          .select("*")
          .eq("tier", 1)
          // Example: match the parent persona name
          .eq("parent_name", previousSelection);

      } else if (layer === "tier2" && previousSelection) {
        // **Tier2** from your tag_mapping table
        query = supabase
          .from("tag_mapping")
          .select("*")
          .eq("tier", 2)
          // Example: match the parent from tier1
          .eq("parent_name", previousSelection);

      } else if (layer === "places" && previousSelection) {
        // **Places**: locked behind userWeight
        // If you want a bigger threshold for rare matches, you can do more logic here
        if (userWeight >= 160) {
          query = supabase
            .from("places")
            .select("*")
            // Example: filter by a certain tag that matches the tier2 selection
            .contains("tags", [previousSelection]);
        } else {
          setError("Not enough weight to unlock places.");
          setLoading(false);
          return;
        }

      } else {
        // Fallback if something is missing
        setLoading(false);
        return;
      }

      // Run the query
      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error(`No cards found for layer: ${layer}`);
      }

      setCards(data);
      setCurrentIndex(0);
      setCurrentLayer(layer);
    } catch (err) {
      console.error(err);
      setError(`Failed to load ${layer}. Try reshuffling.`);
    } finally {
      setLoading(false);
    }
  };

  // 3️⃣ Handle user swiping "Yes" or "No"
  const handleSwipe = (accepted) => {
    if (!cards || cards.length === 0) return;

    const currentCard = cards[currentIndex];
    if (!currentCard) {
      setError("Invalid card data. Try reshuffling.");
      return;
    }

    // If user swiped Right (Yes)
    if (accepted) {
      // Add the card name to breadcrumbs
      const label = currentCard.name || currentCard.tag || "unknown";
      setBreadcrumbs((prev) => [...prev, label]);

      // Decide next layer based on the currentLayer
      let nextLayer;
      let weightToAdd = 0;

      if (currentLayer === "persona") {
        nextLayer = "tier1";
        weightToAdd = 100; // Example: persona -> tier1
      } else if (currentLayer === "tier1") {
        nextLayer = "tier2";
        weightToAdd = 60; // Example: tier1 -> tier2
      } else if (currentLayer === "tier2") {
        nextLayer = "places";
        weightToAdd = 0; // Or some smaller increment if you like
      } else if (currentLayer === "places") {
        // If you want "Match Found" overlay
        setShowMatch(true);
        return;
      }

      // Update user weight if needed
      if (weightToAdd > 0) {
        const newWeight = userWeight + weightToAdd;
        setUserWeight(newWeight);

        // Check if we cross 160 threshold → optional Booster Pack
        if (userWeight < 160 && newWeight >= 160) {
          setBoosterPack(true);
          return; // Stop here so user sees the overlay
        }

        // Optionally update user_progress in Supabase as well
        updateUserWeightInDB(newWeight);
      }

      // Fetch next layer
      fetchCards(nextLayer, label);

    } else {
      // If user swiped Left (No)
      const nextIdx = currentIndex + 1;
      if (nextIdx < cards.length) {
        setCurrentIndex(nextIdx);
      } else {
        // If no more cards in this layer, maybe fallback or reshuffle
        fetchCards(currentLayer);
      }
    }
  };

  // 4️⃣ Example function to update user weight in DB
  const updateUserWeightInDB = async (newWeight) => {
    const { error } = await supabase
      .from("user_progress")
      .update({ weight: newWeight })
      .eq("user_id", DEFAULT_USER_ID);

    if (error) {
      console.error("Error updating user weight:", error);
    }
  };

  // 5️⃣ Booster Pack logic if crossing 160
  const openBoosterPack = () => {
    // Subtract 160 from user weight, e.g., “cost” to open booster
    const newWeight = userWeight - 160;
    setUserWeight(newWeight);
    updateUserWeightInDB(newWeight);

    setBoosterPack(false);
    // Possibly fetch "places" right away if you want
    if (breadcrumbs.length > 0) {
      fetchCards("places", breadcrumbs[breadcrumbs.length - 1]);
    } else {
      fetchCards("places", "generic_tag");
    }
  };

  // 6️⃣ Example "DialN" for a rare match if userWeight >= 200
  const dialN = async () => {
    setBoosterPack(false);
    try {
      // For instance, fetch a "rare" place from "places"
      const { data, error } = await supabase
        .from("places")
        .select("*")
        .gte("match_score", 200)
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        // Show the rare match
        setCards(data);
        setCurrentIndex(0);
        setCurrentLayer("places");
      } else {
        // If no rare match found, maybe fallback to tier2 or something else
        fetchCards("tier2");
      }
    } catch (err) {
      console.error("Error in dialN:", err);
      // fallback
      fetchCards("tier2");
    }
  };

  // 7️⃣ Render the UI
  return (
    <div className="app-container">
      {/* Breadcrumbs (top-left) */}
      <div className="breadcrumb">
        {breadcrumbs.length > 0 ? breadcrumbs.join(" → ") : "Select a Persona"}
      </div>

      {/* Weight Indicator (top-right) */}
      <div className="weight-indicator">Weight: {userWeight}</div>

      {/* Booster Pack Overlay */}
      {boosterPack && (
        <div className="overlay">
          <div className="booster-screen">
            <h2>Booster Pack Unlocked!</h2>
            <p>You've reached 160 weight! Choose an action:</p>
            <button className="btn booster-btn" onClick={openBoosterPack}>
              Open Booster
            </button>
            <button className="btn dialn-btn" onClick={dialN}>
              DialN
            </button>
          </div>
        </div>
      )}

      {/* Match Found Overlay */}
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
      {error && (
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
      {loading && !error && !boosterPack && (
        <div className="info-screen">
          <p>Loading cards...</p>
        </div>
      )}

      {/* Main Card + Swipe Buttons */}
      {!loading && !error && !boosterPack && !showMatch && (
        <div className="card-area">
          {cards.length > 0 ? (
            <>
              {/* Current card */}
              <div className="swipe-card">
                <h2>{cards[currentIndex]?.name || "Unnamed Card"}</h2>
              </div>

              {/* Yes/No buttons */}
              <div className="swipe-buttons">
                <button className="btn no-btn" onClick={() => handleSwipe(false)}>
                  ❌ No
                </button>
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

      {/* Inline style to center like Tinder (optional if using CSS file) */}
      <style jsx>{`
        .app-container {
          display: flex;
          flex-direction: column;
          position: relative;
          width: 100%;
          max-width: 420px; /* typical mobile width */
          margin: 0 auto;
          height: 100vh;
          background: #fdfdfd;
          font-family: sans-serif;
          overflow: hidden;
        }
        .breadcrumb {
          margin: 10px;
          font-weight: bold;
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
        }
        .swipe-card {
          background: white;
          width: 90%;
          max-width: 340px;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }
        .swipe-buttons {
          display: flex;
          justify-content: space-around;
          width: 80%;
          max-width: 300px;
        }
        .btn {
          padding: 10px 15px;
          font-size: 16px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }
        .yes-btn {
          background: #4caf50;
          color: #fff;
        }
        .no-btn {
          background: #f44336;
          color: #fff;
        }
        /* Overlays */
        .overlay {
          position: absolute;
          top: 0;
          left: 0;
          z-index: 999;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.4);
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .booster-screen,
        .error-screen,
        .match-screen {
          background: white;
          border-radius: 8px;
          padding: 25px 20px;
          text-align: center;
          width: 80%;
          max-width: 400px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }
        .close-btn {
          position: absolute;
          top: 15px;
          right: 15px;
          background: transparent;
          border: none;
          font-size: 20px;
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
          color: white;
          margin-right: 10px;
        }
        .dialn-btn {
          background: #9c27b0;
          color: white;
        }
        .reshuffle-btn {
          background: #2196f3;
          color: white;
        }
      `}</style>
    </div>
  );
}
