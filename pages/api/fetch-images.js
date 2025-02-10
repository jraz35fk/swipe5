import axios from "axios";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const debugLogs = [];
  debugLogs.push("Starting /api/fetch-all-images route...");

  try {
    // Read environment vars
    const PEXELS_API_KEY = process.env.PEXELS_API_KEY; // or process.env.NEXT_PUBLIC_PEXELS_API_KEY
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "activity-images";

    debugLogs.push(`ENV - PEXELS_API_KEY: ${PEXELS_API_KEY ? "FOUND" : "NOT FOUND"}`);
    debugLogs.push(`ENV - NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL || "NOT FOUND"}`);
    debugLogs.push(`ENV - NEXT_PUBLIC_SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? "FOUND" : "NOT FOUND"}`);
    debugLogs.push(`ENV - SUPABASE_BUCKET: ${SUPABASE_BUCKET}`);

    if (!PEXELS_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      debugLogs.push("Missing required environment variables!");
      return res.status(500).json({ error: "Missing required env vars", debugLogs });
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    debugLogs.push("Supabase client created.");

    // The tables you want to process (all except "places")
    // Make sure each has a "name" column and an "image_url" column
    const TABLES_TO_UPDATE = [
      "categories",
      "food_categories",
      "neighborhoods",
      "place_food_categories",
      "place_subcategories",
      "reviews",
      "subcategories"
      // do not include "places"
    ];
    debugLogs.push(`Tables to update: ${TABLES_TO_UPDATE.join(", ")}`);

    // Helper: fetch a random image from Pexels
    async function fetchImageUrlFromPexels(query) {
      debugLogs.push(`Pexels search: "${query}"`);
      const response = await axios.get("https://api.pexels.com/v1/search", {
        headers: { Authorization: PEXELS_API_KEY },
        params: { query, per_page: 10 }
      });
      const { photos } = response.data;
      if (!photos || photos.length === 0) {
        debugLogs.push("No photos found on Pexels.");
        return null;
      }
      const rand = Math.floor(Math.random() * photos.length);
      const photo = photos[rand];
      return photo.src.large || photo.src.original;
    }

    // Loop each table
    for (const tableName of TABLES_TO_UPDATE) {
      debugLogs.push(`\n=== Processing table: "${tableName}" ===`);

      // Fetch all rows
      const { data: rows, error: fetchErr } = await supabase
        .from(tableName)
        .select("*");

      if (fetchErr) {
        debugLogs.push(`Error fetching from "${tableName}": ${fetchErr.message}`);
        continue;
      }
      if (!rows || rows.length === 0) {
        debugLogs.push(`No rows in "${tableName}". Skipping.`);
        continue;
      }
      debugLogs.push(`Found ${rows.length} rows in "${tableName}".`);

      // For each row, do Pexels -> Upload -> Update
      for (const row of rows) {
        const rowId = row.id ?? "???";
        const rowName = row.name || "Untitled";
        debugLogs.push(`Row ID:${rowId}, Name:"${rowName}"`);

        // If there's no name, skip
        if (!rowName || rowName.trim().length === 0) {
          debugLogs.push("Row has no 'name'. Skipping.");
          continue;
        }

        // Fetch from Pexels
        const queryTerm = rowName.trim() || "Generic photo";
        let pexelsUrl = await fetchImageUrlFromPexels(queryTerm);
        if (!pexelsUrl) {
          debugLogs.push("No Pexels result. Skipping.");
          continue;
        }

        // Download
        let fileBuffer;
        try {
          const imgResp = await axios.get(pexelsUrl, { responseType: "arraybuffer" });
          fileBuffer = Buffer.from(imgResp.data, "binary");
          debugLogs.push("Image downloaded successfully.");
        } catch (err) {
          debugLogs.push(`Error downloading image: ${err.message}`);
          continue;
        }

        // Construct subfolder path => e.g. "activity-images/subcategories/sushi_24.jpg"
        const safeName = rowName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
        const remoteFileName = `${tableName}/${safeName}_${rowId}.jpg`;

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

        // Update the row's image_url
        const { error: updateError } = await supabase
          .from(tableName)
          .update({ image_url: publicUrl })
          .eq("id", rowId);

        if (updateError) {
          debugLogs.push(`DB update error: ${updateError.message}`);
          continue;
        }
        debugLogs.push(`Updated row ID:${rowId} => ${publicUrl}`);
      }
    }

    debugLogs.push("All done!");
    return res.status(200).json({ debugLogs });

  } catch (err) {
    debugLogs.push(`General error: ${err.message}`);
    return res.status(500).json({ error: err.message, debugLogs });
  }
}
