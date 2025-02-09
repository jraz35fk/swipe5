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
    return data;
}

export default function Home() {
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadCategories() {
            const data = await fetchCategories();
            setCategories(data);
            setLoading(false);
        }
        loadCategories();
    }, []);

    return (
        <div style={{ width: "100%", maxWidth: "420px", margin: "0 auto", height: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#fdfdfd", fontFamily: "sans-serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "1rem", borderBottom: "1px solid #ccc" }}>
                <h2>Swipe to Discover Activities</h2>
            </div>
            {loading ? (
                <p style={{ textAlign: "center" }}>Loading categories...</p>
            ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80vh", flexDirection: "column" }}>
                    {!selectedCategory ? (
                        <>
                            <h2>Select a Category</h2>
                            {categories.map((category) => (
                                <button key={category.id} onClick={() => setSelectedCategory(category.id)} style={{ margin: "10px", padding: "10px", fontSize: "16px" }}>
                                    {category.name}
                                </button>
                            ))}
                        </>
                    ) : (
                        <div>
                            <button onClick={() => setSelectedCategory(null)} style={{ marginBottom: "10px" }}>← Back</button>
                            <h2>Activities for Selected Category (To Be Implemented)</h2>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
