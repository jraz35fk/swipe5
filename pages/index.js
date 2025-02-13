import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Supabase Configuration
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  const [cards, setCards] = useState([]); // Holds the stack of cards
  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState([]); // Tracks previous selections for "Go Back"
  const [showMatch, setShowMatch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTag, setSearchTag] = useState(""); // Holds search input for new tags

  useEffect(() => {
    if (typeof window !== "undefined") {
      fetchCards("persona");
    }
  }, []);

  // Fetch Cards Based on Layer (Persona → Tier 1 → Tier 2 → Places)
  const fetchCards = async (layer, previousSelection = null) => {
    setLoading(true);
    setError(null);

    let query = supabase.from("places").select("*");

    if (layer === "persona") {
      query = query.contains("tags", ["persona"]);
    } else if (layer === "tier1" && previousSelection) {
      query = query.contains("tags", [previousSelection]);
    } else if (layer === "tier2" && previousSelection) {
      query = query.contains("tags", [previousSelection]);
    } else if (layer === "places" && previousSelection) {
      query = query.contains("tags", [previousSelection]);
    } else if (layer === "untagged") {
      query = query.or(
        "tags.cs.{persona}, tags.cs.{tier1}"
      ); // Fetch places with only Persona or Tier 1 tags
    }

    try {
      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error(`No cards found for ${layer}.`);
      }

      setCards(data);
      setCurrentIndex(0);
    } catch (err) {
      setError(`Failed to load ${layer} cards. Try reshuffling.`);
    } finally {
      setLoading(false);
    }
  };

  // Handle Card Selection
  const handleSelection = (accepted) => {
    if (!cards || cards.length === 0) return;

    if (accepted) {
      const selectedCard = cards[currentIndex];

      if (!selectedCard || !selectedCard.tags) {
        setError("Invalid card data. Try reshuffling.");
        return;
      }

      if (selectedCard.tags.includes("place")) {
        setShowMatch(true);
        return;
      }

      let nextLayer =
        selectedCard.tags.includes("tier1")
          ? "tier1"
          : selectedCard.tags.includes("tier2")
          ? "tier2"
          : "places";

      setHistory([...history, { layer: nextLayer, selection: selectedCard.tags[0] }]);
      fetchCards(nextLayer, selectedCard.tags[0]);
    } else {
      setCurrentIndex((prevIndex) => (prevIndex + 1 < cards.length ? prevIndex + 1 : 0));

      if (currentIndex + 1 >= cards.length) {
        fetchCards("untagged"); // Show untagged places after Tier 2 exhaustion
      }
    }
  };

  // Add a New Tag to a Place
  const addTag = async (placeId) => {
    if (!searchTag.trim()) return;

    const place = cards[currentIndex];
    if (!place) return;

    const updatedTags = [...place.tags, searchTag.trim()];

    try {
      const { error } = await
