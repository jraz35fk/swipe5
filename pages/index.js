import express from "express";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json()); // Middleware to parse JSON requests

// ✅ Secure API keys using environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ✅ Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Generates an AI embedding from OpenAI's API.
 * @param {string} text - The text to convert into an embedding.
 * @returns {Promise<number[]>} - The embedding array.
 */
async function generateEmbedding(text) {
    try {
        const response = await fetch("https://api.openai.com/v1/embeddings", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                input: text,
                model: "text-embedding-ada-002"
            })
        });

        const data = await response.json();

        if (!data || !data.data || !data.data[0]) {
            throw new Error("Invalid response from OpenAI API");
        }

        return data.data[0].embedding;
    } catch (error) {
        console.error("Error generating embedding:", error.message);
        throw new Error("Failed to generate AI embedding.");
    }
}

/**
 * API Route: Generates an embedding & stores it in the Supabase "vectors" table.
 */
app.post("/generate-embedding", async (req, res) => {
    const { place_id, description } = req.body;

    if (!place_id || !description) {
        return res.status(400).json({ error: "Missing place_id or description" });
    }

    try {
        const embedding = await generateEmbedding(description);

        // ✅ Store embedding in Supabase
        const { data, error } = await supabase
            .from("vectors")
            .insert([{ id: place_id, embedding }]);

        if (error) throw error;

        res.json({ message: "Embedding saved successfully", data });
    } catch (err) {
        console.error("Error generating embedding:", err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * ✅ Start Express server on port 3000.
 */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});

export default app;
