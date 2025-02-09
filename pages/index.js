"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@supabase/supabase-js";

// Load environment variables properly for client-side use
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase environment variables are missing!");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Dynamically import react-tinder-card with SSR disabled
const TinderCard = dynamic(() => import("react-tinder-card"), { ssr: false });

// Prebuilt categories and specific locations
const categories = {
    "Eat": ["Lexington Market", "Broadway Market", "Cross Street Market"],
    "Drink": ["Sagamore Spirit Distillery", "Union Craft Brewing", "Checkerspot Brewing Co."],
    "Party": ["The Horse You Came In On Saloon", "Horseshoe Casino"],
    "Explore": ["Inner Harbor Kayaking", "Urban Pirates Cruise", "Baltimore Bike Party"],
    "Culture & History": ["National Aquarium", "Maryland Science Center", "American Visionary Art Museum"],
};

/**
 * Fetch activity data from Supabase
 */
async function fetchActivities() {
    const { data, error } = await supabase.from("activities").select("*");
    if (error) {
        console.error("Error fetching activities:", error);
        return [];
    }
    return data;
}

export default function Home() {
    const [activities, setActivities] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [matched, setMatched] = useState([]);
    const [showMatches, setShowMatches] = useState(false);

    useEffect(() => {
        async function loadActivities() {
            const data = await fetchActivities();
            setActivities(data);
            setLoading(false);
        }
        loadActivities();
    }, []);

    const handleSwipe = (direction) => {
        if (direction === "right") {
            setMatched((prev) => [...prev, activities[currentIndex]]);
        }
        setCurrentIndex((prevIndex) => prevIndex + 1);
    };

    return (
        <div style={{ width: "100%", maxWidth: "420px", margin: "0 auto", height: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#fdfdfd", fontFamily: "sans-serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "1rem", borderBottom: "1px solid #ccc" }}>
                <button onClick={() => setShowMatches(true)}>♡ Matches</button>
                <h2>Swipe to Discover Activities</h2>
            </div>
            {loading ? (
                <p style={{ textAlign: "center" }}>Loading activities...</p>
            ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80vh" }}>
                    {activities.length > 0 && currentIndex < activities.length ? (
                        <TinderCard
                            key={activities[currentIndex].id}
                            onSwipe={(dir) => handleSwipe(dir)}
                            preventSwipe={["up", "down"]}>
                            <div style={{ width: "300px", height: "400px", borderRadius: "10px", overflow: "hidden", boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", backgroundColor: "#fff" }}>
                                {activities[currentIndex].image_url ? (
                                    <img src={activities[currentIndex].image_url} alt={activities[currentIndex].name} style={{ width: "100%", height: "60%", objectFit: "cover" }} />
                                ) : (
                                    <div style={{ width: "100%", height: "60%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#ccc" }}>No Image</div>
                                )}
                                <h3>{activities[currentIndex].name}</h3>
                                <p>{activities[currentIndex].address}</p>
                                <p>⭐ {activities[currentIndex].rating}</p>
                            </div>
                        </TinderCard>
                    ) : (
                        <p>No more activities.</p>
                    )}
                </div>
            )}
        </div>
    );
}
