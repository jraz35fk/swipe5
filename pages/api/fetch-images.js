import axios from "axios";
import { createClient } from "@supabase/supabase-js";

/**
 * This endpoint does the following:
 * 1. Fetches your list of categories from Supabase (any row missing or wanting a new image).
 * 2. For each category, queries Pexels for an image (based on its 'name' or fallback).
 * 3. Uploads that image to your Supabase Storage bucket.
 * 4. Updates the category's image_url with the new public URL.
 * 
 * NOTE: This can be adapted for subcategories, places, etc. 
 *       Just change the table name and column references.
 */

export default async function handler(req, res) {
  try {
    // 1) Read environment variables (Vercel provides them at build/runtime)
    const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
    const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "public-images"; // fallback bucket name

    // If any are missing, throw an error
    if (!PEXELS_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return res.status(500).json({
        error: "Missing required environment variables (PEXELS_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY)."
      });
    }

    // 2) Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 3) Fetch the categories from your table
    //    Feel free to adjust this query. 
    //    Example: only fetch categories that have a NULL or empty image_url.
    const { data: categories, error: fetchError } = await supabase
      .from("categories")
      .select("*")
      .or("image_url.is.null,image_url.eq.''");

    if (fetchError) {
      return res.status(500).json({ error: fetchError.message });
    }

    if (!categories || categories.length === 0) {
      // No categories need images
      return res.status(200).json({ message: "No categories found that need images." });
    }

    // Helper function: search Pexels for an image related to "categoryName"
    async function fetchImageUrlFromPexels(categoryName) {
      // If the category name is something like "Food & Dining", we can just pass that as a query
      // or maybe a fallback query if categoryName is empty
      const query = categoryName.trim() || "Fun activity";

      try {
        const response = await axios.get("https://api.pexels.com/v1/search", {
          headers: {
            Authorization: PEXELS_API_KEY,
          },
          params: {
            query,
            per_page: 10, // how many to fetch
          },
        });

        const { photos } = response.data;
        if (!photos || photos.length === 0) {
          // no result
          return null;
        }
        // pick a random photo from the results
        const randomIndex = Math.floor(Math.random() * photos.length);
        const photo = photos[randomIndex];
        return photo.src.large || photo.src.original;
      } catch (err) {
        console.error("Pexels fetch error:", err.message);
        return null;
      }
    }

    // We'll store results messages
    let results = [];

    // 4) For each category row, fetch an image and upload
    for (const cat of categories) {
      const catName = cat.name || "Unknown Category";
      console.log(`Processing category: ${catName}`);

      // A) Fetch an image from Pexels
      const pexelsUrl = await fetchImageUrlFromPexels(catName);
      if (!pexelsUrl) {
        results.push(`No images found for "${catName}". Skipped.`);
        continue;
      }

      try {
        // B) Download the actual image data
        const imageResponse = await axios.get(pexelsUrl, { responseType: "arraybuffer" });
        const fileBuffer = Buffer.from(imageResponse.data, "binary");

        // C) Construct a remote filename (like "categories/food_dining.jpg")
        const safeName = catName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
        const remoteFileName = `categories/${safeName}.jpg`;

        // D) Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from(SUPABASE_BUCKET)
          .upload(remoteFileName, fileBuffer, {
            contentType: "image/jpeg",
            upsert: true
          });

        if (error) {
          // upload error
          results.push(`Failed upload for "${catName}": ${error.message}`);
          continue;
        }

        // E) Construct the public URL to that file
        const publicUrl = `${SUPABASE_URL.replace(".co", ".co/storage/v1/object/public")}/${SUPABASE_BUCKET}/${remoteFileName}`;

        // F) Update the categories table with the new URL
        const { error: updateError } = await supabase
          .from("categories")
          .update({ image_url: publicUrl })
          .eq("id", cat.id); // or .eq("name", catName)

        if (updateError) {
          results.push(`Failed DB update for "${catName}": ${updateError.message}`);
          continue;
        }

        results.push(`Updated "${catName}" => ${publicUrl}`);
      } catch (err) {
        results.push(`Error processing "${catName}": ${err.message}`);
      }
    }

    // 5) Return the results
    return res.status(200).json({ results });
  } catch (err) {
    console.error("General error in fetch-images API:", err);
    return res.status(500).json({ error: err.message });
  }
}
