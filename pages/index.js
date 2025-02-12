import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Home() {
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState([]);
  const [layer, setLayer] = useState(1);
  const [selectedPath, setSelectedPath] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [mode, setMode] = useState("taxonomy"); // "taxonomy" for categories, "places" for final match layer
  const [loading, setLoading] = useState(false);

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

    if (error) console.error("Error fetching top-level categories:", error);
    else {
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

    let { data: subcategories, error } = await supabase
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
      // Move into subcategories
      setCards(subcategories);
      setCurrentIndex(0);
      setLayer(newLayer);
      setMode("taxonomy");
    } else {
      // No subcategories? Load Places
      fetchPlaces(parentId);
    }
    setLoading(false);
  };

  /** ========================== 
   *  Fetch Places (Final Layer)
   *  ========================== */
  const fetchPlaces = async (taxonomyId) => {
    setLoading(true);

    let { data: places, error } = await supabase
      .from("place_taxonomy")
      .select("place_id, places:places(*)")
      .eq("taxonomy_id", taxonomyId);

    if (error) {
      console.error("Error fetching places:", error);
      setLoading(false);
      return;
    }

    if (places.length > 0) {
      setCards(places.map((p) => p.places));
      setCurrentIndex(0);
      setLayer(layer + 1);
      setMode("places");
    } else {
      console.log("No places found for this category.");
      goBack();
    }
    setLoading(false);
  };

  /** ========================== 
   *  Handle Yes Selection
   *  ========================== */
  const handleYes = () => {
    if (cards.length === 0) return;

    const selectedItem = cards[currentIndex];

    if (mode === "taxonomy") {
      setSelectedPath((prev) => [...prev, selectedItem.name]);

      // Ensure smooth transition before fetching new data
      setTimeout(() => {
        fetchNextLayer(selectedItem.id, layer + 1);
      }, 150);
    } else {
      console.log("Matched Place:", selectedItem);
    }

    goToNextCard();
  };

  /** ========================== 
   *  Handle No Selection (Skip to Next) 
   *  ========================== */
  const handleNo = () => {
    goToNextCard();
  };

  /** ========================== 
   *  Go to Next Card (Within Current Layer) 
   *  ========================== */
  const goToNextCard = () => {
    if (cards.length === 0) return;

    setHistory((prevHistory) => [
      ...prevHistory,
      { index: currentIndex, layer, mode },
    ]);

    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prevIndex) => prevIndex + 1);
    } else {
      if (mode === "taxonomy") {
        goBack();
      } else if (mode === "places") {
        setMode("taxonomy");
      }
    }
  };

  /** ========================== 
   *  Go Back One Layer
   *  ========================== */
  const goBack = () => {
    if (history.length > 0) {
      const lastState = history.pop();
      setHistory([...history]);
      setCurrentIndex(lastState.index);
      setLayer(lastState.layer);
      setMode(lastState.mode);
    } else {
      fetchTopLevelCategories(); // Return to top if no history
    }
  };

  /** ========================== 
   *  Reshuffle Cards in Current Layer 
   *  ========================== */
  const reshuffle = () => {
    setCards([...cards].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
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

    if (error) console.error("Error searching:", error);
    else {
      setCards(data);
      setCurrentIndex(0);
      setLayer(1);
      setMode("taxonomy");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <input
        type="text"
        placeholder="Search categories..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="p-2 border rounded mb-4"
      />
      <button
        onClick={handleSearch}
        className="mb-4 bg-gray-700 text-white px-4 py-2 rounded"
      >
        Search
      </button>

      {loading ? (
        <p className="text-gray-600">Loading...</p>
      ) : cards.length > 0 && currentIndex < cards.length ? (
        <div className="bg-white p-6 rounded-lg shadow-lg text-center w-96">
          <h2 className="text-xl font-bold mb-2">{cards[currentIndex].name}</h2>
          <p className="text-gray-600 mb-4">{cards[currentIndex].description}</p>
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
