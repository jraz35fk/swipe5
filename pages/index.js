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
    <div>
      {isLoading && <p>Loading...</p>}
      {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}
      <h1>Original UI Version</h1>
      <p>Rendering cards and previous functionality...</p>
    </div>
  );
}
