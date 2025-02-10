import axios from "axios";
import { createClient } from "@supabase/supabase-js";

const TABLES_TO_UPDATE = [
  "categories",
  "food_categories",
  "neighborhoods",
  "place_food_categories",
  "place_subcategories",
  "reviews",
  "subcategories"
  // no "places"
];

// How many rows to process per chunk
const CHUNK_SIZE = 10;

export default async function handler(req, res) {
  const debugLogs = [];
  debugLogs.push("Starting /api/fetch-chunked-images route...");

  try {
    // Load environment variables
    const PEXELS_API_KEY = process.env.PEXELS_API_KEY; // or process.env.NEXT_PUBLIC_PEXELS_API_KEY
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "activity-images";

    debugLogs.push(`ENV - PEXELS_API_KEY: ${PEXELS_API_KEY ? "FOUND" : "NOT FOUND"}`);
    debugLogs.push(`ENV - NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL || "NOT FOUND"}`);
    debugLogs.push(`ENV - NEXT_PUBLIC_SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? "FOUND" : "NOT FOUND"}`);
    debugLogs.push(`ENV - SUPABASE_BUCKET: ${SUPABASE_BUCKET}`);

    if (!PEXELS_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      debugLogs.push("ERROR: Missing required environment vars!");
      return res.status(500).json({ error: "Missing environment vars", debugLogs });
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    debugLogs.push("Supabase client created.");

    // Helper function to fetch image URL from Pexels
    async function fetchImageUrlFromPexels(query) {
      debugLogs.push(`Pexels search: "${query}"`);
      const response = await axios.get("https://api.pexels.com/v1/search", {
        headers: { Authorization: PEXELS_API_KEY },
        params: { query, per_page: 5 } // smaller fetch to save time
      });
      const { photos } = response.data;
      if (!photos || photos.length === 0) {
        debugLogs.push("No Pexels results.");
        return null;
      }
      const randomIndex = Math.floor(Math.random() * photos.length);
      const photo = photos[randomIndex];
      return photo.src.large || photo.src.original;
    }

    // Process each table
    for (const tableName of TABLES_TO_UPDATE) {
      debugLogs.push(`\n=== Processing table "${tableName}" ===`);

      // 1) Fetch all rows
      const { data: allRows, error: fetchError } = await supabase
        .from(tableName)
        .select("*");

      if (fetchError) {
        debugLogs.push(`Error fetching "${tableName}": ${fetchError.message}`);
        continue;
      }
      if (!allRows || allRows.length === 0) {
        debugLogs.push(`No rows found in "${tableName}". Skipping.`);
        continue;
      }

      debugLogs.push(`Found ${allRows.length} rows in "${tableName}".`);

      // 2) Chunk the rows (avoid timeouts by processing smaller sets)
      for (let i = 0; i < allRows.length; i += CHUNK_SIZE) {
        const chunk = allRows.slice(i, i + CHUNK_SIZE);
        debugLogs.push(`Processing chunk of size ${chunk.length} (rows ${i+1} to ${i+chunk.length}).`);

        // 3) For each row in this chunk
        for (const row of chunk) {
          const rowId = row.id ?? "???";
          const rowName = row.name || "Untitled";

          // If no name, skip
          if (!rowName.trim()) {
            debugLogs.push(`Row ${rowId} has no "name". Skipping.`);
            continue;
          }
          debugLogs.push(`Row ID:${rowId}, Name:"${rowName}"`);

          // A) Fetch from Pexels
          const imageUrl = await fetchImageUrlFromPexels(rowName.trim());
          if (!imageUrl) {
            debugLogs.push(`No image returned for row ID:${rowId}. Skipping.`);
            continue;
          }

          // B) Download the image
          let fileBuffer;
          try {
            const imgResp = await axios.get(imageUrl, { responseType: "arraybuffer" });
            fileBuffer = Buffer.from(imgResp.data, "binary");
            debugLogs.push("Image downloaded successfully.");
          } catch (err) {
            debugLogs.push(`Error downloading image: ${err.message}`);
            continue;
          }

          // C) Construct a subfolder: e.g. "food_categories/burgers_12.jpg"
          const safeName = rowName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
          const remoteFileName = `${tableName}/${safeName}_${rowId}.jpg`;
          debugLogs.push(`Uploading to: ${SUPABASE_BUCKET}/${remoteFileName}`);

          // D) Upload to Supabase
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

          // E) Construct the public URL
          const publicUrl = `${SUPABASE_URL.replace(".co", ".co/storage/v1/object/public")}/${SUPABASE_BUCKET}/${remoteFileName}`;
          debugLogs.push(`Public URL: ${publicUrl}`);

          // F) Update table's image_url
          const { error: updateError } = await supabase
            .from(tableName)
            .update({ image_url: publicUrl })
            .eq("id", rowId);

          if (updateError) {
            debugLogs.push(`DB update error for row ID:${rowId}: ${updateError.message}`);
            continue;
          }

          debugLogs.push(`Updated row ID:${rowId} => ${publicUrl}`);
        }
      }
    }

    debugLogs.push("\nAll done—no 504 hopefully!");
    return res.status(200).json({ debugLogs });

  } catch (err) {
    debugLogs.push(`General error: ${err.message}`);
    return res.status(500).json({ debugLogs });
  }
}
