import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// No external CSS import – rely on your global CSS
// import "../styles/tinderSwipe.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const DEFAULT_USER_ID = "static_user";

// Layer definitions
const LAYER_PERSONA_T1 = "persona_t1"; // Single combined layer for Persona + Tier1
const LAYER_TIER2 = "tier2";
const LAYER_TIER3 = "tier3";
const LAYER_PLACES = "places";

export default function Home() {
  // Core states
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [userWeight, setUserWeight] = useState(0);

  // Which layer we're in + history for "Go Back"
  const [currentLayer, setCurrentLayer] = useState(LAYER_PERSONA_T1);
  const [layerHistory, setLayerHistory] = useState([]);

  // Loading / error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Overlays
  const [showMatch, setShowMatch] = useState(false);
  const [boosterPack, setBoosterPack] = useState(false);
  const [dialNOverlay, setDialNOverlay] = useState(false);

  useEffect(() => {
    initializeUser();
  }, []);

  /**
   * 1. Initialize user weight or create default row, then fetch merged Persona+Tier1 cards
   */
  const initializeUser = async () => {
    await fetchUserWeight();
    // Combined Persona + T1 as first “layer”
    await fetchPersonaTier1();
  };

  /**
   * 2. Check or create user weight row
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
   * 3. Merge Tier 1 cards with their Persona. 
   *    Steps:
   *     - Fetch all "personas"
   *     - For each persona, fetch its Tier1 children from "tag_mappings"
   *     - Combine them in a single array: [ {name: PersonaName}, {name: Tier1Child}, ... ]
   */
  const fetchPersonaTier1 = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1) Fetch all personas
      const { data: personas, error: personaErr } = await supabase
        .from("personas")
        .select("*");
      if (personaErr) throw personaErr;

      if (!personas || personas.length === 0) {
        console.warn("No personas found.");
        setLoading(false);
        return [];
      }

      // 2) For each persona, fetch its tier1 children
      let combinedCards = [];

      for (let p of personas) {
        // Always push the persona itself
        combinedCards.push({
          name: p.name || "Unnamed Persona",
          type: "persona"
        });

        // Then find tier1 for that persona, if any
        const { data: t1data, error: t1Err } = await supabase
          .from("tag_mappings")
          .select("child_tag")
          .eq("parent_tag", p.name)
          .eq("tier", 1);

        if (t1Err) {
          console.error("Error fetching tier1 for persona:", t1Err);
          continue;
        }
        if (t1data && t1data.length > 0) {
          t1data.forEach(item => {
            combinedCards.push({
              name: item.child_tag || "Unnamed Tier1",
              type: "tier1" // to differentiate from persona
            });
          });
        }
      }

      // If we found zero total
      if (combinedCards.length === 0) {
        console.warn("No Persona+Tier1 merged results.");
        setLoading(false);
        return [];
      }

      // 3) Update cards & layer
      setCards(combinedCards);
      setCurrentIndex(0);
      setCurrentLayer(LAYER_PERSONA_T1);

      // 4) Store in layer history
      const newHistoryItem = {
        layer: LAYER_PERSONA_T1,
        cards: combinedCards,
        index: 0,
        previousSelection: null
      };
      setLayerHistory([newHistoryItem]);

      return combinedCards;
    } catch (err) {
      console.error("Error merging Persona+Tier1:", err);
      setError("Failed to load Persona+Tier1 cards.");
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * 4. Reusable fetch for Tier2, Tier3, or Places. 
   *    (We no longer have to fetch Tier1 here because it's merged with Persona.)
   */
  const fetchLayerCards = async (layer, previousSelection) => {
    setLoading(true);
    setError(null);

    try {
      let query;

      // A) Tier2 
      if (layer === LAYER_TIER2) {
        query = supabase
          .from("tag_mappings")
          .select("child_tag")
          .eq("parent_tag", previousSelection)
          .eq("tier", 2);
      }
      // B) Tier3
      else if (layer === LAYER_TIER3) {
        query = supabase
          .from("tag_mappings")
          .select("child_tag")
          .eq("parent_tag", previousSelection)
          .eq("tier", 3);
      }
      // C) Places
      else if (layer === LAYER_PLACES) {
        // Must come after Tier3 
        // If userWeight >= 200, ignore tags => show all places
        if (userWeight >= 200) {
          query = supabase.from("places").select("*");
        } else {
          // Otherwise, filter by the Tier3 selection, but also ensure we do it only after Tier3
          query = supabase
            .from("places")
            .select("*")
            .contains("tags", [previousSelection]);
        }
      } else {
        // Should not happen in normal flow
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

      let formatted;
      if (layer === LAYER_PLACES) {
        formatted = data.map(item => ({
          name: item.name || "Unnamed Place",
          type: "place"
        }));
      } else {
        // Tier2 or Tier3 => child_tag
        formatted = data.map(item => ({
          name: item.child_tag || "Unnamed Tag",
          type: layer
        }));
      }

      setCards(formatted);
      setCurrentIndex(0);
      setCurrentLayer(layer);

      // push to layerHistory
      setLayerHistory(prev => [
        ...prev,
        { layer, cards: formatted, index: 0, previousSelection }
      ]);

      return formatted;
    } catch (err) {
      console.error("fetchLayerCards error:", err);
      setError(`Failed to load ${layer}.`);
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * 5. Swiping logic. 
   *    - "No": skip card
   *    - "Yes": figure out next layer or final match
   */
  const handleSwipe = async (accepted) => {
    if (!cards.length) return;

    const selectedCard = cards[currentIndex];
    if (!selectedCard) {
      setError("Invalid card data. Try reshuffling.");
      return;
    }

    // If user says No => skip
    if (!accepted) {
      const nextIdx = currentIndex + 1;
      if (nextIdx < cards.length) {
        setCurrentIndex(nextIdx);
      } else {
        // out of cards -> re-fetch same layer
        await reFetchCurrentLayer();
      }
      return;
    }

    // If user says Yes => pick next layer in chain
    let nextLayer = null;
    let weightToAdd = 0;

    // We combine persona + tier1 in one array:
    // - If selectedCard.type = 'persona' or 'tier1', we go to Tier2
    // - If selectedCard.type = 'tier2', we go to Tier3
    // - If selectedCard.type = 'tier3', we go to Places
    // - If selectedCard.type = 'place', show match
    if (selectedCard.type === "persona" || selectedCard.type === "tier1") {
      nextLayer = LAYER_TIER2;
      // Example increments
      // persona->tier1 merged, so let's do +100 if persona, +60 if tier1, or just pick one value
      weightToAdd = selectedCard.type === "persona" ? 100 : 60;
    } else if (selectedCard.type === LAYER_TIER2) {
      nextLayer = LAYER_TIER3;
      weightToAdd = 60;
    } else if (selectedCard.type === LAYER_TIER3) {
      nextLayer = LAYER_PLACES;
      weightToAdd = 0; // up to you
    } else if (selectedCard.type === "place") {
      // Final match found
      setShowMatch(true);
      return;
    }

    // Add to breadcrumbs
    setBreadcrumbs(prev => [...prev, selectedCard.name]);

    // Update weight, check thresholds
    if (weightToAdd > 0) {
      const newWeight = userWeight + weightToAdd;
      setUserWeight(newWeight);
      await updateUserWeightInDB(newWeight);

      // Booster triggers at 220
      if (userWeight < 220 && newWeight >= 220 && newWeight < 2000) {
        // The user specifically wants booster at 220 
        setBoosterPack(true);
        return; // Stop so user sees booster overlay
      }

      // If crossing 200 => dialN overlay
      if (userWeight < 200 && newWeight >= 200) {
        setDialNOverlay(true);
        return;
      }
    }

    // fetch next layer
    const nextData = await fetchLayerCards(nextLayer, selectedCard.name);
    // if no results => fallback to places if nextLayer isn't places
    if ((!nextData || nextData.length === 0) && nextLayer !== LAYER_PLACES) {
      await fetchLayerCards(LAYER_PLACES, selectedCard.name);
    }
  };

  /** 5b. Re-fetch the current layer from layerHistory */
  const reFetchCurrentLayer = async () => {
    if (!layerHistory.length) return;
    const last = layerHistory[layerHistory.length - 1];
    const { layer, previousSelection } = last;

    if (layer === LAYER_PERSONA_T1) {
      await fetchPersonaTier1();
    } else {
      // Tier2, Tier3, or Places
      await fetchLayerCards(layer, previousSelection);
    }
  };

  /**
   * 6. "Go Back" button – pop layerHistory 
   */
  const goBackOneLayer = () => {
    if (layerHistory.length <= 1) {
      console.warn("No previous layer to go back to.");
      return;
    }
    // Remove current layer
    const newHistory = [...layerHistory];
    newHistory.pop(); // discard last

    // The new last is the previous layer
    const { layer, cards, index, previousSelection } = newHistory[newHistory.length - 1];

    // Revert states
    setLayerHistory(newHistory);
    setCurrentLayer(layer);
    setCards(cards);
    setCurrentIndex(index);
    // Remove last breadcrumb
    setBreadcrumbs(prev => prev.slice(0, -1));
  };

  /**
   * 7. Booster at 220 weight
   */
  const openBoosterPack = async () => {
    // Subtract 220 from userWeight
    const newWeight = userWeight - 220;
    setUserWeight(newWeight);
    await updateUserWeightInDB(newWeight);

    setBoosterPack(false);

    // Optionally fetch "places" right away
    if (breadcrumbs.length > 0) {
      await fetchLayerCards(LAYER_PLACES, breadcrumbs[breadcrumbs.length - 1]);
    }
  };

  /**
   * 8. DialN overlay at 200 weight
   */
  const dialN = async () => {
    setDialNOverlay(false);
    try {
      // e.g. search for match_score >= 200
      const { data, error } = await supabase
        .from("places")
        .select("*")
        .gte("match_score", 200)
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) {
        const rareMatch = data.map(item => ({
          name: item.name || "Unnamed Place",
          type: "place"
        }));
        setCards(rareMatch);
        setCurrentIndex(0);
        setCurrentLayer(LAYER_PLACES);

        // push to history
        setLayerHistory(prev => [
          ...prev,
          { layer: LAYER_PLACES, cards: rareMatch, index: 0, previousSelection: "rare_match" }
        ]);
      } else {
        // fallback to tier3 if no rare match
        if (breadcrumbs.length) {
          await fetchLayerCards(LAYER_TIER3, breadcrumbs[breadcrumbs.length - 1]);
        }
      }
    } catch (err) {
      console.error("DialN error:", err);
      // fallback
      if (breadcrumbs.length) {
        await fetchLayerCards(LAYER_TIER3, breadcrumbs[breadcrumbs.length - 1]);
      }
    }
  };

  /**
   * 9. Update weight in DB
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
      {/* Top Row: Go Back + Weight */}
      <div className="top-row">
        <button className="btn back-btn" onClick={goBackOneLayer}>
          ← Go Back
        </button>
        <div className="weight-indicator">Weight: {userWeight}</div>
      </div>

      {/* Breadcrumbs */}
      <div className="breadcrumb">
        {breadcrumbs.length > 0 ? breadcrumbs.join(" → ") : "Select a Persona"}
      </div>

      {/* Booster Overlay (220) */}
      {boosterPack && (
        <div className="overlay">
          <div className="booster-screen">
            <h2>Booster Pack Unlocked!</h2>
            <p>You’ve reached 220 weight. Next action?</p>
            <button className="btn booster-btn" onClick={openBoosterPack}>
              Open Booster
            </button>
            <button className="btn skip-btn" onClick={() => setBoosterPack(false)}>
              Skip
            </button>
          </div>
        </div>
      )}

      {/* DialN Overlay (200) */}
      {dialNOverlay && (
        <div className="overlay">
          <div className="booster-screen">
            <h2>DialN Unlocked!</h2>
            <p>You’ve reached 200 weight—try for a Rare Match?</p>
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
      {error && !boosterPack && !dialNOverlay && !showMatch && (
        <div className="overlay">
          <div className="error-screen">
            <h2>{error}</h2>
            <button className="btn retry-btn" onClick={initializeUser}>
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading Screen */}
      {loading && !error && !boosterPack && !dialNOverlay && !showMatch && (
        <div className="info-screen">
          <p>Loading cards...</p>
        </div>
      )}

      {/* Main Card UI */}
      {!loading && !error && !boosterPack && !dialNOverlay && !showMatch && (
        <div className="card-area">
          {cards.length > 0 ? (
            <>
              <div className="swipe-card">
                <h2>{cards[currentIndex]?.name || "Unnamed"}</h2>
              </div>
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
              <button className="btn reshuffle-btn" onClick={initializeUser}>
                🔄 Reshuffle
              </button>
            </div>
          )}
        </div>
      )}

      {/* Minimal inline style, you can rely on global CSS */}
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
          padding: 10px;
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
          margin-top: 15px;
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
          margin-top: 20px;
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
