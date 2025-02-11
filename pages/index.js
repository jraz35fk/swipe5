import { useState } from "react";

export default function Home() {
  // For demo: some sample categories, subcategories, and places
  // In reality, you'd load these from your Supabase/DB logic.
  const sampleCategories = [
    { id: 1, name: "Food & Dining" },
    { id: 2, name: "Entertainment" }
  ];

  const sampleSubcategories = [
    { id: 101, category_id: 1, name: "Sushi" },
    { id: 102, category_id: 1, name: "Pizza" },
    { id: 201, category_id: 2, name: "Movies" }
  ];

  const samplePlaces = [
    {
      id: 9001,
      subcategory_id: 101,
      name: "Baltimore Sushi Spot",
      neighborhood: "Fells Point",
      description: "Best sushi in Fells Point!",
      latitude: 39.281512,  // Example lat
      longitude: -76.593128 // Example lon
    },
    {
      id: 9002,
      subcategory_id: 102,
      name: "Pizza Palace",
      neighborhood: "Canton",
      description: "Delicious deep-dish pizza!",
      latitude: 39.286317,
      longitude: -76.570109
    },
    {
      id: 9003,
      subcategory_id: 201,
      name: "Cinemark Theater",
      neighborhood: "Inner Harbor",
      description: "Blockbuster hits every day.",
      latitude: 39.287859,
      longitude: -76.612075
    }
  ];

  // Manage flow states
  const [mode, setMode] = useState("categories"); // "categories" | "subcategories" | "places"

  const [catIndex, setCatIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [placeIndex, setPlaceIndex] = useState(0);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);

  // Filter subcategories by selected category
  function getSubcatsForCategory(cat) {
    if (!cat) return [];
    return sampleSubcategories.filter(s => s.category_id === cat.id);
  }

  // Filter places by selected subcategory
  function getPlacesForSubcategory(sub) {
    if (!sub) return [];
    return samplePlaces.filter(p => p.subcategory_id === sub.id);
  }

  // Current items
  const currentCategory = sampleCategories[catIndex] || null;
  const subcatsForCat = getSubcatsForCategory(selectedCategory);
  const currentSubcat = subcatsForCat[subIndex] || null;
  const placesForSub = getPlacesForSubcategory(selectedSubcategory);
  const currentPlace = placesForSub[placeIndex] || null;

  // Environment variable for Google Maps
  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY;

  // ========== HANDLERS FOR YES/NO ==========

  function handleYesCategory() {
    if (!currentCategory) return;
    setSelectedCategory(currentCategory);
    setSubIndex(0);
    setPlaceIndex(0);
    setMode("subcategories");
  }
  function handleNoCategory() {
    const next = catIndex + 1;
    if (next >= sampleCategories.length) {
      alert("No more categories left!");
    } else {
      setCatIndex(next);
    }
  }

  function handleYesSubcategory() {
    if (!currentSubcat) return;
    setSelectedSubcategory(currentSubcat);
    setPlaceIndex(0);
    setMode("places");
  }
  function handleNoSubcategory() {
    const next = subIndex + 1;
    if (next >= subcatsForCat.length) {
      const nextCat = catIndex + 1;
      if (nextCat >= sampleCategories.length) {
        alert("No more categories left!");
        setMode("categories");
      } else {
        setCatIndex(nextCat);
        setMode("categories");
      }
    } else {
      setSubIndex(next);
    }
  }

  function handleYesPlace() {
    if (!currentPlace) return;
    alert(`MATCH with ${currentPlace.name}!`);
    // Add it to matches if you want:
    // setMatches([...matches, currentPlace]);
    const next = placeIndex + 1;
    if (next >= placesForSub.length) {
      // Move to next subcat or cat
      handleNoSubcategory();
    } else {
      setPlaceIndex(next);
    }
  }
  function handleNoPlace() {
    const next = placeIndex + 1;
    if (next >= placesForSub.length) {
      handleNoSubcategory();
    } else {
      setPlaceIndex(next);
    }
  }

  // unify no/yes
  function handleNo() {
    if (mode === "places") handleNoPlace();
    else if (mode === "subcategories") handleNoSubcategory();
    else handleNoCategory();
  }
  function handleYes() {
    if (mode === "places") handleYesPlace();
    else if (mode === "subcategories") handleYesSubcategory();
    else handleYesCategory();
  }

  // ========== RENDER ==========

  // 1) Categories flow
  if (mode === "categories") {
    if (!currentCategory) {
      return (
        <div style={styles.container}>
          <h1>DialN</h1>
          <p>No more categories!</p>
        </div>
      );
    }
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>Category: {currentCategory.name}</h1>
        <div style={styles.buttonRow}>
          <button style={styles.noButton} onClick={handleNo}>No</button>
          <button style={styles.yesButton} onClick={handleYes}>Yes</button>
        </div>
      </div>
    );
  }

  // 2) Subcategories flow
  if (mode === "subcategories") {
    if (!currentSubcat) {
      return (
        <div style={styles.container}>
          <h1>{selectedCategory?.name}</h1>
          <p>No more subcategories!</p>
        </div>
      );
    }
    return (
      <div style={styles.container}>
        <h2 style={styles.title}>Subcategory: {currentSubcat.name}</h2>
        <div style={styles.buttonRow}>
          <button style={styles.noButton} onClick={handleNo}>No</button>
          <button style={styles.yesButton} onClick={handleYes}>Yes</button>
        </div>
      </div>
    );
  }

  // 3) Places flow
  if (mode === "places") {
    if (!currentPlace) {
      return (
        <div style={styles.container}>
          <h2>{selectedSubcategory?.name}</h2>
          <p>No more places!</p>
        </div>
      );
    }

    // Build the Google Maps embed URL
    // default to lat/lon if missing
    const lat = currentPlace.latitude || 39.2904;
    const lng = currentPlace.longitude || -76.6122;
    const embedKey = googleApiKey || "MISSING_KEY";
    const googleMapUrl = `https://www.google.com/maps/embed/v1/view?key=${embedKey}
      &center=${lat},${lng}
      &zoom=14
      &markers=${lat},${lng}`.replace(/\s+/g, "");

    return (
      <div style={styles.container}>
        <h2 style={styles.title}>{currentPlace.name}</h2>
        <p>{currentPlace.neighborhood}</p>

        {/* This is the MAP IFRAME */}
        <iframe
          width="600"
          height="400"
          style={{ border: 0 }}
          loading="lazy"
          allowFullScreen
          src={googleMapUrl}
        />

        <p style={styles.desc}>{currentPlace.description}</p>

        <div style={styles.buttonRow}>
          <button style={styles.noButton} onClick={handleNo}>No</button>
          <button style={styles.yesButton} onClick={handleYes}>Yes</button>
        </div>
      </div>
    );
  }

  return null;
}

// ========== STYLES ==========

const styles = {
  container: {
    fontFamily: "sans-serif",
    padding: "20px"
  },
  title: {
    fontSize: "2em",
    marginBottom: "1em"
  },
  desc: {
    marginTop: "1em",
    fontSize: "1.1em"
  },
  buttonRow: {
    marginTop: "2em",
    display: "flex",
    gap: "20px"
  },
  noButton: {
    backgroundColor: "#f44336",
    border: "none",
    color: "#fff",
    padding: "10px 20px",
    cursor: "pointer",
    fontSize: "1em",
    borderRadius: "5px"
  },
  yesButton: {
    backgroundColor: "#4CAF50",
    border: "none",
    color: "#fff",
    padding: "10px 20px",
    cursor: "pointer",
    fontSize: "1em",
    borderRadius: "5px"
  }
};
