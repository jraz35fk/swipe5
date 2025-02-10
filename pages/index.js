import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [activities, setActivities] = useState([]);
  const [selectionPath, setSelectionPath] = useState([]);
  const [currentSelection, setCurrentSelection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // Fetch top-level categories on load
    const fetchCategories = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("ranking_score", { ascending: false });
      
      if (error) {
        setErrorMessage("Failed to load categories.");
        console.error("Error fetching categories:", error);
      } else {
        setCategories(data);
        setCurrentSelection(data[0]);
      }
      setLoading(false);
    };
    fetchCategories();
  }, []);

  // Handle "Yes" selection to drill down further
  const handleYes = async () => {
    if (!currentSelection) return;

    setSelectionPath((prev) => [...prev, currentSelection]);

    const { data: subcategories, error: subcatError } = await supabase
      .from("subcategories")
      .select("*")
      .eq("category_id", currentSelection.id)
      .order("ranking_score", { ascending: false });

    if (subcatError) {
      console.error("Error fetching subcategories:", subcatError);
    } else if (subcategories.length > 0) {
      setSubcategories(subcategories);
      setCurrentSelection(subcategories[0]);
      return;
    }

    // If no subcategories, fetch activities
    const { data: activities, error: actError } = await supabase
      .from("places")
      .select("*")
      .eq("subcategory_id", currentSelection.id)
      .order("ranking_score", { ascending: false });

    if (actError) {
      console.error("Error fetching activities:", actError);
    } else {
      setActivities(activities);
      setCurrentSelection(activities[0]);
    }
  };

  // Handle "No" selection to skip
  const handleNo = () => {
    if (!categories.length || !currentSelection) return;
    const currentIndex = categories.findIndex((c) => c.id === currentSelection.id);
    if (currentIndex < categories.length - 1) {
      setCurrentSelection(categories[currentIndex + 1]);
    } else {
      setErrorMessage("No more options available.");
    }
  };

  // Handle "Go Back"
  const handleGoBack = () => {
    if (selectionPath.length > 0) {
      const prevSelection = selectionPath.pop();
      setSelectionPath([...selectionPath]);
      setCurrentSelection(prevSelection);
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center p-4">
      {/* Breadcrumb Navigation */}
      <div className="text-left w-full max-w-md mb-2">
        {selectionPath.length > 0 && (
          <p className="text-gray-600 text-sm">
            {selectionPath.map((p, index) => (
              <span key={index}>{p.name} &gt; </span>
            ))}
          </p>
        )}
      </div>

      {/* Card Display */}
      <div className="relative w-full max-w-md h-64 flex items-center justify-center bg-gray-100 p-4 rounded-lg shadow-md">
        {loading ? (
          <p>Loading...</p>
        ) : currentSelection ? (
          <h2 className="text-2xl font-semibold">{currentSelection.name}</h2>
        ) : (
          <p className="text-gray-500">No options available.</p>
        )}
      </div>

      {/* Buttons */}
      <div className="flex justify-around w-full max-w-md mt-6">
        <button className="bg-red-500 text-white px-4 py-2 rounded" onClick={handleNo}>
          No
        </button>
        <button className="bg-green-500 text-white px-4 py-2 rounded" onClick={handleYes}>
          Yes
        </button>
        <button
          className="bg-gray-500 text-white px-4 py-2 rounded"
          onClick={handleGoBack}
          disabled={selectionPath.length === 0}
        >
          Go Back
        </button>
      </div>

      {/* Error Message */}
      {errorMessage && <p className="text-red-500 mt-4">{errorMessage}</p>}
    </div>
  );
}
