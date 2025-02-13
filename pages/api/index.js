import { createClient } from "@supabase/supabase-js";

// ✅ Use Vercel Environment Variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ✅ Initialize Supabase Client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ✅ Function to Generate AI Embeddings Using OpenAI
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

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.data[0].embedding;
    } catch (error) {
        console.error("Error fetching AI embedding:", error.message);
        throw error;
    }
}

// ✅ API Route to Generate & Store Embeddings in Supabase
export default async function handler(req, res) {
    // ✅ Ensure API is POST Only
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { place_id, description } = req.body;

    // ✅ Validate Request Data
    if (!place_id || !description) {
        return res.status(400).json({ error: "Missing required fields: place_id or description" });
    }

    try {
        // ✅ Generate AI Embedding
        const embedding = await generateEmbedding(description);

        // ✅ Insert Embedding into Supabase
        const { data, error } = await supabase
            .from("vectors")
            .insert([{ id: place_id, embedding }]);

        if (error) throw error;

        return res.status(200).json({ message: "Embedding saved successfully", data });
    } catch (err) {
        console.error("Error generating or storing embedding:", err.message);
        return res.status(500).json({ error: err.message });
    }
}
