import { createClient } from "@supabase/supabase-js";

// Use Vercel environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Function to generate AI embeddings using OpenAI
async function generateEmbedding(text) {
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
    return data.data[0].embedding;
}

// API Route to Generate Embeddings & Store in Supabase
export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { place_id, description } = req.body;

    if (!place_id || !description) {
        return res.status(400).json({ error: "Missing required fields: place_id or description" });
    }

    try {
        const embedding = await generateEmbedding(description);

        const { data, error } = await supabase
            .from("vectors")
            .insert([{ id: place_id, embedding }]);

        if (error) throw error;

        return res.json({ message: "Embedding saved successfully", data });
    } catch (err) {
        console.error("Error generating embedding:", err.message);
        return res.status(500).json({ error: err.message });
    }
}
