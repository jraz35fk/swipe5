import axios from "axios";
import { createClient } from "@supabase/supabase-js";

const TABLE_NAME = "neighborhoods";  // We'll fetch images for this table only
const CHUNK_SIZE = 1;               // 1 row at a time
const PEXELS_PER_PAGE = 1;          // only 1 photo from Pexels
const DELAY_MS = 5000;              // 5 seconds delay to reduce 429 errors

export default async function handler(req, res) {
  const debugLogs = [];
  debugLogs.push(`Starting /api/fetch-chunked-images-once route for table "${TABLE_NAME}"`);

  try {
    // 1) Load environment variables
    const PEXELS_API_KEY = process.env.PEXELS_API_KEY; 
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "activity-images";

    debugLogs.push(`ENV - PEXELS_API_KEY: ${PEXELS_API_KEY ? "FOUND" : "NOT FOUND"}`);
    debugLogs.push(`ENV - NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL || "NOT FOUND"}`);
    debugLogs.push(`ENV - NEXT_PUBLIC_SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? "FOUND" : "NOT FOUND"}`);
    debugLogs.push(`ENV - SUPABASE_BUCKET: ${SUPABASE_BUCKET}`);

    if (!PEXELS_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      debugLogs.push("ERROR: Missing required environment variables!");
      return res.status(500).json({
        error: "Missing environment variables",
        debugLogs
      });
    }

    // 2) Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    debugLogs.push("Supabase client created successfully.");

    // Helper function to fetch an image from Pexels
    async function fetchImageUrlFromPexels(query) {
      debugLogs.push(`Pexels search: "${query}", per_page=${PEXELS_PER_PAGE}`);
      const response = await axios.get("https://api.pexels.com/v1/search", {
        headers: { Authorization: PEXELS_API_KEY },
        params: {
          query,
          per_page: PEXELS_PER_PAGE
        }
      });
      const { photos } = response.data;
      if (!photos || photos.length === 0) {
        debugLogs.push("No results from Pexels.");
        return null;
      }
      // Just pick the first photo (since we have only 1)
      const photo = photos[0];
      return photo.src.large || photo.src.original;
    }

    // 3) Fetch all rows from "neighborhoods"
    debugLogs.push(`Fetching rows from table "${TABLE_NAME}"...`);
    const { data: allRows, error: fetchError } = await supabase
      .from(TABLE_NAME)
      .select("*");

    if (fetchError) {
      debugLogs.push(`Error fetching from "${TABLE_NAME}": ${fetchError.message}`);
      return res.status(500).json({ debugLogs });
    }
    if (!allRows || allRows.length === 0) {
      debugLogs.push(`No rows in "${TABLE_NAME}" — skipping.`);
      return res.status(200).json({ debugLogs });
    }
    debugLogs.push(`Found ${allRows.length} rows in "${TABLE_NAME}".`);

    // 4) Chunk the rows: 1 row per iteration
    for (let i = 0; i < allRows.length; i += CHUNK_SIZE) {
      const chunk = allRows.slice(i, i + CHUNK_SIZE);
      debugLogs.push(`Chunk of size: ${chunk.length}, row index ${i + 1}.`);

      // Process each row in this chunk
      for (const row of chunk) {
        const rowId = row.id ?? "???";
        const rowName = row.name || "Untitled";

        // Skip if no name
        if (!rowName.trim()) {
          debugLogs.push(`Row ID:${rowId} has empty 'name'. Skipped.`);
          continue;
        }
        debugLogs.push(`Row ID:${rowId}, Name:"${rowName}"`);

        // i) Call Pexels
        const imageUrl = await fetchImageUrlFromPexels(rowName.trim());
        if (!imageUrl) {
          debugLogs.push(`No Pexels image for row ID:${rowId}. Skipped.`);
          continue;
        }

        // ii) Download the image
        let fileBuffer;
        try {
          const imgResp = await axios.get(imageUrl, { responseType: "arraybuffer" });
          fileBuffer = Buffer.from(imgResp.data, "binary");
          debugLogs.push("Downloaded image successfully.");
        } catch (err) {
          debugLogs.push(`Error downloading image: ${err.message}`);
          continue;
        }

        // iii) Construct a file path => "neighborhoods/safeName_rowId.jpg"
        const safeName = rowName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
        const remoteFileName = `${TABLE_NAME}/${safeName}_${rowId}.jpg`;
        debugLogs.push(`Uploading to: ${SUPABASE_BUCKET}/${remoteFileName}`);

        // iv) Upload to Supabase
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
        debugLogs.push("Uploaded successfully.");

        // v) Construct public URL
        const publicUrl = `${SUPABASE_URL.replace(".co", ".co/storage/v1/object/public")}/${SUPABASE_BUCKET}/${remoteFileName}`;
        debugLogs.push(`Public URL: ${publicUrl}`);

        // vi) Update row's image_url
        const { error: updateError } = await supabase
          .from(TABLE_NAME)
          .update({ image_url: publicUrl })
          .eq("id", rowId);

        if (updateError) {
          debugLogs.push(`DB update error for row ID:${rowId}: ${updateError.message}`);
          continue;
        }
        debugLogs.push(`Updated row ID:${rowId} => ${publicUrl}`);

        // vii) Delay 5 seconds to reduce chance of 429
        debugLogs.push(`Waiting ${DELAY_MS}ms to avoid 429...`);
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
    }

    debugLogs.push(`\nAll done fetching images for "${TABLE_NAME}"!`);
    return res.status(200).json({ debugLogs });

  } catch (err) {
    debugLogs.push(`General error: ${err.message}`);
    return res.status(500).json({ error: err.message, debugLogs });
  }
}
