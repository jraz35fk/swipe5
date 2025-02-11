import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  // State management
  const [taxonomyNodes, setTaxonomyNodes] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nodeStack, setNodeStack] = useState([]);
  const [places, setPlaces] = useState([]);
  const [placeIndex, setPlaceIndex] = useState(0);
  const [mode, setMode] = useState("taxonomy");
  const [matches, setMatches] = useState([]);
  const [matchDeckOpen, setMatchDeckOpen] = useState(false);
  const [newMatchesCount, setNewMatchesCount] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load top-level taxonomy on mount
  useEffect(() => {
    loadTopLevelTaxonomy();
  }, []);

  async function loadTopLevelTaxonomy() {
    setIsLoading(true);
    try {
      let { data, error } = await supabase
        .from("taxonomy")
        .select("*")
        .eq("is_active", true)
        .is("parent_id", null)
        .order("weight", { ascending: false });
      if (error) throw error;
      setTaxonomyNodes(data || []);
      setCurrentIndex(0);
      setMode("taxonomy");
      setPlaces([]);
      setPlaceIndex(0);
      setNodeStack([]);
    } catch (err) {
      console.error("Error loading taxonomy:", err.message);
      setErrorMsg("Failed to load categories. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleYes() {
    if (mode === "taxonomy") {
      const currentNode = taxonomyNodes[currentIndex];
      if (!currentNode) return;
      setNodeStack([...nodeStack, { node: currentNode, nodeArray: taxonomyNodes, arrayIndex: currentIndex }]);
      await fetchChildNodes(currentNode.id);
    } else {
      const currentPlace = places[placeIndex];
      if (!currentPlace) return;
      setMatches([...matches, currentPlace]);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);
      handleNextPlace();
    }
  }

  async function fetchChildNodes(parentId) {
    try {
      let { data, error } = await supabase
        .from("taxonomy")
        .select("*")
        .eq("parent_id", parentId)
        .eq("is_active", true)
        .order("weight", { ascending: false });
      if (error) throw error;
      if (data.length > 0) {
        setTaxonomyNodes(data);
        setCurrentIndex(0);
      } else {
        await fetchPlacesForNode(parentId);
      }
    } catch (err) {
      console.error("Error fetching child nodes:", err.message);
      setErrorMsg("Failed to load subcategories.");
    }
  }

  async function fetchPlacesForNode(taxonomyId) {
    try {
      let { data, error } = await supabase
        .from("place_taxonomy")
        .select("place_id, places(*)")
        .eq("taxonomy_id", taxonomyId);
      if (error) throw error;
      const placeItems = (data || []).map(row => row.places);
      placeItems.sort((a, b) => (b.weight || 0) - (a.weight || 0));
      setPlaces(placeItems);
      setPlaceIndex(0);
      setMode("places");
    } catch (err) {
      console.error("Error loading places:", err.message);
      setErrorMsg("No places found for this category.");
    }
  }

  function handleNextPlace() {
    if (placeIndex + 1 < places.length) {
      setPlaceIndex(placeIndex + 1);
    } else {
      setMode("taxonomy");
      setPlaces([]);
      setPlaceIndex(0);
    }
  }

  function handleNo() {
    if (mode === "places") {
      handleNextPlace();
    } else {
      if (currentIndex + 1 < taxonomyNodes.length) {
        setCurrentIndex(currentIndex + 1);
      } else {
        alert("No more options available!");
      }
    }
  }

  return (
    <div>
      {isLoading && <p>Loading...</p>}
      {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}
      <h1>Explore Categories</h1>
      {mode === "taxonomy" && taxonomyNodes.length > 0 && (
        <div>
          <h2>{taxonomyNodes[currentIndex].name}</h2>
          <button onClick={handleYes}>Yes</button>
          <button onClick={handleNo}>No</button>
        </div>
      )}
      {mode === "places" && places.length > 0 && (
        <div>
          <h2>{places[placeIndex].name}</h2>
          <button onClick={handleYes}>Yes</button>
          <button onClick={handleNo}>No</button>
        </div>
      )}
    </div>
  );
}
