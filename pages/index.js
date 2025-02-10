import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// 1. Create Supabase client from environment variables:
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  // 2. State for each table + error message
  const [categories, setCategories] = useState([]);
  const [places, setPlaces] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);

  // 3. Fetch data from multiple tables in parallel
  useEffect(() => {
    const fetchMultipleTables = async () => {
      try {
        const [categoriesRes, placesRes, subcategoriesRes] = await Promise.all([
          supabase.from("categories").select("*"),
          supabase.from("places").select("*"),
          supabase.from("subcategories").select("*"),
        ]);

        // Check for errors in each response
        if (categoriesRes.error) throw categoriesRes.error;
        if (placesRes.error) throw placesRes.error;
        if (subcategoriesRes.error) throw subcategoriesRes.error;

        // Set state
        setCategories(categoriesRes.data || []);
        setPlaces(placesRes.data || []);
        setSubcategories(subcategoriesRes.data || []);
      } catch (error) {
        setErrorMsg(error.message);
      }
    };

    fetchMultipleTables();
  }, []);

  // 4. Render the data or show errors/loading
  return (
    <div style={{ padding: "20px" }}>
      <h1>Welcome to Swipe5!</h1>

      {errorMsg && <p style={{ color: "red" }}>Error: {errorMsg}</p>}

      <h2>Categories</h2>
      {categories.length > 0 ? (
        <pre>{JSON.stringify(categories, null, 2)}</pre>
      ) : (
        <p>Loading categories...</p>
      )}

      <h2>Places</h2>
      {places.length > 0 ? (
        <pre>{JSON.stringify(places, null, 2)}</pre>
      ) : (
        <p>Loading places...</p>
      )}

      <h2>Subcategories</h2>
      {subcategories.length > 0 ? (
        <pre>{JSON.stringify(subcategories, null, 2)}</pre>
      ) : (
        <p>Loading subcategories...</p>
      )}
    </div>
  );
}
