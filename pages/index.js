import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Create a Supabase client (adjust env variables as needed)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  // ===============================
  // 1) STATE
  // ===============================

  // For the current array of taxonomy nodes we’re displaying
  const [taxonomyNodes, setTaxonomyNodes] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // For deeper navigation: we store a stack of chosen nodes
  const [nodeStack, setNodeStack] = useState([]); // each entry = { node, childNodes, index? }

  // For places
  const [places, setPlaces] = useState([]);
  const [placeIndex, setPlaceIndex] = useState(0);
  const [mode, setMode] = useState("taxonomy"); // "taxonomy" or "places"

  // Matches & deck
  const [matches, setMatches] = useState([]);
  const [matchDeckOpen, setMatchDeckOpen] = useState(false);
  const [newMatchesCount, setNewMatchesCount] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Search
  const [searchTerm, setSearchTerm] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);

  // Google Maps Embed API key
  const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY || "";

  // ===============================
  // 2) LOAD TOP-LEVEL TAXONOMY ON MOUNT
  // ===============================
  useEffect(() => {
    loadTopLevelTaxonomy();
  }, []);

  async function loadTopLevelTaxonomy() {
    try {
      // fetch all top-level (parent_id is null, is_active=true)
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
      setNodeStack([]); // reset stack
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  // ===============================
  // 3) SEARCH LOGIC
  //    We'll search taxonomy by name for quick suggestions
  // ===============================
  useEffect(() => {
    if (!searchTerm) {
      setSearchSuggestions([]);
      return;
    }
    const lower = searchTerm.toLowerCase();
    // We'll do a client-side filter if we already loaded top-level, 
    // but we might want to do a supabase query to taxonomy.

    // Example: do a supabase query for matching taxonomy nodes
    fetchSearchSuggestions(lower);
  }, [searchTerm]);

  async function fetchSearchSuggestions(searchStr) {
    try {
      let { data, error } = await supabase
        .from("taxonomy")
        .select("*")
        .ilike("name", `%${searchStr}%`)
        .eq("is_active", true)
        .limit(10);

      if (error) throw error;
      setSearchSuggestions(data || []);
      setShowSearchSuggestions(true);
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  function pickSearchSuggestion(sug) {
    setSearchTerm(sug.name);
    setShowSearchSuggestions(false);

    // "Navigate" to that node in taxonomy
    jumpToTaxonomyNode(sug.id);
  }

  async function jumpToTaxonomyNode(nodeId) {
    try {
      // We'll fetch siblings => find the sibling array 
      // In a real approach, you might want to find the parent's children array
      // For simplicity, let's just fetch that node's parent, then fetch parent's children
      let { data: nodeData, error: nodeErr } = await supabase
        .from("taxonomy")
        .select("*")
        .eq("id", nodeId)
        .maybeSingle();
      if (nodeErr) throw nodeErr;
      if (!nodeData) {
        alert("Node not found!");
        return;
      }
      const parentId = nodeData.parent_id;

      if (!parentId) {
        // It's top-level, let's reload top-level to find it
        let { data: topData, error: topErr } = await supabase
          .from("taxonomy")
          .select("*")
          .eq("is_active", true)
          .is("parent_id", null)
          .order("weight", { ascending: false });
        if (topErr) throw topErr;
        setTaxonomyNodes(topData || []);
        const idx = (topData || []).findIndex((x) => x.id === nodeId);
        setCurrentIndex(idx >= 0 ? idx : 0);
        setMode("taxonomy");
        setPlaces([]);
        setPlaceIndex(0);
        setNodeStack([]);
      } else {
        // fetch parent's children
        let { data: siblings, error: sibErr } = await supabase
          .from("taxonomy")
          .select("*")
          .eq("parent_id", parentId)
          .eq("is_active", true)
          .order("weight", { ascending: false });
        if (sibErr) throw sibErr;

        setTaxonomyNodes(siblings || []);
        const idx = (siblings || []).findIndex((x) => x.id === nodeId);
        setCurrentIndex(idx >= 0 ? idx : 0);

        // We might want to keep a stack for parent's parent's parent's etc. 
        // For now, let's just do a partial approach
        setMode("taxonomy");
        setPlaces([]);
        setPlaceIndex(0);
      }
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  // ===============================
  // 4) "Yes" / "No" Logic for Taxonomy
  // ===============================
  const currentNode = (mode === "taxonomy" && taxonomyNodes[currentIndex]) || null;
  async function handleYesTaxonomy() {
    if (!currentNode) return;
    // push to stack
    const newStackEntry = {
      node: currentNode,
      nodeArray: taxonomyNodes,
      arrayIndex: currentIndex
    };
    setNodeStack((prev) => [...prev, newStackEntry]);

    // load children
    try {
      let { data: children, error } = await supabase
        .from("taxonomy")
        .select("*")
        .eq("parent_id", currentNode.id)
        .eq("is_active", true)
        .order("weight", { ascending: false });
      if (error) throw error;

      if (!children || children.length === 0) {
        // no children => load places bridging this node
        loadPlacesByTaxonomyNode(currentNode.id);
      } else {
        // we have children => show them
        setTaxonomyNodes(children);
        setCurrentIndex(0);
        setMode("taxonomy");
        setPlaces([]);
        setPlaceIndex(0);
      }
    } catch (err) {
      setErrorMsg(err.message);
    }
  }
  function handleNoTaxonomy() {
    const next = currentIndex + 1;
    if (next >= taxonomyNodes.length) {
      alert("No more items in this category!");
      // Maybe go back up or reshuffle?
    } else {
      setCurrentIndex(next);
    }
  }

  // ===============================
  // 5) Loading Places for a Node
  // ===============================
  async function loadPlacesByTaxonomyNode(taxId) {
    try {
      let { data, error } = await supabase
        .from("place_taxonomy")
        .select("place_id, places(*)")
        .eq("taxonomy_id", taxId);
      if (error) throw error;
      let placeItems = (data || []).map((row) => row.places);
      // sort by weight or name if you want
      placeItems.sort((a, b) => (b.weight || 0) - (a.weight || 0));
      if (placeItems.length === 0) {
        alert("No places found for that node!");
        // maybe go back automatically
      }
      setPlaces(placeItems);
      setPlaceIndex(0);
      setMode("places");
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  // ===============================
  // 6) "Yes" / "No" for PLACES
  // ===============================
  const currentPlace = (mode === "places" && places[placeIndex]) || null;
  function handleYesPlace() {
    if (!currentPlace) return;
    // match
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 2000);

    setMatches((prev) => [...prev, currentPlace]);
    if (!matchDeckOpen) {
      setNewMatchesCount((n) => n + 1);
    }
    // next place
    const next = placeIndex + 1;
    if (next >= places.length) {
      // go back up
      handleMoveUp();
    } else {
      setPlaceIndex(next);
    }
  }
  function handleNoPlace() {
    const next = placeIndex + 1;
    if (next >= places.length) {
      // go back up
      handleMoveUp();
    } else {
      setPlaceIndex(next);
    }
  }

  function handleNo() {
    if (mode === "places") {
      handleNoPlace();
    } else {
      handleNoTaxonomy();
    }
  }
  function handleYes() {
    if (mode === "places") {
      handleYesPlace();
    } else {
      handleYesTaxonomy();
    }
  }

  // ===============================
  // 7) NAVIGATION & RENDER
  // ===============================
  function handleGoBack() {
    // pop from stack
    if (mode === "places") {
      // move back to taxonomy
      setMode("taxonomy");
      setPlaces([]);
      setPlaceIndex(0);
    } else {
      // pop node stack
      if (nodeStack.length === 0) {
        alert("Already at top-level!");
        return;
      }
      const newStack = [...nodeStack];
      const popped = newStack.pop();
      setNodeStack(newStack);
      setTaxonomyNodes(popped.nodeArray);
      setCurrentIndex(popped.arrayIndex);
      setMode("taxonomy");
      setPlaces([]);
      setPlaceIndex(0);
    }
  }
  function handleReshuffle() {
    // reset everything
    loadTopLevelTaxonomy();
    setMatches([]);
    setNewMatchesCount(0);
  }
  function handleMoveUp() {
    // finishing a place set => go back
    setMode("taxonomy");
    setPlaces([]);
    setPlaceIndex(0);
  }

  // build the current card data
  let currentCard = null;
  if (mode === "taxonomy") {
    const node = currentNode;
    if (node) {
      currentCard = {
        name: node.name,
        image_url: node.image_url || "",
        description: node.description || ""
      };
    }
  } else if (mode === "places") {
    if (currentPlace) {
      currentCard = {
        name: currentPlace.name,
        image_url: currentPlace.image_url || "",
        neighborhood: currentPlace.neighborhood || "",
        description: currentPlace.description || "",
        latitude: currentPlace.latitude || null,
        longitude: currentPlace.longitude || null
      };
    }
  }

  if (!currentCard) {
    return (
      <div style={styles.container}>
        <h1>DialN</h1>
        <p>No more {mode === "places" ? "places" : "items"} to show!</p>
        <button onClick={handleReshuffle} style={styles.reshuffleButton}>
          Reshuffle
        </button>
      </div>
    );
  }

  const bgImage = currentCard.image_url?.trim()
    ? currentCard.image_url
    : "/images/default-bg.jpg";

  // google map logic
  let googleEmbedUrl = null;
  if (
    mode === "places" &&
    googleMapsKey &&
    currentCard.latitude &&
    currentCard.longitude
  ) {
    const lat = currentCard.latitude;
    const lng = currentCard.longitude;
    googleEmbedUrl = `https://www.google.com/maps/embed/v1/search?key=${googleMapsKey}&zoom=14&q=${lat},${lng}`;
  }

  // direct google place url
  let googlePlaceUrl = null;
  if (
    mode === "places" &&
    currentCard.latitude &&
    currentCard.longitude
  ) {
    googlePlaceUrl = `https://www.google.com/maps/search/?api=1&query=${currentCard.latitude},${currentCard.longitude}`;
  }

  return (
    <div style={{ ...styles.container, backgroundImage: `url(${bgImage})` }}>
      <div style={styles.overlay}>
        {/* Top row => matched deck + search */}
        <div style={styles.topRow}>
          <div style={styles.topLeftEmpty}></div>

          <MatchedDeckButton
            matches={matches}
            newMatchesCount={newMatchesCount}
            matchDeckOpen={matchDeckOpen}
            setMatchDeckOpen={setMatchDeckOpen}
            setNewMatchesCount={setNewMatchesCount}
          />

          <div style={styles.topRightArea}>
            <div style={styles.usaBaltimoreText}>USA → Baltimore</div>
            <SubcategorySearchBar
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              suggestions={searchSuggestions}
              showSuggestions={showSearchSuggestions}
              setShowSearchSuggestions={setShowSearchSuggestions}
              onPick={pickSearchSuggestion}
            />
          </div>
        </div>

        {/* center content => if we are in places mode, show google map */}
        <div style={styles.centerContent}>
          {mode === "places" && googleEmbedUrl && (
            <div style={styles.mapWrapper}>
              <iframe
                width="600"
                height="400"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                src={googleEmbedUrl}
              />
            </div>
          )}
        </div>

        {/* bottom text => card name, yes/no, desc, etc. */}
        <div style={styles.bottomTextRow}>
          {mode === "places" && currentCard.neighborhood && (
            <p style={styles.neighborhoodText}>{currentCard.neighborhood}</p>
          )}
          {mode === "places" && googlePlaceUrl ? (
            <h1 style={styles.cardTitle}>
              <a
                href={googlePlaceUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.placeLink}
              >
                {currentCard.name}
              </a>
            </h1>
          ) : (
            <h1 style={styles.cardTitle}>{currentCard.name}</h1>
          )}

          <div style={styles.yesNoRow}>
            <button style={styles.noButton} onClick={handleNo}>
              No
            </button>
            <button style={styles.yesButton} onClick={handleYes}>
              Yes
            </button>
          </div>

          {currentCard.description && (
            <p style={styles.descriptionText}>{currentCard.description}</p>
          )}
        </div>

        <button style={styles.goBackButton} onClick={handleGoBack}>
          Go Back
        </button>
        <button style={styles.reshuffleButton} onClick={handleReshuffle}>
          Reshuffle
        </button>

        {/* match deck overlay */}
        {matchDeckOpen && (
          <MatchDeckOverlay
            matches={matches}
            onClose={() => {
              setMatchDeckOpen(false);
              setNewMatchesCount(0);
            }}
          />
        )}
      </div>

      {showCelebration && <CelebrationAnimation />}
      {errorMsg && (
        <p style={{ color: "red", position: "absolute", top: 10, left: 10 }}>
          {errorMsg}
        </p>
      )}
    </div>
  );
}

/* ===============================
   SUBCOMPONENTS
   =============================== */

function SubcategorySearchBar({
  searchTerm,
  setSearchTerm,
  suggestions,
  showSuggestions,
  setShowSearchSuggestions,
  onPick
}) {
  function handleFocus() {
    if (searchTerm) setShowSearchSuggestions(true);
  }
  function handleBlur() {
    setTimeout(() => {
      setShowSearchSuggestions(false);
    }, 200);
  }
  return (
    <div style={styles.searchBarContainer}>
      <input
        style={styles.searchInput}
        type="text"
        placeholder="Type e.g. 'food' or 'Federal Hill'..."
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setShowSearchSuggestions(true);
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div style={styles.suggestionList}>
          {suggestions.map((sug, i) => (
            <div
              key={i}
              style={styles.suggestionItem}
              onClick={() => onPick(sug)}
            >
              {sug.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MatchedDeckButton({
  matches,
  newMatchesCount,
  matchDeckOpen,
  setMatchDeckOpen,
  setNewMatchesCount
}) {
  return (
    <div style={styles.matchDeckBtnContainer}>
      <button
        style={styles.matchDeckButton}
        onClick={() => {
          setMatchDeckOpen(true);
          setNewMatchesCount(0);
        }}
      >
        Matches {newMatchesCount > 0 && `(+${newMatchesCount})`}
      </button>
    </div>
  );
}

function MatchDeckOverlay({ matches, onClose }) {
  return (
    <div style={styles.matchDeckOverlay}>
      <div style={styles.matchDeckBox}>
        <h2>Match Deck</h2>
        <button onClick={onClose} style={styles.closeDeckButton}>
          Close
        </button>
        {matches.length === 0 ? (
          <p>No matches yet.</p>
        ) : (
          <ul>
            {matches.map((m, i) => (
              <li key={i}>
                <strong>{m.name}</strong>
                {m.neighborhood && ` - ${m.neighborhood}`}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CelebrationAnimation() {
  return (
    <div style={styles.celebrationOverlay}>
      <div style={styles.celebrationBox}>
        <h2 style={{ margin: 0 }}>MATCH!</h2>
        <p>Great choice!</p>
      </div>
    </div>
  );
}

/* ===============================
   STYLES
   =============================== */
const styles = {
  container: {
    width: "100vw",
    height: "100vh",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    position: "relative",
    fontFamily: "sans-serif"
  },
  overlay: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.3)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    position: "relative"
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "10px 20px"
  },
  topLeftEmpty: {
    width: "20%",
    minWidth: "100px"
  },
  topRightArea: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end"
  },
  usaBaltimoreText: {
    color: "#ffd700",
    fontSize: "1.2em",
    textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
    marginBottom: "8px"
  },
  matchDeckBtnContainer: {
    width: "60%",
    textAlign: "center"
  },
  matchDeckButton: {
    backgroundColor: "#ff9800",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "1em"
  },
  searchBarContainer: {
    position: "relative"
  },
  searchInput: {
    width: "220px",
    padding: "6px",
    borderRadius: "4px",
    border: "1px solid #888"
  },
  suggestionList: {
    position: "absolute",
    top: "35px",
    left: 0,
    width: "220px",
    backgroundColor: "#333",
    borderRadius: "4px",
    zIndex: 9999,
    maxHeight: "140px",
    overflowY: "auto"
  },
  suggestionItem: {
    padding: "5px",
    color: "#fff",
    cursor: "pointer",
    borderBottom: "1px solid #555"
  },
  centerContent: {
    flexGrow: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },
  mapWrapper: {
    width: "600px",
    height: "400px",
    border: "2px solid #fff",
    borderRadius: "8px",
    overflow: "hidden"
  },
  bottomTextRow: {
    textAlign: "center",
    marginBottom: "70px"
  },
  neighborhoodText: {
    color: "#FFD700",
    fontSize: "1.3em",
    marginBottom: "5px",
    fontWeight: "bold",
    textShadow: "1px 1px 3px rgba(0,0,0,0.7)"
  },
  placeLink: {
    color: "#fff",
    textDecoration: "underline"
  },
  cardTitle: {
    color: "#fff",
    fontSize: "3em",
    textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
    margin: 0,
    textTransform: "uppercase"
  },
  descriptionText: {
    color: "#fff",
    marginTop: "15px",
    fontSize: "1.1em",
    lineHeight: "1.4"
  },
  yesNoRow: {
    marginTop: "20px",
    display: "flex",
    justifyContent: "center",
    gap: "40px"
  },
  noButton: {
    backgroundColor: "#f44336",
    color: "#fff",
    border: "none",
    padding: "12px 24px",
    borderRadius: "5px",
    fontSize: "1.1em",
    cursor: "pointer"
  },
  yesButton: {
    backgroundColor: "#4CAF50",
    color: "#fff",
    border: "none",
    padding: "12px 24px",
    borderRadius: "5px",
    fontSize: "1.1em",
    cursor: "pointer"
  },
  goBackButton: {
    position: "absolute",
    bottom: "20px",
    left: "20px",
    padding: "8px 16px",
    backgroundColor: "#2196F3",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer"
  },
  reshuffleButton: {
    position: "absolute",
    bottom: "20px",
    right: "20px",
    padding: "8px 16px",
    backgroundColor: "#9C27B0",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer"
  },
  matchDeckOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0,0,0,0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10000
  },
  matchDeckBox: {
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "8px",
    width: "300px",
    maxHeight: "70vh",
    overflowY: "auto",
    position: "relative"
  },
  closeDeckButton: {
    position: "absolute",
    top: "10px",
    right: "10px"
  },
  celebrationOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999
  },
  celebrationBox: {
    backgroundColor: "#fff",
    padding: "30px",
    borderRadius: "10px",
    textAlign: "center"
  }
};
