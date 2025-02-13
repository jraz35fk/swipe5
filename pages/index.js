import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ✅ Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const DEFAULT_USER_ID = "static_user";

export default function Home() {
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [userWeight, setUserWeight] = useState(0);
  const [currentLayer, setCurrentLayer] = useState("persona");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    initializeUser();
  }, []);

  /** ✅ Initialize user weight & fetch first set of cards */
  const initializeUser = async () => {
    await fetchUserWeight();
    await fetchCards("persona");
  };

  /** ✅ Fetch or create user weight */
  const fetchUserWeight = async () => {
    try {
      const { data, error } = await supabase
        .from("user_progress")
        .select("weight")
        .eq("user_id", DEFAULT_USER_ID)
        .single();

      if (error || !data) {
        await supabase.from("user_progress").upsert([{ user_id: DEFAULT_USER_ID, weight: 0 }]);
        setUserWeight(0);
      } else {
        setUserWeight(data.weight);
      }
    } catch (err) {
      console.error("Error fetching user weight:", err);
    }
  };

  /** ✅ Fetch cards for a specific layer */
  const fetchCards = async (layer, previousSelection = null) => {
    setLoading(true);
    setError(null);

    let query;
    try {
      if (layer === "persona") {
        query = supabase.from("personas").select("*");
      } else if (layer === "tier1") {
        query = supabase.from("persona_category_mappings").select("tier_1_category").eq("persona", previousSelection);
      } else if (layer === "tier2") {
        query = supabase.from("tag_mappings").select("child_tag").eq("parent_tag", previousSelection).eq("tier", 2);
      } else if (layer === "tier3") {
        query = supabase.from("tag_mappings").select("child_tag").eq("parent_tag", previousSelection).eq("tier", 3);
      } else if (layer === "places") {
        query = supabase.from("places").select("id", "name", "description", "tags", "match_score").contains("tags", [previousSelection]);
      } else {
        setLoading(false);
        return;
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) {
        setLoading(false);
        return;
      }

      setCards(data.map(item => ({
        id: item.id,
        name: item.child_tag || item.name || item.tier_1_category,
        description: item.description || "",
        matchScore: item.match_score || 0
      })));

      setCurrentIndex(0);
      setCurrentLayer(layer);
    } catch (err) {
      setError(`Failed to load ${layer} cards.`);
    } finally {
      setLoading(false);
    }
  };

  /** ✅ Handle swipe interaction */
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
    let addedWeight = 0;

    if (currentLayer === "persona") {
      nextLayer = "tier1";
      addedWeight = 100;
    } else if (currentLayer === "tier1") {
      nextLayer = "tier2";
      addedWeight = 60;
    } else if (currentLayer === "tier2") {
      nextLayer = "tier3";
      addedWeight = 60;
    } else if (currentLayer === "tier3") {
      nextLayer = "places"; // ✅ Places MUST load after Tier 3
    } else {
      return;
    }

    setBreadcrumbs([...breadcrumbs, selectedCard.name]);

    const newWeight = userWeight + addedWeight;
    setUserWeight(newWeight);
    await updateUserWeightInDB(newWeight);

    fetchCards(nextLayer, selectedCard.name);
  };

  /** ✅ Update user weight in Supabase */
  const updateUserWeightInDB = async (newWeight) => {
    await supabase.from("user_progress").update({ weight: newWeight }).eq("user_id", DEFAULT_USER_ID);
  };

  return (
    <div className="app-container">
      {/* ✅ Breadcrumbs */}
      <div className="breadcrumb">
        {breadcrumbs.length > 0 ? breadcrumbs.join(" → ") : "Select a Persona"}
      </div>

      {/* ✅ Error Message */}
      {error && (
        <div className="info-screen">
          <h2>{error}</h2>
          <button className="btn retry-btn" onClick={() => fetchCards("persona")}>
            Retry
          </button>
        </div>
      )}

      {/* ✅ Loading */}
      {loading && !error && (
        <div className="info-screen">
          <p>Loading cards...</p>
        </div>
      )}

      {/* ✅ Card Display */}
      {!loading && !error && (
        <div className="card-area">
          {cards.length > 0 ? (
            <>
              <div className="swipe-card">
                <h2>{cards[currentIndex]?.name || "Unnamed Card"}</h2>
                {currentLayer === "places" && <p>{cards[currentIndex]?.description}</p>}
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
    </div>
  );
}
