"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Dynamically import react-tinder-card with SSR disabled
const TinderCard = dynamic(() => import("react-tinder-card"), { ssr: false });

async function fetchFinalMatchCards(category) {
    try {
        const response = await fetch(`/api/activities?category=${category}`);
        return response.ok ? await response.json() : [];
    } catch (error) {
        console.error("Error fetching final match cards:", error);
        return [];
    }
}

export default function Home() {
    const [categories, setCategories] = useState([]);
    const [currentCategory, setCurrentCategory] = useState(null);
    const [finalMatches, setFinalMatches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadCategories() {
            const { data, error } = await supabase.from("activities").select("*");
            if (error) console.error("Supabase fetch error:", error);
            setCategories(data || []);
            setLoading(false);
        }
        loadCategories();
    }, []);

    const handleSwipe = async (direction, category) => {
        if (direction === "right") {
            const subcategories = categories.filter(c => c.parent_category === category);
            if (subcategories.length > 0) {
                setCurrentCategory(subcategories);
            } else {
                const finalResults = await fetchFinalMatchCards(category);
                setFinalMatches(finalResults);
            }
        }
    };

    return (
        <div className="app-container">
            {loading ? (
                <p>Loading...</p>
            ) : finalMatches.length > 0 ? (
                <div className="final-matches">
                    {finalMatches.map((match, index) => (
                        <div key={index} className="match-card">
                            <h3>{match.name}</h3>
                            <p>{match.description}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card-container">
                    {categories.map((category, index) => (
                        <TinderCard key={index} onSwipe={(dir) => handleSwipe(dir, category.name)}>
                            <div className="swipe-card">
                                <h2>{category.name}</h2>
                            </div>
                        </TinderCard>
                    ))}
                </div>
            )}
        </div>
    );
}
