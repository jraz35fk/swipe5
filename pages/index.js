import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import SearchBar from "../components/SearchBar";
import MatchDeck from "../components/MatchDeck";
import MatchDeckOverlay from "../components/MatchDeckOverlay";
import Celebration from "../components/Celebration";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY || "";

  // Load top-level taxonomy
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

  async function loadPlacesByTaxonomyNode(taxId) {
    try {
      let { data, error } = await supabase
        .from("place_taxonomy")
        .select("place_id, places!inner(*)")
        .eq("taxonomy_id", taxId);
      if (error) throw error;
      let placeItems = (data || []).map(row => row.places);
      placeItems.sort((a, b) => (b.weight || 0) - (a.weight || 0));
      setPlaces(placeItems);
      setPlaceIndex(0);
      setMode("places");
    } catch (err) {
      console.error("Error loading places:", err.message);
      setErrorMsg("No places found for this category.");
    }
  }

  function handleYes() {
    if (mode === "places") {
      setMatches([...matches, places[placeIndex]]);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);
      setPlaceIndex((prev) => (prev + 1 < places.length ? prev + 1 : 0));
    } else {
      const selectedNode = taxonomyNodes[currentIndex];
      setNodeStack([...nodeStack, { node: selectedNode, nodeArray: taxonomyNodes, arrayIndex: currentIndex }]);
      fetchChildNodes(selectedNode.id);
    }
  }

  function handleNo() {
    if (mode === "places") {
      setPlaceIndex((prev) => (prev + 1 < places.length ? prev + 1 : 0));
    } else {
      setCurrentIndex((prev) => (prev + 1 < taxonomyNodes.length ? prev + 1 : 0));
    }
  }

  return (
    <div>
      {isLoading && <p>Loading...</p>}
      {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}

      <SearchBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        suggestions={searchSuggestions}
        showSuggestions={showSearchSuggestions}
        setShowSearchSuggestions={setShowSearchSuggestions}
        onPick={(sug) => setSearchTerm(sug.name)}
      />

      <MatchDeck
        matches={matches}
        newMatchesCount={newMatchesCount}
        matchDeckOpen={matchDeckOpen}
        setMatchDeckOpen={setMatchDeckOpen}
        setNewMatchesCount={setNewMatchesCount}
      />

      {matchDeckOpen && <MatchDeckOverlay matches={matches} onClose={() => setMatchDeckOpen(false)} />}
      {showCelebration && <Celebration />}

      <button onClick={handleYes}>Yes</button>
      <button onClick={handleNo}>No</button>
    </div>
  );
}
