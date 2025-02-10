import axios from "axios";
import { createClient } from "@supabase/supabase-js";

const CHUNK_SIZE = 10; // how many rows to process per chunk

export default async function handler(req, res) {
  const debugLogs = [];
  debugLogs.push("Starting /api/fetch-images route with chunking...");

  try {
    // 1) Load env
    const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "activity-images";

    // 2) Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 3) Fetch all rows in categories (or whichever table)
    const { data: allRows, error: fetchError } = await supabase
      .from("categories")
      .select("*");

    if (fetchError) {
      debugLogs.push(`Error fetching rows: ${fetchError.message}`);
      return res.status(500).json({ debugLogs });
    }

    if (!allRows || allRows.length === 0) {
      debugLogs.push("No rows found, nothing to process.");
      return res.status(200).json({ debugLogs });
    }
    debugLogs.push(`Found ${allRows.length} rows total.`);

    // 4) Chunk the rows
    for (let i = 0; i < allRows.length; i += CHUNK_SIZE) {
      const chunk = allRows.slice(i, i + CHUNK_SIZE);
      debugLogs.push(`Processing chunk of size: ${chunk.length} (rows ${i+1} through ${i+chunk.length}).`);

      // For each row in this chunk
      for (const row of chunk) {
        // ... do your Pexels fetch, upload, update logic ...
        // (omitted here for brevity—use your existing code)

        debugLogs.push(`Processed row ID: ${row.id}`);
      }
    }

    debugLogs.push("All chunks processed. Done!");
    return res.status(200).json({ debugLogs });
  } catch (err) {
    debugLogs.push(`General error: ${err.message}`);
    return res.status(500).json({ debugLogs });
  }
}
