import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Home() {
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // For storing which taxonomy (or place) layers we've visited:
  // Each “history” entry now stores the *cards array* and related states, not just index/layer/mode.
  const [history, setHistory] = useState([]);

  const [layer, setLayer] = useState(1);
  const [mode, setMode] = useState("taxonomy"); // "taxonomy" or "places"
  const [selectedPath, setSelectedPath] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch the top-level categories initially
  useEffect(() => {
    fetchTopLevelCategories();
  }, []);

  /** ==========================
   *  Fetch Top-Level Categories
   *  ========================== */
  const fetchTopLevelCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("taxonomy")
      .select("*")
      .is("parent_id", null)
      .order("id", { ascending: true });

    if (error) {
      console.error("Error fetching top-level categories:", error);
    } else {
      setCards(data);
      setCurrentIndex(0);
      setLayer(1);
      setMode("taxonomy");
    }
    setLoading(false);
  };

  /** ==========================
   *  Fetch Subcategories or Places
   *  ========================== */
  const fetchNextLayer = async (parentId, newLayer) => {
    setLoading(true);

    const { data: subcategories, error } = await supabase
      .from("taxonomy")
      .select("*")
      .eq("parent_id", parentId)
      .order("id", { ascending: true });

    if (error) {
      console.error("Error fetching subcategories:", error);
      setLoading(false);
      return;
    }

    if (subcategories.length > 0) {
      // If there are subcategories, use them as the new card set
      pushToHistory(); // store current state in history before we change
      setCards(subcategories);
      setCurrentIndex(0);
      setLayer(newLayer);
      setMode("taxonomy");
      setLoading(false);
    } else {
      // No subcategories? Then load places
      setLoading(false);
      fetchPlaces(parentId);
    }
  };

  /** ==========================
   *  Fetch Places (Final Layer)
   *  ========================== */
  const fetchPlaces = async (taxonomyId) => {
    setLoading(true);

    const { data: places, error } = await supabase
      .from("place_taxonomy")
      .select("place_id, places:places(*)")
      .eq("taxonomy_id", taxonomyId);

    if (error) {
      console.error("Error fetching places:", error);
      setLoading(false);
      return;
    }

    if (places.length > 0) {
      pushToHistory();
      setCards(places.map((p) => p.places));
      setCurrentIndex(0);
      setLayer((prev) => prev + 1);
      setMode("places");
    } else {
      console.log("No places found for this category.");
      // If no places, revert
      goBack();
    }
    setLoading(false);
  };

  /** ==========================
   *  Handle Yes Selection
   *  ========================== */
  const handleYes = async () => {
    if (!cards.length) return;

    const selectedItem = cards[currentIndex];

    // If we’re still in taxonomy mode, go deeper. Otherwise, we’re in “places” mode
    // and 'Yes' just means we found a match (or do something else).
    if (mode === "taxonomy") {
      // Add name to the "path" for reference
      setSelectedPath((prev) => [...prev, selectedItem.name]);
      // Go fetch the next layer (subcategories or places)
      await fetchNextLayer(selectedItem.id, layer + 1);
    } else {
      // We’re in final "places" layer:
      console.log("Matched Place:", selectedItem);
      // If you want to move to the next place card, uncomment:
      // goToNextCard();
    }
  };

  /** ==========================
   *  Handle No Selection
   *  (Skip current card in the same layer)
   *  ========================== */
  const handleNo = () => {
    goToNextCard();
  };

  /** ==========================
   *  Go to Next Card
   *  ========================== */
  const goToNextCard = () => {
    if (cards.length === 0) return;
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // If we exhaust the cards in taxonomy mode, we can just go back or do something else
      if (mode === "taxonomy") {
        goBack();
      } else {
        // If we’re in places mode and exhausted them,
        // you could do something else or reset to top-level, etc.
        setMode("taxonomy");
        goBack();
      }
    }
  };

  /** ==========================
   *  Push Current State to History
   *  (So we can restore it later)
   *  ========================== */
  const pushToHistory = () => {
    setHistory((prevHistory) => [
      ...prevHistory,
      {
        cards,
        currentIndex,
        layer,
        mode,
      },
    ]);
  };

  /** ==========================
   *  Go Back One Step
   *  ========================== */
  const goBack = () => {
    // If history is empty, we’re at top level:
    if (!history.length) {
      fetchTopLevelCategories();
      return;
    }

    // Restore the most recent historical state
    const lastState = history[history.length - 1];
    setCards(lastState.cards);
    setCurrentIndex(lastState.currentIndex);
    setLayer(lastState.layer);
    setMode(lastState.mode);

    // Remove the restored state from history
    setHistory((prevHistory) => prevHistory.slice(0, -1));
  };

  /** ==========================
   *  Reshuffle Cards (Current Layer)
   *  ========================== */
  const reshuffle = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    // you could also clear history if it doesn’t make sense to keep it after reshuffle
    setHistory([]);
  };

  /** ==========================
   *  Handle Search
   *  ========================== */
  const handleSearch = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("taxonomy")
      .select("*")
      .ilike("name", `%${searchQuery}%`);

    if (error) {
      console.error("Error searching:", error);
    } else {
      // We assume a search result is always going to be "taxonomy" (rather than "places")
      setCards(data);
      setCurrentIndex(0);
      setLayer(1);
      setMode("taxonomy");
      setHistory([]); // Clear out history to avoid confusion after a fresh search
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="p-2 border rounded mr-2"
        />
        <button
          onClick={handleSearch}
          className="bg-gray-700 text-white px-4 py-2 rounded"
        >
          Search
        </button>
      </div>

      {loading ? (
        <p className="text-gray-600">Loading...</p>
      ) : cards.length > 0 && currentIndex < cards.length ? (
        <div className="bg-white p-6 rounded-lg shadow-lg text-center w-96">
          <h2 className="text-xl font-bold mb-2">{cards[currentIndex].name}</h2>
          <p className="text-gray-600 mb-4">{cards[currentIndex].description}</p>

          {/* Show map if in places mode */}
          {mode === "places" && (
            <iframe
              width="100%"
              height="200"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY}&q=${cards[currentIndex].latitude},${cards[currentIndex].longitude}`}
            />
          )}

          <div className="flex justify-between mt-4">
            <button onClick={handleNo} className="bg-red-500 text-white px-4 py-2 rounded">
              No
            </button>
            <button onClick={goBack} className="bg-gray-500 text-white px-4 py-2 rounded">
              Go Back
            </button>
            <button onClick={handleYes} className="bg-green-500 text-white px-4 py-2 rounded">
              Yes
            </button>
          </div>
        </div>
      ) : (
        <p className="text-gray-600">No more cards available.</p>
      )}

      <button onClick={reshuffle} className="mt-4 bg-blue-500 text-white px-4 py-2 rounded">
        Reshuffle
      </button>
    </div>
  );
}
