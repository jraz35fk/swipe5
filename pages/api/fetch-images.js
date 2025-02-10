import axios from "axios";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const debugLogs = [];

  try {
    debugLogs.push("Starting /api/fetch-images route...");

    // Use your NEXT_PUBLIC_ variables:
    const PEXELS_API_KEY = process.env.PEXELS_API_KEY; // If you also named your Pexels key with NEXT_PUBLIC, switch here too.
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "public-images";

    debugLogs.push(`ENV - PEXELS_API_KEY: ${PEXELS_API_KEY ? "FOUND" : "NOT FOUND"}`);
    debugLogs.push(`ENV - NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL ? SUPABASE_URL : "NOT FOUND"}`);
    debugLogs.push(`ENV - NEXT_PUBLIC_SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? "FOUND" : "NOT FOUND"}`);
    debugLogs.push(`ENV - SUPABASE_BUCKET: ${SUPABASE_BUCKET}`);

    // If they're missing, return an error
    if (!PEXELS_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      debugLogs.push("ERROR: Missing required environment variables!");
      return res.status(500).json({
        error: "Missing required environment variables.",
        debugLogs
      });
    }

    // Create Supabase client
    let supabase;
    try {
      supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      debugLogs.push("Supabase client created successfully.");
    } catch (err) {
      debugLogs.push(`ERROR creating Supabase client: ${err.message}`);
      return res.status(500).json({ error: err.message, debugLogs });
    }

    // For demo, let's just do one table: "categories"
    debugLogs.push("Fetching all rows from 'categories'...");
    const { data: rows, error: fetchError } = await supabase
      .from("categories")
      .select("*");

    if (fetchError) {
      debugLogs.push(`ERROR fetching from categories: ${fetchError.message}`);
      return res.status(500).json({ error: fetchError.message, debugLogs });
    }

    if (!rows || rows.length === 0) {
      debugLogs.push("No rows found in 'categories'.");
      return res.status(200).json({ debugLogs });
    }

    debugLogs.push(`Found ${rows.length} rows in 'categories'.`);

    // For each row, do Pexels logic, etc.
    for (const row of rows) {
      const rowId = row.id ?? "UnknownID";
      const rowName = row.name || "Untitled";
      debugLogs.push(`Row ID: ${rowId}, Name: "${rowName}"`);

      // Pexels search
      let query = rowName.trim() || "Random photo";
      debugLogs.push(`Searching Pexels for: "${query}"`);
      let pexelsUrl;
      try {
        const resp = await axios.get("https://api.pexels.com/v1/search", {
          headers: { Authorization: PEXELS_API_KEY },
          params: { query, per_page: 5 }
        });
        const { photos } = resp.data;
        if (!photos || photos.length === 0) {
          debugLogs.push("No photos found.");
          continue;
        }
        const randomIndex = Math.floor(Math.random() * photos.length);
        pexelsUrl = photos[randomIndex].src.large || photos[randomIndex].src.original;
        debugLogs.push(`Pexels gave us: ${pexelsUrl}`);
      } catch (err) {
        debugLogs.push(`Error calling Pexels: ${err.message}`);
        continue;
      }

      // Download
      if (!pexelsUrl) continue;
      let fileBuffer;
      try {
        const imageResp = await axios.get(pexelsUrl, { responseType: "arraybuffer" });
        fileBuffer = Buffer.from(imageResp.data, "binary");
        debugLogs.push("Image downloaded successfully.");
      } catch (err) {
        debugLogs.push(`Error downloading image: ${err.message}`);
        continue;
      }

      // Upload to Supabase
      const safeName = rowName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      const remoteFileName = `categories/${safeName}_${rowId}.jpg`;
      debugLogs.push(`Uploading to: ${SUPABASE_BUCKET}/${remoteFileName}`);
      const { data, error } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(remoteFileName, fileBuffer, {
          contentType: "image/jpeg",
          upsert: true
        });

      if (error) {
        debugLogs.push(`Upload error: ${error.message}`);
        continue;
      }

      // Construct public URL
      const publicUrl = `${SUPABASE_URL.replace(".co", ".co/storage/v1/object/public")}/${SUPABASE_BUCKET}/${remoteFileName}`;
      debugLogs.push(`Public URL: ${publicUrl}`);

      // Update DB
      const { error: updateError } = await supabase
        .from("categories")
        .update({ image_url: publicUrl })
        .eq("id", rowId);

      if (updateError) {
        debugLogs.push(`DB update error: ${updateError.message}`);
        continue;
      }

      debugLogs.push(`Updated row ID:${rowId} => ${publicUrl}`);
    }

    debugLogs.push("All done!");
    return res.status(200).json({ debugLogs });

  } catch (err) {
    debugLogs.push(`General error: ${err.message}`);
    return res.status(500).json({ error: err.message, debugLogs });
  }
}
