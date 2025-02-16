"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";

// 🔥 Connect to Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  const [places, setPlaces] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlaces();
  }, []);

  // 🏡 Fetch places from Supabase
  async function fetchPlaces() {
    setLoading(true);
    const { data, error } = await supabase
      .from("places")
      .select("*")
      .order("match_score", { ascending: false })
      .limit(10);

    if (error) console.error("Failed to fetch places:", error);
    setPlaces(data || []);
    setLoading(false);
  }

  // 👍 Accept a place
  async function acceptPlace(place) {
    console.log(`✅ Accepted: ${place.name}`);
    await updateTagWeights(place.id, place.tags, "accept");
    nextCard();
  }

  // ❌ Reject a place
  async function rejectPlace(place) {
    console.log(`❌ Rejected: ${place.name}`);
    await updateTagWeights(place.id, place.tags, "reject");
    nextCard();
  }

  // ➡ Move to next card
  function nextCard() {
    setCurrentIndex((prev) => (prev + 1 < places.length ? prev + 1 : 0));
  }

  // 🔄 Update tag weights dynamically based on user interaction
  async function updateTagWeights(placeId, tags, action) {
    const { data, error } = await supabase.from("user_interactions").insert([
      { place_id: placeId, action, timestamp: new Date().toISOString() },
    ]);
    if (error) console.error("Tag update failed:", error);
  }

  // 🎴 Card Animation Variants
  const cardVariants = {
    enter: { opacity: 0, x: 100 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -100 },
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-4xl font-bold mb-6">🔥 Welcome to Swipe5</h1>

      {loading ? (
        <p>Loading places...</p>
      ) : places.length > 0 ? (
        <AnimatePresence mode="wait">
          {places[currentIndex] && (
            <motion.div
              key={places[currentIndex].id}
              initial="enter"
              animate="center"
              exit="exit"
              variants={cardVariants}
              className="w-[350px] h-[500px] bg-gray-800 p-6 rounded-xl shadow-lg flex flex-col justify-between"
            >
              <h2 className="text-xl font-bold">{places[currentIndex].name}</h2>
              <p className="text-gray-300">{places[currentIndex].description}</p>
              <p className="text-blue-400 mt-2">
                {places[currentIndex].tags?.join(", ") || "No tags"}
              </p>

              <a
                href={places[currentIndex].website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-400 mt-2 block"
              >
                {places[currentIndex].website ? "Visit Website" : ""}
              </a>

              <div className="flex justify-between mt-6">
                <button
                  className="px-4 py-2 bg-red-500 rounded-lg hover:bg-red-700"
                  onClick={() => rejectPlace(places[currentIndex])}
                >
                  ❌ Reject
                </button>
                <button
                  className="px-4 py-2 bg-green-500 rounded-lg hover:bg-green-700"
                  onClick={() => acceptPlace(places[currentIndex])}
                >
                  ✅ Accept
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      ) : (
        <p>No places found.</p>
      )}
    </div>
  );
}