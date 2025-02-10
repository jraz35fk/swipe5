import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  // MAIN STATE
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [places, setPlaces] = useState([]);

  // LAYERS
  const [catIndex, setCatIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [mode, setMode] = useState("categories"); // "categories", "subcategories", "subsub" or "places"

  // SELECTED
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);

  // For sub-sub layer
  const [subsub, setSubsub] = useState([]); // list of neighborhoods if subcategory=Neighborhoods
  const [subsubIndex, setSubsubIndex] = useState(0);
  const [subsubMode, setSubsubMode] = useState(false); // if we're in sub-sub

  // MATCHES
  const [placesMode, setPlacesMode] = useState(false); // final layer
  const [finalPlaces, setFinalPlaces] = useState([]); // the array of places for the final swipe
  const [placeIndex, setPlaceIndex] = useState(0);

  const [showCelebration, setShowCelebration] = useState(false);
  const [matches, setMatches] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: catData, error: catErr } = await supabase
        .from("categories")
        .select("*")
        .order("weight", { ascending: false });
      if (catErr) throw catErr;

      const { data: subData, error: subErr } = await supabase
        .from("subcategories")
        .select("*")
        .order("weight", { ascending: false });
      if (subErr) throw subErr;

      setCategories(catData || []);
      setSubcategories(subData || []);
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  // CURRENT
  const currentCategory = categories[catIndex] || null;

  function getSubcatsForCategory(cat) {
    if (!cat) return [];
    return subcategories.filter((s) => s.category_id === cat.id);
  }
  const scList = getSubcatsForCategory(selectedCategory);
  const currentSubcategoryObj = scList[subIndex] || null;

  const currentSubsub = subsub[subsubIndex] || null; // for neighborhoods sub-sub

  const currentPlace = finalPlaces[placeIndex] || null;

  // Card data depends on which "mode" we're in
  function getCardData() {
    if (mode === "categories") {
      return currentCategory ? { name: currentCategory.name } : null;
    } else if (mode === "subcategories") {
      return currentSubcategoryObj ? { name: currentSubcategoryObj.name } : null;
    } else if (subsubMode) {
      return currentSubsub ? { name: currentSubsub.name } : null;
    } else if (placesMode) {
      return currentPlace ? { name: currentPlace.name } : null;
    }
    return null;
  }

  const currentCard = getCardData();

  // BKG fallback
  function getBkg() {
    if (currentCard && currentCard.image_url) {
      return currentCard.image_url;
    }
    return "/images/default-bg.jpg"; // fallback
  }

  // ============= MAIN SWIPE LOGIC =============
  function handleYesCategory() {
    if (!currentCategory) return;
    setSelectedCategory(currentCategory);
    setSubIndex(0);
    setMode("subcategories");
    setPlacesMode(false);
    setSubsubMode(false);
  }
  function handleNoCategory() {
    const next = catIndex + 1;
    if (next >= categories.length) {
      alert("No more categories!");
    } else {
      setCatIndex(next);
    }
  }

  async function handleYesSubcategory() {
    if (!currentSubcategoryObj) return;
    setSelectedSubcategory(currentSubcategoryObj);
    // If subcategory = "Neighborhoods" or if category= "Neighborhoods" => sub-sub
    if (currentCategory && currentCategory.name === "Neighborhoods") {
      // user is exploring top-level "Neighborhoods," so subcat is an actual neighborhood => we do final places now
      await loadPlacesForNeighborhood(currentSubcategoryObj.name, null);
      setMode("");
      setSubsubMode(false);
      setPlacesMode(true);
      setPlaceIndex(0);
    } else if (currentSubcategoryObj.name === "Neighborhoods") {
      // sub-sub approach
      // we load the sub-sub: each neighborhood that has bridging for (selectedCategory + neighborhood)
      await loadNeighborhoodsForCategory(selectedCategory.name);
    } else {
      // normal subcategory => load bridging places
      await loadPlacesForSubcategory(currentSubcategoryObj.id);
    }
  }
  function handleNoSubcategory() {
    const next = subIndex + 1;
    const scList2 = getSubcatsForCategory(selectedCategory);
    if (next >= scList2.length) {
      // next category
      const nextCat = catIndex + 1;
      if (nextCat >= categories.length) {
        alert("No more categories");
        setMode("categories");
      } else {
        setCatIndex(nextCat);
        setMode("categories");
      }
    } else {
      setSubIndex(next);
    }
  }

  // SUB-SUB
  async function loadNeighborhoodsForCategory(catName) {
    // We assume we have a "Neighborhoods" category with subcategories of actual neighborhoods
    // Let's fetch those subcategories + bridging filter so only neighborhoods that contain places under catName
    try {
      // 1) find the "Neighborhoods" category ID
      const { data: nbCatData, error: nbCatErr } = await supabase
        .from("categories")
        .select("*")
        .eq("name", "Neighborhoods")
        .single();
      if (nbCatErr) throw nbCatErr;
      const nbCatId = nbCatData.id;

      // 2) all subcategories under "Neighborhoods"
      const { data: nbSubs, error: nbSubsErr } = await supabase
        .from("subcategories")
        .select("*")
        .eq("category_id", nbCatId);
      if (nbSubsErr) throw nbSubsErr;

      // 3) filter out neighborhoods that actually have places bridging to both catName & that neighborhood
      // We'll do a bridging approach:
      //  - find category catName => get its subcategories => bridging => intersect with neighborhood subcat => bridging
      const { data: catIdRow } = await supabase
        .from("categories")
        .select("id")
        .eq("name", catName)
        .single();
      if (!catIdRow) {
        // no such cat
        setSubsub([]);
        return;
      }
      const catIdVal = catIdRow.id;

      // subcategories for catName
      const { data: mainSubs } = await supabase
        .from("subcategories")
        .select("id")
        .eq("category_id", catIdVal);

      if (!mainSubs || mainSubs.length === 0) {
        setSubsub([]);
        return;
      }
      const mainSubIds = mainSubs.map((s) => s.id);

      // We want neighborhoods that have bridging to places that also appear in mainSubIds
      // We'll do a bridging intersect approach:
      // place_subcategories => subcategory_id in mainSubIds => place_id => subcategory_id in neighborhoods subcat
      // We'll just do a direct approach in code for simplicity:

      // fetch bridging for main cat
      const { data: bridgingMain } = await supabase
        .from("place_subcategories")
        .select("place_id, subcategory_id");

      if (!bridgingMain) {
        setSubsub([]);
        return;
      }

      // We'll create sets of place_ids that belong to catName subcategories
      const placeSet = new Set();
      bridgingMain.forEach((row) => {
        if (mainSubIds.includes(row.subcategory_id)) {
          placeSet.add(row.place_id);
        }
      });

      // Now for each neighborhood subcat, check if it shares any place_id from placeSet
      const { data: bridgingNeighborhood } = await supabase
        .from("place_subcategories")
        .select("place_id, subcategory_id");

      const subsubList = [];
      nbSubs.forEach((nbSub) => {
        // find any bridging row that matches subcategory_id= nbSub.id and place_id in placeSet
        const hasOverlap = bridgingNeighborhood.some(
          (br) => br.subcategory_id === nbSub.id && placeSet.has(br.place_id)
        );
        if (hasOverlap) {
          subsubList.push(nbSub);
        }
      });

      // sort by number of places if you want
      // we'll do a place_count approach
      const counts = {};
      subsubList.forEach((s) => {
        const c = bridgingNeighborhood.filter(
          (br) => br.subcategory_id === s.id && placeSet.has(br.place_id)
        ).length;
        counts[s.id] = c;
      });
      subsubList.sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0));

      setSubsub(subsubList);
      setSubsubIndex(0);
      setSubsubMode(true);
      setMode("");
      setPlacesMode(false);
      setPlaceIndex(0);
    } catch (err) {
      console.error(err);
      setSubsub([]);
    }
  }

  function handleYesSubsub() {
    // The user picked a sub-sub => we load places that are in both selectedCategory + subsub
    if (!currentSubsub) return;
    loadPlacesForNeighborhood(currentSubsub.name, selectedCategory.name);
  }
  function handleNoSubsub() {
    const next = subsubIndex + 1;
    if (next >= subsub.length) {
      // done subsub
      // go back to subcategories
      setSubsubMode(false);
      setMode("subcategories");
    } else {
      setSubsubIndex(next);
    }
  }

  async function loadPlacesForNeighborhood(nbName, catName) {
    // This loads places that match subcat => the neighborhood + subcat => main cat
    // We'll do bridging intersection approach
    try {
      // find "Neighborhoods" cat => subcat => nbName => get subcat ID
      const { data: nbCat } = await supabase
        .from("categories")
        .select("id")
        .eq("name", "Neighborhoods")
        .single();
      if (!nbCat) {
        setFinalPlaces([]);
        setPlacesMode(true);
        setPlaceIndex(0);
        return;
      }
      const { data: nbSub } = await supabase
        .from("subcategories")
        .select("id")
        .eq("category_id", nbCat.id)
        .eq("name", nbName)
        .single();
      if (!nbSub) {
        setFinalPlaces([]);
        setPlacesMode(true);
        setPlaceIndex(0);
        return;
      }
      const nbSubId = nbSub.id;

      // if catName is null => means user came from top-level "Neighborhoods" category
      // so we just fetch bridging for nbSubId
      let placeSet = new Set();
      const { data: bridgingAll } = await supabase
        .from("place_subcategories")
        .select("place_id, subcategory_id");
      if (!bridgingAll) {
        setFinalPlaces([]);
        setPlacesMode(true);
        setPlaceIndex(0);
        return;
      }

      // gather place_ids for nbSubId
      const nbPlaces = bridgingAll.filter((br) => br.subcategory_id === nbSubId).map((br) => br.place_id);

      let catPlaces = [];
      if (catName) {
        // find catName => subcats => place bridging
        const { data: catRow } = await supabase
          .from("categories")
          .select("id")
          .eq("name", catName)
          .single();
        if (!catRow) {
          setFinalPlaces([]);
          setPlacesMode(true);
          setPlaceIndex(0);
          return;
        }
        const { data: catSubs } = await supabase
          .from("subcategories")
          .select("id")
          .eq("category_id", catRow.id);

        if (!catSubs) {
          setFinalPlaces([]);
          setPlacesMode(true);
          setPlaceIndex(0);
          return;
        }
        const catSubIds = catSubs.map((s) => s.id);
        // bridging for catSubIds
        catPlaces = bridgingAll
          .filter((br) => catSubIds.includes(br.subcategory_id))
          .map((br) => br.place_id);
      } else {
        // top-level "Neighborhoods" => no cat filter
        catPlaces = nbPlaces;
      }

      // intersection
      let finalPlaceIds = nbPlaces;
      if (catName) {
        finalPlaceIds = nbPlaces.filter((pid) => catPlaces.includes(pid));
      }

      // now load the actual place rows
      const { data: placeRows } = await supabase
        .from("places")
        .select("*")
        .in("id", finalPlaceIds);

      let placeItems = placeRows || [];
      // sort by weight desc
      placeItems.sort((a, b) => (b.weight || 0) - (a.weight || 0));

      setFinalPlaces(placeItems);
      setPlaceIndex(0);
      setPlacesMode(true);
      setMode("");
      setSubsubMode(false);
    } catch (err) {
      console.error(err);
      setFinalPlaces([]);
      setPlacesMode(true);
      setPlaceIndex(0);
    }
  }

  async function loadPlacesForSubcategory(subcatId) {
    try {
      const { data, error } = await supabase
        .from("place_subcategories")
        .select("place_id, places(*)")
        .eq("subcategory_id", subcatId);
      if (error) throw error;

      let placeItems = data.map((row) => row.places);
      placeItems.sort((a, b) => (b.weight || 0) - (a.weight || 0));
      setFinalPlaces(placeItems);
      setPlaceIndex(0);
      setPlacesMode(true);
      setMode("");
      setSubsubMode(false);
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  // PLACES SWIPE
  const currentPlaceObj = finalPlaces[placeIndex] || null;
  function handleYesPlace() {
    if (!currentPlaceObj) return;
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 2000);

    setMatches((prev) => [...prev, currentPlaceObj]);
    const next = placeIndex + 1;
    if (next >= finalPlaces.length) {
      // done places => go back to sub-sub or subcategories
      if (subsubMode) {
        // go back to sub-sub
        setPlacesMode(false);
        setMode("");
        setSubsubMode(true);
      } else {
        // normal subcat flow
        setPlacesMode(false);
        setMode("subcategories");
      }
    } else {
      setPlaceIndex(next);
    }
  }
  function handleNoPlace() {
    const next = placeIndex + 1;
    if (next >= finalPlaces.length) {
      if (subsubMode) {
        setPlacesMode(false);
        setMode("");
        setSubsubMode(true);
      } else {
        setPlacesMode(false);
        setMode("subcategories");
      }
    } else {
      setPlaceIndex(next);
    }
  }

  // GO BACK / RESHUFFLE
  function handleGoBack() {
    if (placesMode) {
      // go back to sub-sub or subcat
      if (subsubMode) {
        setPlacesMode(false);
        setMode("");
        setSubsubMode(true);
      } else {
        setPlacesMode(false);
        setMode("subcategories");
      }
    } else if (subsubMode) {
      // go back to subcategories
      setSubsubMode(false);
      setMode("subcategories");
    } else if (mode === "subcategories") {
      setMode("categories");
    } else {
      alert("Already at top-level categories!");
    }
  }
  function handleReshuffle() {
    setCatIndex(0);
    setSubIndex(0);
    setSubsub([]);
    setSubsubIndex(0);
    setSubsubMode(false);
    setPlacesMode(false);
    setPlaceIndex(0);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setFinalPlaces([]);
    setMode("categories");
  }

  // DETERMINE CURRENT CARD
  let currentName = "";
  let currentNeighborhood = "";
  if (placesMode) {
    if (currentPlaceObj) {
      currentName = currentPlaceObj.name;
      if (currentPlaceObj.neighborhood) {
        currentNeighborhood = currentPlaceObj.neighborhood;
      }
    }
  } else if (subsubMode) {
    if (currentSubsub) {
      currentName = currentSubsub.name;
    }
  } else if (mode === "subcategories") {
    if (currentSubcategoryObj) {
      currentName = currentSubcategoryObj.name;
    }
  } else if (mode === "categories") {
    if (currentCategory) {
      currentName = currentCategory.name;
    }
  }

  // If everything is exhausted
  if (!currentName) {
    return (
      <div style={styles.container}>
        <h1>DialN</h1>
        <p>No more {mode} to show.</p>
        <button onClick={handleReshuffle} style={styles.reshuffleButton}>
          Reshuffle
        </button>
      </div>
    );
  }
  const bgImage = "/images/default-bg.jpg"; // or handle advanced images if you want

  // LEFT BREADCRUMB
  function getLeftText() {
    if (mode === "subcategories" && selectedCategory) {
      return selectedCategory.name;
    }
    if (subsubMode && selectedCategory && selectedSubcategory?.name === "Neighborhoods") {
      return `${selectedCategory.name} -> Neighborhoods`;
    }
    if (placesMode && subsubMode) {
      return `${selectedCategory?.name} -> Neighborhoods -> ${currentSubsub?.name}`;
    }
    if (placesMode && !subsubMode && selectedSubcategory) {
      return `${selectedCategory?.name} -> ${selectedSubcategory?.name}`;
    }
    return "";
  }
  const leftText = getLeftText();

  // RIGHT TEXT: If places mode & we have neighborhood => show "USA->Baltimore->..."
  function getRightText() {
    if (placesMode && currentNeighborhood) {
      return `USA -> Baltimore -> ${currentNeighborhood}`;
    }
    return "";
  }
  const rightText = getRightText();

  // RENDER
  return (
    <div style={{ ...styles.container, backgroundImage: `url(${bgImage})` }}>
      <div style={styles.overlay}>
        {/* Top Row */}
        <div style={styles.topRow}>
          <div style={styles.leftText}>{leftText}</div>
          <div style={styles.rightText}>{rightText}</div>
        </div>

        <div style={styles.centerContent}></div>

        {/* BOTTOM Card */}
        <div style={styles.bottomTextRow}>
          <h1 style={styles.currentCardName}>{currentName}</h1>

          {/* If in places mode, show neighborhood text */}
          {placesMode && currentNeighborhood && (
            <p style={styles.neighborhoodText}>{currentNeighborhood}</p>
          )}

          {/* Yes/No row */}
          <div style={styles.yesNoRow}>
            <button style={styles.noButton} onClick={handleNo}>
              No
            </button>
            <button style={styles.yesButton} onClick={handleYes}>
              Yes
            </button>
          </div>
        </div>

        <button style={styles.goBackButton} onClick={handleGoBack}>
          Go Back
        </button>
        <button style={styles.reshuffleButton} onClick={handleReshuffle}>
          Reshuffle
        </button>
      </div>

      {showCelebration && <CelebrationAnimation />}
      {errorMsg && (
        <p style={{ color: "red", position: "absolute", top: 10, left: 10 }}>
          {errorMsg}
        </p>
      )}
    </div>
  );

  function handleNo() {
    if (placesMode) {
      handleNoPlace();
    } else if (subsubMode) {
      handleNoSubsub();
    } else if (mode === "subcategories") {
      handleNoSubcategory();
    } else {
      handleNoCategory();
    }
  }
  function handleYes() {
    if (placesMode) {
      handleYesPlace();
    } else if (subsubMode) {
      handleYesSubsub();
    } else if (mode === "subcategories") {
      handleYesSubcategory();
    } else {
      handleYesCategory();
    }
  }
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

const styles = {
  container: {
    width: "100vw",
    height: "100vh",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    position: "relative",
    fontFamily: "sans-serif",
  },
  overlay: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.3)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    position: "relative",
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 20px",
  },
  leftText: {
    color: "#fff",
    fontSize: "1.3em",
    textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
    margin: 0,
    textTransform: "uppercase",
    maxWidth: "50%",
  },
  rightText: {
    color: "#ffd700",
    fontSize: "1.2em",
    textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
    margin: 0,
    textAlign: "right",
    maxWidth: "50%",
  },
  centerContent: {
    flexGrow: 1,
  },
  bottomTextRow: {
    textAlign: "center",
    marginBottom: "70px",
  },
  currentCardName: {
    color: "#fff",
    fontSize: "3em",
    textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
    margin: 0,
    textTransform: "uppercase",
  },
  neighborhoodText: {
    color: "#FFD700",
    fontSize: "1.5em",
    fontStyle: "italic",
    textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
    marginTop: "10px",
    marginBottom: "15px",
  },
  yesNoRow: {
    marginTop: "20px",
    display: "flex",
    justifyContent: "center",
    gap: "40px",
  },
  noButton: {
    backgroundColor: "#f44336",
    color: "#fff",
    border: "none",
    padding: "12px 24px",
    borderRadius: "5px",
    fontSize: "1.1em",
    cursor: "pointer",
  },
  yesButton: {
    backgroundColor: "#4CAF50",
    color: "#fff",
    border: "none",
    padding: "12px 24px",
    borderRadius: "5px",
    fontSize: "1.1em",
    cursor: "pointer",
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
    cursor: "pointer",
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
    cursor: "pointer",
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
    zIndex: 9999,
  },
  celebrationBox: {
    backgroundColor: "#fff",
    padding: "30px",
    borderRadius: "10px",
    textAlign: "center",
  },
};
