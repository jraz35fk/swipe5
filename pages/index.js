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

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      {isLoading && <p>Loading...</p>}
      {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}

      <h1>DialN</h1>
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
    </div>
  );
}
