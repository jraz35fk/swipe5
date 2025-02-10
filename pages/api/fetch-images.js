import axios from "axios";
import { createClient } from "@supabase/supabase-js";

/**
 * API Route: /api/refetch-images
 * --------------------------------
 * This route forcibly refetches images for certain tables (EXCEPT "places")
 * and overwrites their existing image_url. It logs each step so you can
 * see exactly what might be failing.
 */

export default async function handler(req, res) {
  // We'll store logs in an array so we can return them at the end:
  const debugLogs = [];

  try {
    debugLogs.push("Starting /api/refetch-images route...");

    // Step 1: Check environment variables
    const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
    const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "public-images";

    debugLogs.push(`ENV - PEXELS_API_KEY: ${PEXELS_API_KEY ? "FOUND" : "NOT FOUND"}`);
    debugLogs.push(`ENV - SUPABASE_URL: ${SUPABASE_URL ? SUPABASE_URL : "NOT FOUND"}`);
    debugLogs.push(`ENV - SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? "FOUND" : "NOT FOUND"}`);
    debugLogs.push(`ENV - SUPABASE_BUCKET: ${SUPABASE_BUCKET}`);

    if (!PEXELS_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      debugLogs.push("ERROR: Missing required environment variables!");
      return res.status(500).json({
        error: "Missing required environment variables.",
        debugLogs
      });
    }

    // Step 2: Create Supabase client
    let supabase;
    try {
      supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      debugLogs.push("Supabase client created successfully.");
    } catch (err) {
      debugLogs.push(`ERROR creating Supabase client: ${err.message}`);
      return res.status(500).json({ error: err.message, debugLogs });
    }

    // Step 3: Define which tables to update (excluding 'places')
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

    // Helper to fetch a random image URL from Pexels
    async function fetchImageUrlFromPexels(query) {
      debugLogs.push(`Pexels search query: "${query}"`);
      try {
        const response = await axios.get("https://api.pexels.com/v1/search", {
          headers: { Authorization: PEXELS_API_KEY },
          params: { query, per_page: 10 }
        });
        const { photos } = response.data;
        if (!photos || photos.length === 0) {
          debugLogs.push(`No Pexels results for "${query}".`);
          return null;
        }
        // pick a random
        const randomIndex = Math.floor(Math.random() * photos.length);
        const photo = photos[randomIndex];
        debugLogs.push(`Pexels returned an image: ${photo.src.large || photo.src.original}`);
        return photo.src.large || photo.src.original;
      } catch (err) {
        debugLogs.push(`ERROR fetching from Pexels: ${err.message}`);
        return null;
      }
    }

    // We'll accumulate results for each table
    let overallResults = [];

    // Step 4: Loop over each table
    for (const tableName of TABLES_TO_UPDATE) {
      debugLogs.push(`\n=== Processing table "${tableName}" ===`);
      // (A) Fetch all rows from this table
      const { data: rows, error: fetchError } = await supabase
        .from(tableName)
        .select("*");

      if (fetchError) {
        debugLogs.push(`ERROR fetching from table "${tableName}": ${fetchError.message}`);
        continue; // move to next table
      }

      if (!rows || rows.length === 0) {
        debugLogs.push(`No rows found in table "${tableName}".`);
        continue; // no rows to update
      }

      // (B) Process each row
      for (const row of rows) {
        const rowId = row.id ?? "UnknownID";
        // If your table doesn't have a "name" column, adapt this code
        const rowName = row.name || "Untitled";
        debugLogs.push(`\nRow ID: ${rowId}, Name: "${rowName}"`);

        // i. Fetch random image from Pexels
        const queryTerm = rowName.trim() || "Generic photo";
        const pexelsUrl = await fetchImageUrlFromPexels(queryTerm);

        if (!pexelsUrl) {
          debugLogs.push(`No image found for Row ID:${rowId} - skipping.`);
          continue;
        }

        // ii. Download the image data
        let fileBuffer;
        try {
          const imageResponse = await axios.get(pexelsUrl, { responseType: "arraybuffer" });
          fileBuffer = Buffer.from(imageResponse.data, "binary");
          debugLogs.push(`Downloaded image data for Row ID:${rowId}.`);
        } catch (err) {
          debugLogs.push(`ERROR downloading image for Row ID:${rowId}: ${err.message}`);
          continue;
        }

        // iii. Construct a remote file name
        const safeName = rowName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
        const remoteFileName = `${tableName}/${safeName}_${rowId}.jpg`;
        debugLogs.push(`Remote file name: ${remoteFileName}`);

        // iv. Upload to Supabase Storage
        try {
          const { data, error } = await supabase.storage
            .from(SUPABASE_BUCKET)
            .upload(remoteFileName, fileBuffer, {
              contentType: "image/jpeg",
              upsert: true
            });

          if (error) {
            debugLogs.push(`Upload error (Row ID:${rowId}): ${error.message}`);
            continue;
          }
          debugLogs.push(`Successfully uploaded to ${SUPABASE_BUCKET}/${remoteFileName}`);
        } catch (err) {
          debugLogs.push(`ERROR uploading file to Supabase (Row ID:${rowId}): ${err.message}`);
          continue;
        }

        // v. Construct the public URL
        const publicUrl = `${SUPABASE_URL.replace(".co", ".co/storage/v1/object/public")}/${SUPABASE_BUCKET}/${remoteFileName}`;
        debugLogs.push(`Public URL: ${publicUrl}`);

        // vi. Update the row's image_url
        try {
          const { error: updateError } = await supabase
            .from(tableName)
            .update({ image_url: publicUrl })
            .eq("id", rowId);

          if (updateError) {
            debugLogs.push(`DB update error (Row ID:${rowId}): ${updateError.message}`);
            continue;
          }
          debugLogs.push(`Row ID:${rowId} updated with image_url: ${publicUrl}`);
        } catch (err) {
          debugLogs.push(`ERROR updating DB row ID:${rowId}: ${err.message}`);
        }
      }
    }

    debugLogs.push("\nAll tables processed. Check above logs for details.");
    // Return debug logs
    return res.status(200).json({ debugLogs });

  } catch (err) {
    const message = `General error in /api/refetch-images: ${err.message}`;
    console.error(message);
    debugLogs.push(message);
    return res.status(500).json({ error: err.message, debugLogs });
  }
}
