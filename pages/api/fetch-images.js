import axios from "axios";
import { createClient } from "@supabase/supabase-js";

/**
 * A Next.js API route that forcibly refetches images for multiple tables.
 * 
 * 1) Loops over each table in TABLES_TO_UPDATE.
 * 2) For each row, ignores any existing image_url and fetches a NEW image from Pexels.
 * 3) Uploads that image to Supabase Storage.
 * 4) Overwrites the row's image_url with the new link.
 * 
 * REQUIRED environment vars (set in Vercel):
 *  - PEXELS_API_KEY
 *  - SUPABASE_URL
 *  - SUPABASE_ANON_KEY
 *  (optional) SUPABASE_BUCKET => defaults to 'public-images'
 * 
 * Endpoint usage:
 *   GET https://<your-app>.vercel.app/api/refetch-images
 * 
 * NOTE: If you have many rows or large tables, you could hit timeouts (~10s limit on Vercel).
 *       In that case, consider splitting or limiting the script.
 */

export default async function handler(req, res) {
  try {
    // Load env vars from Vercel
    const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
    const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "public-images";

    if (!PEXELS_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return res.status(500).json({
        error: "Missing required env vars (PEXELS_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY)."
      });
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Define which tables to update (excluding 'places')
    // NOTE: Make sure each table has:
    //   - a 'name' column (or adjust 'row.name' usage)
    //   - an 'image_url' column to overwrite
    const TABLES_TO_UPDATE = [
      "categories",
      "food_categories",
      "neighborhoods",
      "place_food_categories",
      "place_subcategories",
      "reviews",
      "subcategories"
      // 'places' is intentionally NOT included
    ];

    // Helper function to fetch 1 random image URL from Pexels for a given query
    async function fetchImageUrlFromPexels(query) {
      const response = await axios.get("https://api.pexels.com/v1/search", {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
        params: {
          query,
          per_page: 10
        },
      });

      const { photos } = response.data;
      if (!photos || photos.length === 0) {
        return null;
      }
      // pick a random one
      const randomIndex = Math.floor(Math.random() * photos.length);
      const photo = photos[randomIndex];
      return photo.src.large || photo.src.original;
    }

    // We'll store logs for each table
    let overallResults = [];

    // Process each table in TABLES_TO_UPDATE
    for (const tableName of TABLES_TO_UPDATE) {
      let tableLog = [`\n=== Table: ${tableName} ===`];

      // 1) Fetch all rows (no filter, forcibly refetch means ignoring existing image_url)
      const { data: rows, error: fetchError } = await supabase
        .from(tableName)
        .select("*"); // selects all columns

      if (fetchError) {
        tableLog.push(`Error fetching rows: ${fetchError.message}`);
        overallResults.push(...tableLog);
        continue; 
      }
      if (!rows || rows.length === 0) {
        tableLog.push("No rows found.");
        overallResults.push(...tableLog);
        continue;
      }

      // 2) For each row in this table
      for (const row of rows) {
        // We'll assume the row has a 'name' column. If not, change this to something else, e.g. row.title
        const rowName = row.name || "Untitled";
        const rowId = row.id; // or another unique identifier

        // A) Fetch a new image from Pexels (based on the row's name, or fallback if empty)
        const queryTerm = rowName.trim() || "Generic photo";
        let pexelsUrl;
        try {
          pexelsUrl = await fetchImageUrlFromPexels(queryTerm);
        } catch (err) {
          tableLog.push(`Row ID:${rowId} - Pexels fetch error: ${err.message}`);
          continue;
        }

        if (!pexelsUrl) {
          tableLog.push(`Row ID:${rowId} - No images found for query "${queryTerm}".`);
          continue;
        }

        try {
          // B) Download the image data
          const imageResponse = await axios.get(pexelsUrl, {
            responseType: "arraybuffer"
          });
          const fileBuffer = Buffer.from(imageResponse.data, "binary");

          // C) Construct a remote file name for your bucket
          //    e.g. "food_categories/food__dining.jpg"
          const safeName = rowName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
          const remoteFileName = `${tableName}/${safeName}_${rowId}.jpg`;

          // D) Upload to Supabase Storage (upsert: true to overwrite)
          const { data, error } = await supabase.storage
            .from(SUPABASE_BUCKET)
            .upload(remoteFileName, fileBuffer, {
              contentType: "image/jpeg",
              upsert: true
            });

          if (error) {
            tableLog.push(`Row ID:${rowId} - Upload error: ${error.message}`);
            continue;
          }

          // E) Build the public URL
          const publicUrl = `${SUPABASE_URL.replace(".co", ".co/storage/v1/object/public")}/${SUPABASE_BUCKET}/${remoteFileName}`;

          // F) Update the row's image_url
          const { error: updateError } = await supabase
            .from(tableName)
            .update({ image_url: publicUrl })
            .eq("id", rowId);

          if (updateError) {
            tableLog.push(`Row ID:${rowId} - Update error: ${updateError.message}`);
            continue;
          }

          tableLog.push(`Row ID:${rowId} - ${rowName} => ${publicUrl}`);
        } catch (err) {
          tableLog.push(`Row ID:${rowId} - General error: ${err.message}`);
        }
      }

      overallResults.push(...tableLog);
    }

    // Return combined logs
    return res.status(200).json({ logs: overallResults });

  } catch (err) {
    console.error("API general error:", err);
    return res.status(500).json({ error: err.message });
  }
}
