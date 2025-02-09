"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Dynamically import react-tinder-card with SSR disabled
const TinderCard = dynamic(() => import("react-tinder-card"), { ssr: false });

/**
 * Fetch activity data from the API
 */
async function fetchActivities(location, type) {
    const response = await fetch(`/api/activities?location=${location}&type=${type}`);
    const data = await response.json();
    return data;
}

export default function Home() {
    const [activities, setActivities] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadActivities() {
            const data = await fetchActivities("Baltimore", "restaurant"); // Change as needed
            setActivities(data);
            setLoading(false);
        }
        loadActivities();
    }, []);

    const handleSwipe = (direction) => {
        if (direction === "right") {
            console.log("Matched:", activities[currentIndex]);
        }
        setCurrentIndex((prevIndex) => prevIndex + 1);
    };

    return (
        <div style={{ width: "100%", maxWidth: "420px", margin: "0 auto", height: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#fdfdfd", fontFamily: "sans-serif" }}>
            <h2 style={{ textAlign: "center", padding: "1rem" }}>Swipe to Discover Activities</h2>
            {loading ? (
                <p style={{ textAlign: "center" }}>Loading activities...</p>
            ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80vh" }}>
                    {activities.length > 0 && currentIndex < activities.length ? (
                        <TinderCard
                            key={activities[currentIndex].name}
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
