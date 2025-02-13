import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Replace with your actual environment variables or Supabase keys
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/**
 * LAYER DEFINITIONS:
 *  - Because "Bars" → "Rooftop Bars" is hierarchical, we might have multiple sub-layers
 *    inside your place_taxonomy or tag_mappings.
 *
 * In this example, you might have:
 *  1) "persona"
 *  2) "bars" (tag)
 *  3) "rooftop bars" (sub-tag)
 *  4) final "places" from the places table
 *
 * Adjust as needed based on your actual structure.
 */
const LAYER_MAIN = "main";       // e.g. "Bars"
const LAYER_SUB = "sub";         // e.g. "Rooftop Bars"
const LAYER_PLACES = "places";   // final actual locations

export default function Home() {
  const [cards, setCards] = useState([]);         // Current layer’s cards
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentLayer, setCurrentLayer] = useState(LAYER_MAIN);

  // Basic UI states
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Simple in-memory preferences object for skip/like:
   * {
   *   'Bars': { likes: 1, skips: 0 },
   *   'Rooftop Bars': { likes: 0, skips: 2 },
   *   ...
   * }
   */
  const [preferences, setPreferences] = useState({});

  // On mount: fetch the first layer (e.g. "Bars," "Food," "Coffee," etc.)
  useEffect(() => {
    fetchMainLayer();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1) FETCH THE MAIN LAYER
  //    e.g., top-level categories from place_taxonomy or tag_mappings.
  // ─────────────────────────────────────────────────────────────────────────────
  const fetchMainLayer = async () => {
    setLoading(true);
    setError(null);
    setCurrentLayer(LAYER_MAIN);
    setBreadcrumbs(["Main Layer"]);

    try {
      /**
       * Example: If you have a table "place_taxonomy" that stores top-level categories:
       *   - bars, clubs, restaurants, etc.
       * Or if you use "tag_mappings" for top-level items that have no parent_tag.
       */
      const { data, error } = await supabase
        .from("place_taxonomy")
        .select("*")
        .is("parent_tag", null); // e.g. top-level tags have no parent

      if (error) throw error;
      if (!data || data.length === 0) {
        setCards([]);
        setCurrentIndex(0);
        setError("No top-level categories found.");
        setLoading(false);
        return;
      }

      const formatted = data.map(item => ({
        id: item.id,
        name: item.tag_name || "Unnamed Category",
        // If you have tags array or sub-data, adapt here
      }));

      setCards(formatted);
      setCurrentIndex(0);
    } catch (err) {
      console.error("Error fetching main layer:", err);
      setError("Failed to load main layer.");
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 2) FETCH SUB-LAYER (CHILD TAGS)
  //    e.g. If user picks "Bars," we fetch "Rooftop Bars," "Sports Bars," etc.
  // ─────────────────────────────────────────────────────────────────────────────
  const fetchSubLayer = async (parentTag) => {
    setLoading(true);
    setError(null);
    setCurrentLayer(LAYER_SUB);

    try {
      // Example: "tag_mappings" or "place_taxonomy" that define child tags
      const { data, error } = await supabase
        .from("place_taxonomy")
        .select("*")
        .eq("parent_tag", parentTag); // find children

      if (error) throw error;
      if (!data || data.length === 0) {
        // No sub-tags => maybe jump directly to places?
        console.warn(`No sub-tags found under ${parentTag}. Going to Places.`);
        await fetchPlaces(parentTag);
        return;
      }

      const formatted = data.map(item => ({
        id: item.id,
        name: item.tag_name || "Unnamed Sub-Category",
      }));

      setCards(formatted);
      setCurrentIndex(0);

      // e.g. update breadcrumbs
      setBreadcrumbs(prev => [...prev, parentTag, "Sub Layer"]);
    } catch (err) {
      console.error("Error fetching sub layer:", err);
      setError("Failed to load sub layer.");
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 3) FETCH PLACES
  //    e.g. final layer from "places" table that has the relevant tag
  // ─────────────────────────────────────────────────────────────────────────────
  const fetchPlaces = async (tagName) => {
    setLoading(true);
    setError(null);
    setCurrentLayer(LAYER_PLACES);

    try {
      // Example: if your "places" table has a "tags" array
      const { data, error } = await supabase
        .from("places")
        .select("*")
        .contains("tags", [tagName]);

      if (error) throw error;
      if (!data || data.length === 0) {
        setCards([]);
        setCurrentIndex(0);
        setError(`No places found for tag: ${tagName}`);
        setLoading(false);
        return;
      }

      const formatted = data.map(item => ({
        id: item.id,
        name: item.name || "Unnamed Place",
        tags: item.tags || [],
      }));

      // Sort by user preference if you like:
      const sorted = scoreAndSort(formatted);
      setCards(sorted);
      setCurrentIndex(0);

      setBreadcrumbs(prev => [...prev, tagName, "Places"]);
    } catch (err) {
      console.error("Error fetching places:", err);
      setError("Failed to load places.");
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 4) SCORING / SORTING
  //    We do a simple preference-based approach (like skip).
  // ─────────────────────────────────────────────────────────────────────────────
  const scoreAndSort = (cards) => {
    // If you want a more advanced approach, expand this
    return cards.sort((a, b) => {
      // e.g. if you want to score by how many times user liked relevant tags
      return 0; // for now, no actual preference sorting unless you store user prefs
    });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 5) HANDLE USER ACTIONS: SKIP, LIKE, DIALN
  // ─────────────────────────────────────────────────────────────────────────────
  const handleSwipe = (action) => {
    if (!cards.length) return;
    const card = cards[currentIndex];
    if (!card) return;

    if (action === "skip") {
      // Skip this card
      recordPreference(card, false);
      moveToNextCard();
    } else if (action === "like") {
      // Like this card
      recordPreference(card, true);
      moveToNextCard();
    } else if (action === "dialN") {
      // “DialN” = jump deeper for this card
      recordPreference(card, true);
      dialDownLayer(card);
    }
  };

  const moveToNextCard = () => {
    const nextIdx = currentIndex + 1;
    if (nextIdx < cards.length) {
      setCurrentIndex(nextIdx);
    } else {
      // If user finished all cards in this layer w/o hitting DialN,
      // you can do something else: show a “results” screen or fallback logic
      // e.g. “No sub-layer chosen. Maybe show them all?”
      console.log(`Finished layer: ${currentLayer}. No “DialN” chosen.`);
    }
  };

  // "DialN" means we explicitly move from the current layer to the next
  const dialDownLayer = (card) => {
    // If on main layer => go to sub layer
    if (currentLayer === LAYER_MAIN) {
      fetchSubLayer(card.name);
    } else if (currentLayer === LAYER_SUB) {
      // Next step is "Places"
      fetchPlaces(card.name);
    } else if (currentLayer === LAYER_PLACES) {
      // Already final => no deeper layer
      console.log("Already at places, can't dial deeper.");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 6) RECORD PREFERENCES
  // ─────────────────────────────────────────────────────────────────────────────
  const recordPreference = (card, liked) => {
    // If your places have multiple tags, you can increment them all
    // Or if your place_taxonomy has a single "tag_name," just track that
    const tag = card.name;
    if (!tag) return;

    const updated = { ...preferences };
    if (!updated[tag]) {
      updated[tag] = { likes: 0, skips: 0 };
    }
    if (liked) {
      updated[tag].likes++;
    } else {
      updated[tag].skips++;
    }
    setPreferences(updated);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 7) RENDER UI
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: 16 }}>
      <h2>Hierarchical Tags – Skip / Like / DialN</h2>

      {/* BREADCRUMBS */}
      <div style={{ fontWeight: "bold", marginBottom: 10 }}>
        {breadcrumbs.join(" → ") || "Top Layer"}
      </div>

      {/* ERROR */}
      {error && (
        <div style={{ color: "red", marginBottom: 20 }}>
          <p>{error}</p>
          <button onClick={fetchMainLayer}>Retry</button>
        </div>
      )}

      {/* LOADING */}
      {loading && !error && <p>Loading...</p>}

      {/* CARDS */}
      {!loading && !error && cards.length > 0 && currentIndex < cards.length && (
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              padding: 20,
              background: "#fff",
              borderRadius: 8,
              boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
              marginBottom: 15,
            }}
          >
            <h3>{cards[currentIndex].name}</h3>
          </div>

          <div>
            <button
              style={{ marginRight: 10, background: "#ccc" }}
              onClick={() => handleSwipe("skip")}
            >
              Skip
            </button>
            <button
              style={{ marginRight: 10, background: "#4caf50", color: "#fff" }}
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

      {/* NO CARDS */}
      {!loading && !error && cards.length === 0 && (
        <p>No cards here. Try reselecting or check your DB structure.</p>
      )}
    </div>
  );
}
