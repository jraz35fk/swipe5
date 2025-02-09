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

/**
 * Fetch categories from Supabase
 */
async function fetchCategories() {
    const { data, error } = await supabase.from("categories").select("*");
    if (error) {
        console.error("Error fetching categories:", error);
        return [];
    }
    console.log("Fetched Categories:", data);
    return data;
}

export default function Home() {
    const [categories, setCategories] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadCategories() {
            const data = await fetchCategories();
            setCategories(data);
            setLoading(false);
        }
        loadCategories();
    }, []);

    const handleSwipe = (direction) => {
        if (direction === "right") {
            console.log("Selected Category:", categories[currentIndex]);
        }
        setCurrentIndex((prevIndex) => prevIndex + 1);
    };

    return (
        <div style={{ width: "100%", maxWidth: "420px", margin: "0 auto", height: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#fdfdfd", fontFamily: "sans-serif" }}>
            <div style={{ display: "flex", justifyContent: "center", padding: "1rem", borderBottom: "1px solid #ccc" }}>
                <h2>Swipe to Select a Category</h2>
            </div>
            {loading ? (
                <p style={{ textAlign: "center" }}>Loading categories...</p>
            ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80vh" }}>
                    {categories.length > 0 && currentIndex < categories.length ? (
                        <TinderCard
                            key={categories[currentIndex].id}
                            onSwipe={(dir) => handleSwipe(dir)}
                            preventSwipe={["up", "down"]}>
                            <div style={{
                                width: "300px",
                                height: "400px",
                                borderRadius: "10px",
                                overflow: "hidden",
                                boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                textAlign: "center",
                                backgroundColor: "#fff"
                            }}>
                                <h3>{categories[currentIndex]?.name || "No Category"}</h3>
                            </div>
                        </TinderCard>
                    ) : (
                        <p>No categories available.</p>
                    )}
                </div>
            )}
        </div>
    );
}
