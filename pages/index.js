import { createClient } from "@supabase/supabase-js";
import express from "express";
import cors from "cors";

const SUPABASE_URL = "https://hfxowmabetqjevypvtqr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmeG93bWFiZXRxamV2eXB2dHFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkzMTI0ODksImV4cCI6MjA1NDg4ODQ4OX0.6CXgEt3SJHDshX8ggj7_cLOqU0FNFY_mC8xAPqVdIqQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Log successful connection
console.log("✅ Supabase connected successfully!");

// Fetch Recommended Cards for User
app.get("/recommendations/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        const { data, error } = await supabase.rpc("get_recommended_cards", {
            user_id: userId,
        });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error("Error fetching recommendations:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// Store User Interactions (Likes/Dislikes)
app.post("/interact", async (req, res) => {
    const { user_id, place_id, action } = req.body;

    try {
        const { data, error } = await supabase
            .from("user_interactions")
            .insert([{ user_id, place_id, action }]);

        if (error) throw error;
        res.json({ message: "Interaction saved successfully", data });
    } catch (err) {
        console.error("Error saving interaction:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// Get User Profile Data
app.get("/user/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        const { data, error } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("user_id", userId);

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error("Error fetching user profile:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// Start Express Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
