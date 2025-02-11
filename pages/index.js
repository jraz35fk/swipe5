import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase (adjust env variables as needed)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  // ===============================
  // 1) STATE
  // ===============================

  // Current array of taxonomy nodes we’re displaying
  const [taxonomyNodes, setTaxonomyNodes] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Stack of chosen nodes (for going back)
  const [nodeStack, setNodeStack] = useState([]);

  // Places
  const [places, setPlaces] = useState([]);
  const [placeIndex, setPlaceIndex] = useState(0);

  // Distinguish between showing taxonomy nodes or final places
  const [mode, setMode] = useState("taxonomy"); // "taxonomy" or "places"

  // Matches & deck
  const [matches, setMatches] = useState([]);
  const [matchDeckOpen, setMatchDeckOpen] = useState(false);
  const [newMatchesCount, setNewMatchesCount] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);

  // Error messages
  const [errorMsg, setErrorMsg] = useState(null);

  // Search
  const [searchTerm, setSearchTerm] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);

  // Google Maps
  const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY || "";

  // ===============================
  // 2) LOAD TOP-LEVEL TAXONOMY ON MOUNT
  // ===============================
  useEffect(() => {
    loadTopLevelTaxonomy();
  }, []);

  async function loadTopLevelTaxonomy() {
    try {
      const { data, error } = await supabase
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
      setErrorMsg(err.message);
    }
  }

  // ===============================
  // 3) SEARCH LOGIC: We query 'taxonomy' by name
  // ===============================
  useEffect(() => {
    if (!searchTerm) {
      setSearchSuggestions([]);
      return;
    }
    fetchSearchSuggestions(searchTerm.toLowerCase());
  }, [searchTerm]);

  async function fetchSearchSuggestions(searchStr) {
    try {
      const { data, error } = await supabase
        .from("taxonomy")
        .select("*")
        .ilike("name", `%${searchStr}%`)
        .eq("is_active", true)
        .limit(8);
      if (error) throw error;

      setSearchSuggestions(data || []);
      setShowSearchSuggestions(true);
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  function pickSearchSuggestion(node) {
    setSearchTerm(node.name);
    setShowSearchSuggestions(false);
    jumpToTaxonomyNode(node.id);
  }

  async function jumpToTaxonomyNode(nodeId) {
    try {
      // find that node
      const { data: nodeData, error: nodeErr } = await supabase
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
        // It's top-level => reload top-level
        const { data: topData, error: topErr } = await supabase
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
        // It's a child => fetch siblings
        const { data: siblings, error: sibErr } = await supabase
          .from("taxonomy")
          .select("*")
          .eq("parent_id", parentId)
          .eq("is_active", true)
          .order("weight", { ascending: false });
        if (sibErr) throw sibErr;

        setTaxonomyNodes(siblings || []);
        const idx = (siblings || []).findIndex((x) => x.id === nodeId);
        setCurrentIndex(idx >= 0 ? idx : 0);
        setMode("taxonomy");
        setPlaces([]);
        setPlaceIndex(0);
      }
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  // ===============================
  // 4) "Yes" / "No" Logic for TAXONOMY NODES
  //    + 'skip subcategories <2 places' or 'sub-split if child nodes >6'
  // ===============================
  const currentNode = (mode === "taxonomy" && taxonomyNodes[currentIndex]) || null;

  async function handleYesTaxonomy() {
    if (!currentNode) return;

    // push onto stack so user can go back
    const stackEntry = {
      nodeArray: taxonomyNodes,
      arrayIndex: currentIndex,
      node: currentNode
    };
    setNodeStack((prev) => [...prev, stackEntry]);

    // fetch children
    try {
      const { data: children, error } = await supabase
        .from("taxonomy")
        .select("*")
        .eq("parent_id", currentNode.id)
        .eq("is_active", true)
        .order("weight", { ascending: false });
      if (error) throw error;

      if (!children || children.length === 0) {
        // no children => load final places
        await loadPlacesByNode(currentNode.id);
        return;
      }

      // 4A) if children are more than 6, optionally sub-split
      if (children.length > 6) {
        const proceed = window.confirm(
          `This node has ${children.length} sub-layers. Do you want to refine further? (OK=Yes, Cancel=Skip)`
        );
        if (!proceed) {
          // if user doesn't want to refine, skip directly to places
          await loadPlacesByNode(currentNode.id);
          return;
        }
        // else we continue with normal sub-layer approach
      }

      // 4B) we also do a “child place count” check. If a subcategory has <2 bridging places, we skip or auto-expand
      const filteredChildren = await autoSkipChildNodes(children);

      if (!filteredChildren || filteredChildren.length === 0) {
        // either everything got skipped or no actual child to display => load places of current node
        await loadPlacesByNode(currentNode.id);
      } else {
        // show the filtered children
        setTaxonomyNodes(filteredChildren);
        setCurrentIndex(0);
        setMode("taxonomy");
        setPlaces([]);
        setPlaceIndex(0);
      }
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  // If user says NO, just skip to next item in the same array
  function handleNoTaxonomy() {
    const next = currentIndex + 1;
    if (next >= taxonomyNodes.length) {
      alert("No more items in this category!");
    } else {
      setCurrentIndex(next);
    }
  }

  // A helper to check each child’s bridging place count
  // If bridging <2 => we “auto-expand” or skip the child
  // => we load that child’s children or places, effectively flattening it for the user
  async function autoSkipChildNodes(children) {
    const results = [];

    for (let child of children) {
      // count how many bridging places
      // We do a quick query
      const { data: bridgingRows, error } = await supabase
        .from("place_taxonomy")
        .select("place_id", { count: "exact" }) // or just select("place_id") then check length
        .eq("taxonomy_id", child.id);
      if (error) {
        console.error("Error bridging child:", error);
        results.push(child); // fallback to keep child
        continue;
      }
      const placeCount = bridgingRows?.length || 0;

      // also, check how many child nodes does this child have
      const { data: subKids, error: subErr } = await supabase
        .from("taxonomy")
        .select("id")
        .eq("parent_id", child.id)
        .eq("is_active", true);
      const subKidCount = subKids?.length || 0;
      if (subErr) console.error("SubKid error:", subErr);

      if (placeCount < 2 && subKidCount === 0) {
        // if this child has fewer than 2 places bridging, no children => “skip” it
        console.log(
          `Auto-skipping child ${child.name}, placeCount=${placeCount}, no sub-layers.`
        );
        // We do nothing (i.e. not add it to results), effectively skipping
      } else if (placeCount < 2 && subKidCount === 1) {
        // auto expand that single sub-later
        console.log(
          `Auto-expanding child ${child.name}, placeCount <2, subKidCount=1. Flattening...`
        );
        // We can do a deeper flatten approach or just keep it for the user. 
        // Let's keep it in results for demonstration
        results.push(child);
      } else {
        // normal
        results.push(child);
      }
    }
    return results;
  }

  // ===============================
  // 5) LOADING PLACES from place_taxonomy => places
  // ===============================
  async function loadPlacesByNode(taxonomyId) {
    try {
      const { data, error } = await supabase
        .from("place_taxonomy")
        .select("place_id, places(*)")
        .eq("taxonomy_id", taxonomyId);

      if (error) throw error;

      let placeItems = (data || []).map((row) => row.places);
      placeItems.sort((a, b) => (b.weight || 0) - (a.weight || 0));

      if (placeItems.length === 0) {
        alert("No places found for this node!");
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

    // show "MATCH" overlay
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 2000);

    // add to matches
    setMatches((prev) => [...prev, currentPlace]);
    if (!matchDeckOpen) {
      setNewMatchesCount((n) => n + 1);
    }

    // next place
    const next = placeIndex + 1;
    if (next >= places.length) {
      // done => go back
      moveBackToTaxonomy();
    } else {
      setPlaceIndex(next);
    }
  }

  function handleNoPlace() {
    const next = placeIndex + 1;
    if (next >= places.length) {
      moveBackToTaxonomy();
    } else {
      setPlaceIndex(next);
    }
  }

  function handleYes() {
    if (mode === "places") {
      handleYesPlace();
    } else {
      handleYesTaxonomy();
    }
  }

  function handleNo() {
    if (mode === "places") {
      handleNoPlace();
    } else {
      handleNoTaxonomy();
    }
  }

  // ===============================
  // 7) NAVIGATION & RESHUFFLE
  // ===============================
  function moveBackToTaxonomy() {
    // after finishing places
    setMode("taxonomy");
    setPlaces([]);
    setPlaceIndex(0);
  }

  function handleGoBack() {
    if (mode === "places") {
      // switch to taxonomy
      setMode("taxonomy");
      setPlaces([]);
      setPlaceIndex(0);
    } else {
      // pop from stack
      if (nodeStack.length === 0) {
        alert("Already at the top-level!");
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
    loadTopLevelTaxonomy();
    setMatches([]);
    setNewMatchesCount(0);
  }

  // ===============================
  // 8) BUILD CURRENT CARD
  // ===============================
  let currentCard = null;
  if (mode === "taxonomy") {
    if (currentNode) {
      currentCard = {
        name: currentNode.name,
        image_url: currentNode.image_url || "",
        description: currentNode.description || ""
      };
    }
  } else if (mode === "places") {
    if (currentPlace) {
      currentCard = {
        name: currentPlace.name,
        image_url: currentPlace.image_url || "",
        description: currentPlace.description || "",
        latitude: currentPlace.latitude || null,
        longitude: currentPlace.longitude || null,
        neighborhood: currentPlace.neighborhood || ""
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

  // fallback background image
  const bgImage = currentCard.image_url?.trim()
    ? currentCard.image_url
    : "/images/default-bg.jpg";

  // Google maps embed
  let googleEmbedUrl = null;
  if (
    mode === "places" &&
    googleMapsKey &&
    currentCard.latitude &&
    currentCard.longitude
  ) {
    googleEmbedUrl = `https://www.google.com/maps/embed/v1/search?key=${googleMapsKey}&zoom=14&q=${currentCard.latitude},${currentCard.longitude}`;
  }

  // direct google place link
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

        {/* center content => if we're in places mode with lat/lon, show google embed */}
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

        {/* bottom => card name, yes/no, description */}
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

        {/* bottom nav => go back, reshuffle */}
        <button style={styles.goBackButton} onClick={handleGoBack}>
          Go Back
        </button>
        <button style={styles.reshuffleButton} onClick={handleReshuffle}>
          Reshuffle
        </button>

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
