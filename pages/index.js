import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
// Update with your actual environment variables or keys
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  // Example: if you have user auth, replace this with the actual user ID
  const userId = 1;

  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [userWeight, setUserWeight] = useState(0);
  const [boosterPack, setBoosterPack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMatch, setShowMatch] = useState(false);

  useEffect(() => {
    // 1️⃣ Always fetch user weight, then persona cards first
    fetchUserWeight();
    fetchCards("persona");
  }, []);

  // Fetch user's weight
  const fetchUserWeight = async () => {
    try {
      const { data, error } = await supabase
        .from("user_progress")
        .select("weight")
        .eq("user_id", userId) // or remove eq(...) if you only have one user
        .single();

      if (error) {
        console.error("Error fetching user weight:", error);
        return;
      }
      if (data && typeof data.weight === "number") {
        setUserWeight(data.weight);
      }
    } catch (err) {
      console.error("Error in fetchUserWeight:", err);
    }
  };

  // Fetch cards from Supabase
  const fetchCards = async (layer, previousSelection = null) => {
    setLoading(true);
    setError(null);

    let query = supabase.from("places").select("*");

    try {
      // 🚀 Ensure we always start with Persona
      if (layer === "persona") {
        // Example persona tags; adjust as needed
        query = query.or(
          "tags.cs.{Food}, tags.cs.{Socialite}, tags.cs.{Adventurer}, tags.cs.{Curator}, tags.cs.{Wonderer}"
        );
      }
      // Move to Tier1 based on persona
      else if (layer === "tier1" && previousSelection) {
        query = query.contains("tags", [previousSelection]);
      }
      // Move to Tier2 based on Tier1
      else if (layer === "tier2" && previousSelection) {
        query = query.contains("tags", [previousSelection]);
      }
      // Finally, show places if user has enough weight
      else if (layer === "places" && previousSelection) {
        if (userWeight >= 200) {
          // Rare match possibility
          query = query.or("tags.cs.{rare_match}");
        } else if (userWeight >= 160) {
          // Normal places
          query = query.contains("tags", [previousSelection]);
        } else {
          setError("Not enough weight to unlock places!");
          setLoading(false);
          return;
        }
      } else if (layer === "untagged") {
        // Fallback if no results, forcibly fetch anything
        query = supabase.from("places").select("*");
      } else {
        // If no valid layer, do nothing
        setLoading(false);
        return;
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error(`No cards found for ${layer}.`);
      }

      setCards(data);
      setCurrentIndex(0);
    } catch (err) {
      console.error(err);
      setError(`Failed to load ${layer} cards. Try reshuffling.`);
    } finally {
      setLoading(false);
    }
  };

  // Handle user swipe (Yes / No)
  const handleSwipe = (accepted) => {
    if (!cards.length) return;
    const selectedCard = cards[currentIndex];

    if (!selectedCard || !selectedCard.tags) {
      setError("Invalid card data. Try reshuffling.");
      return;
    }

    if (accepted) {
      // Determine next layer in the chain
      // Instead of lumpsum logic, we ensure correct chain
      let nextLayer = null;

      if (selectedCard.tags.includes("persona")) {
        nextLayer = "tier1";
      } else if (selectedCard.tags.includes("tier1")) {
        nextLayer = "tier2";
      } else if (selectedCard.tags.includes("tier2")) {
        nextLayer = "places";
      } else if (selectedCard.tags.includes("place")) {
        // If user swiped right on an actual place, show match overlay
        setShowMatch(true);
        return;
      }

      // Update breadcrumbs
      if (selectedCard.tags[0]) {
        setBreadcrumbs((prev) => [...prev, selectedCard.tags[0]]);
      }

      // Update user weight depending on next step
      if (nextLayer === "tier1") {
        setUserWeight((prev) => prev + 100);
        // If crossing 160 threshold, show booster
        if (userWeight + 100 >= 160 && userWeight < 160) {
          setBoosterPack(true);
          return;
        }
      } else if (nextLayer === "tier2") {
        setUserWeight((prev) => prev + 60);
        // If crossing 160 threshold, show booster
        if (userWeight + 60 >= 160 && userWeight < 160) {
          setBoosterPack(true);
          return;
        }
      }

      if (nextLayer) {
        // Fetch next layer of cards
        fetchCards(nextLayer, selectedCard.tags[0]);
      } else {
        // If no recognized layer, fallback
        setError("No recognized layer for this card. Try reshuffling.");
      }
    } else {
      // If user swiped "No"
      const nextIdx = currentIndex + 1;
      if (nextIdx < cards.length) {
        setCurrentIndex(nextIdx);
      } else {
        // If no more cards, fetch "untagged" as fallback
        fetchCards("untagged");
      }
    }
  };

  // Open the booster pack (160 weight)
  const openBoosterPack = () => {
    // Deduct 160 from user weight
    setUserWeight((prev) => prev - 160);
    setBoosterPack(false);
    // Immediately fetch places (since we've unlocked)
    // You might pass last breadcrumb as your selection
    if (breadcrumbs.length > 0) {
      fetchCards("places", breadcrumbs[breadcrumbs.length - 1]);
    } else {
      fetchCards("places", "generic"); // fallback
    }
  };

  // DialN for a Rare Match (200+ match_score)
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
        // Rare match found
        setCards(data);
        setCurrentIndex(0);
      } else {
        // If no rare match, fallback to tier2
        // Or persona or something else, depending on your logic
        fetchCards("tier2");
      }
    } catch (err) {
      console.error("Error with DialN / Rare Match:", err);
      fetchCards("tier2");
    }
  };

  return (
    <div className="app-container">
      {/* Breadcrumbs */}
      <div className="breadcrumb">
        {breadcrumbs.length > 0 ? breadcrumbs.join(" → ") : "Pick a Persona"}
      </div>

      {/* Weight Indicator (top-right corner or wherever you prefer) */}
      <div className="weight-indicator">
        Weight: {userWeight}
      </div>

      {/* Booster Pack Overlay */}
      {boosterPack && (
        <div className="overlay">
          <div className="booster-screen">
            <h2>Booster Pack Unlocked!</h2>
            <p>You reached 160 weight! Select your next move.</p>
            <div className="booster-buttons">
              <button className="btn booster-btn" onClick={openBoosterPack}>
                Open
              </button>
              <button className="btn dialn-btn" onClick={dialN}>
                DialN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && !boosterPack && (
        <div className="overlay">
          <div className="error-screen">
            <h2>{error}</h2>
            <button className="btn retry-btn" onClick={() => fetchCards("persona")}>
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Match Overlay */}
      {showMatch && !error && (
        <div className="overlay">
          <div className="match-screen">
            <h1>Match Found!</h1>
            <button className="close-btn" onClick={() => setShowMatch(false)}>
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      {loading && !error && !boosterPack && (
        <div className="info-screen">
          <p>Loading cards...</p>
        </div>
      )}

      {!loading && !showMatch && !boosterPack && !error && (
        <div className="card-container">
          {cards.length > 0 ? (
            <>
              <div className="swipe-card">
                <h2 className="card-title">
                  {cards[currentIndex]?.name || "Unnamed Card"}
                </h2>
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
              <button className="btn reshuffle-btn" onClick={() => fetchCards("persona")}>
                🔄 Reshuffle
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
