import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Adjust these environment variables to match your project
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Layer definitions
const LAYER_PERSONA = "persona";
const LAYER_TIER1 = "tier1";
const LAYER_TIER2 = "tier2";
const LAYER_PLACES = "places";

// Example threshold: once user finishes a layer, we might check if we’re
// “confident” enough to jump to places. This code shows the direct flow
// persona → tier1 → tier2 → places, but you can skip or dialN early.
const CONFIDENCE_THRESHOLD = 0.9;

export default function Home() {
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentLayer, setCurrentLayer] = useState(LAYER_PERSONA);

  // For UI
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Simple in-memory preferences object, e.g.:
   * {
   *   "adventure": { likes: 3, skips: 1 },
   *   "foodie":    { likes: 5, skips: 0 },
   * }
   */
  const [preferences, setPreferences] = useState({});

  useEffect(() => {
    // Always start with persona
    fetchCards(LAYER_PERSONA);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1) Universal fetch from Supabase
  // ─────────────────────────────────────────────────────────────────────────────
  const fetchCards = async (layer, parentSelection = null) => {
    setLoading(true);
    setError(null);

    try {
      let query;

      if (layer === LAYER_PERSONA) {
        // e.g., fetch from a "personas" table
        query = supabase.from("personas").select("*");
      } 
      else if (layer === LAYER_TIER1 && parentSelection) {
        // e.g., fetch from "tag_mappings" for tier=1
        query = supabase
          .from("tag_mappings")
          .select("*")
          .eq("parent_tag", parentSelection)
          .eq("tier", 1);
      } 
      else if (layer === LAYER_TIER2 && parentSelection) {
        // e.g., fetch from "tag_mappings" for tier=2
        query = supabase
          .from("tag_mappings")
          .select("*")
          .eq("parent_tag", parentSelection)
          .eq("tier", 2);
      } 
      else if (layer === LAYER_PLACES && parentSelection) {
        // e.g., fetch from "places" that contain the selected tag
        query = supabase
          .from("places")
          .select("*")
          .contains("tags", [parentSelection]);
      } 
      else if (layer === LAYER_PLACES && !parentSelection) {
        // If we have no parent, fetch all places
        query = supabase.from("places").select("*");
      } 
      else {
        // If none match, no fetch
        setLoading(false);
        return;
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) {
        setCards([]);
        setCurrentIndex(0);
        setError(`No cards found for ${layer}.`);
        setLoading(false);
        return;
      }

      // Convert DB rows into array of { id, name, tags, ... }
      const formatted = data.map(item => ({
        id: item.id || null,
        name: item.name || item.child_tag || "Unnamed",
        tags: item.tags || [], // or item.child_tag if needed
      }));

      // Sort by preference-based matching
      const sorted = scoreAndSortCards(formatted);
      setCards(sorted);
      setCurrentIndex(0);
      setCurrentLayer(layer);

      // Add to breadcrumbs if we want to show user path
      if (layer === LAYER_PERSONA) {
        setBreadcrumbs(["Persona"]);
      }

    } catch (err) {
      console.error("fetchCards error:", err);
      setError(`Failed to load ${layer}.`);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 2) Scoring & Sorting
  // ─────────────────────────────────────────────────────────────────────────────
  const scoreAndSortCards = (cards) => {
    // For each card, sum up the ratio for tags. Then sort descending.
    return cards
      .map(card => {
        // Calculate matchScore by averaging ratio from each tag
        let totalScore = 0;
        let tagCount = 0;

        if (Array.isArray(card.tags)) {
          for (let t of card.tags) {
            const pref = preferences[t];
            if (pref) {
              const ratio = pref.likes / Math.max(1, pref.likes + pref.skips);
              totalScore += ratio;
              tagCount += 1;
            }
          }
        }
        const finalScore = tagCount > 0 ? totalScore / tagCount : 0;
        return { ...card, matchScore: finalScore };
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 3) User Actions: skip, like, dialN
  // ─────────────────────────────────────────────────────────────────────────────
  const handleSwipe = (action) => {
    if (!cards.length) return;
    const currentCard = cards[currentIndex];
    if (!currentCard) return;

    if (action === "skip") {
      recordPreference(currentCard, false);
      handleNextCardOrLayer();
    } else if (action === "like") {
      recordPreference(currentCard, true);
      handleNextCardOrLayer();
    } else if (action === "dialN") {
      // "DialN" means we immediately drill down to the next layer for this card
      recordPreference(currentCard, true);
      drillDownOneLayer(currentCard);
    }
  };

  // Moves to next card in current layer or triggers next layer if out of cards
  const handleNextCardOrLayer = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < cards.length) {
      setCurrentIndex(nextIndex);
    } else {
      // If we finished this layer’s cards, decide what to do next
      decideNextStep();
    }
  };

  // "DialN" = user specifically wants to dive deeper with this card
  const drillDownOneLayer = (card) => {
    if (currentLayer === LAYER_PERSONA) {
      // Move to Tier1 for this card
      fetchCards(LAYER_TIER1, card.name);
      setBreadcrumbs(["Persona", card.name, "Tier1"]);
    } else if (currentLayer === LAYER_TIER1) {
      // Move to Tier2
      fetchCards(LAYER_TIER2, card.name);
      setBreadcrumbs(["Persona", "Tier1", card.name, "Tier2"]);
    } else if (currentLayer === LAYER_TIER2) {
      // Finally places
      fetchCards(LAYER_PLACES, card.name);
      setBreadcrumbs(["Persona", "Tier1", "Tier2", card.name, "Places"]);
    } else if (currentLayer === LAYER_PLACES) {
      // Already at final layer, no deeper to go
      console.log("No deeper layer. Already at places.");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 4) Preferences
  // ─────────────────────────────────────────────────────────────────────────────
  const recordPreference = (card, liked) => {
    if (!card.tags) return;
    const updated = { ...preferences };

    card.tags.forEach(tag => {
      if (!updated[tag]) {
        updated[tag] = { likes: 0, skips: 0 };
      }
      if (liked) {
        updated[tag].likes++;
      } else {
        updated[tag].skips++;
      }
    });
    setPreferences(updated);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 5) After finishing the layer, decide if we do the next layer or jump to places
  // ─────────────────────────────────────────────────────────────────────────────
  const decideNextStep = () => {
    // Quick confidence check. If the user’s average ratio is >= 0.9,
    // maybe jump straight to places. Otherwise, do normal next layer flow.
    if (isConfidentEnough()) {
      fetchCards(LAYER_PLACES);
      setBreadcrumbs([...breadcrumbs, "Places"]);
      return;
    }

    // If user just finished persona => go Tier1
    if (currentLayer === LAYER_PERSONA) {
      fetchCards(LAYER_TIER1, bestTagSoFar());
      setBreadcrumbs(["Persona", bestTagSoFar(), "Tier1"]);
    }
    // If user just finished Tier1 => go Tier2
    else if (currentLayer === LAYER_TIER1) {
      fetchCards(LAYER_TIER2, bestTagSoFar());
      setBreadcrumbs(["Persona", "Tier1", bestTagSoFar(), "Tier2"]);
    }
    // If user just finished Tier2 => go Places
    else if (currentLayer === LAYER_TIER2) {
      fetchCards(LAYER_PLACES, bestTagSoFar());
      setBreadcrumbs(["Persona", "Tier1", "Tier2", bestTagSoFar(), "Places"]);
    } else {
      console.log("Already at places or unknown layer. No deeper flow.");
    }
  };

  // Calculate average ratio from all user tags to see if we exceed the threshold
  const isConfidentEnough = () => {
    const allRatios = Object.values(preferences).map(pref => {
      const total = pref.likes + pref.skips;
      if (total === 0) return 0;
      return pref.likes / total;
    });
    const avg = allRatios.reduce((sum, r) => sum + r, 0) / Math.max(1, allRatios.length);
    return avg >= CONFIDENCE_THRESHOLD;
  };

  // A quick helper to find the user’s best tag so far
  const bestTagSoFar = () => {
    let bestTag = null;
    let bestScore = 0;

    for (let [tag, pref] of Object.entries(preferences)) {
      const total = pref.likes + pref.skips;
      if (total > 0) {
        const ratio = pref.likes / total;
        if (ratio > bestScore) {
          bestScore = ratio;
          bestTag = tag;
        }
      }
    }
    return bestTag;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 6) Render UI
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: "420px", margin: "0 auto", padding: "10px" }}>
      <h2>Multi-Layer Tinder (No Weight System)</h2>
      <div style={{ margin: "10px 0", fontWeight: "bold" }}>
        {breadcrumbs.join(" → ") || "Current: Persona Layer"}
      </div>

      {error && (
        <div style={{ marginBottom: "20px", color: "red" }}>
          <p>{error}</p>
          <button onClick={() => fetchCards(currentLayer)}>Retry</button>
        </div>
      )}

      {loading && !error && <p>Loading...</p>}

      {!loading && !error && cards.length > 0 && currentIndex < cards.length && (
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              padding: "20px",
              background: "#fff",
              borderRadius: "8px",
              marginBottom: "15px",
              boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
            }}
          >
            <h3>{cards[currentIndex].name}</h3>
            {cards[currentIndex].tags?.length > 0 && (
              <small>Tags: {cards[currentIndex].tags.join(", ")}</small>
            )}
          </div>

          <div>
            <button
              style={{ marginRight: "10px", background: "#ccc" }}
              onClick={() => handleSwipe("skip")}
            >
              Skip
            </button>
            <button
              style={{ marginRight: "10px", background: "#4caf50", color: "#fff" }}
              onClick={() => handleSwipe("like")}
            >
              Like
            </button>
            <button
              style={{ background: "#2196f3", color: "#fff" }}
              onClick={() => handleSwipe("dialN")}
            >
              DialN
            </button>
          </div>
        </div>
      )}

      {/* If done loading, no error, but no cards => no data */}
      {!loading && !error && cards.length === 0 && (
        <p>No cards found for this layer. Try a different approach or check your DB.</p>
      )}
    </div>
  );
}
