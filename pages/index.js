import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client securely using environment variables
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [selectedPath, setSelectedPath] = useState([]);
  const [currentSelection, setCurrentSelection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Fetch categories when the component mounts
      const fetchCategories = async () => {
        setLoading(true);
        const { data, error } = await supabase.from("categories").select("*");
        if (error) {
          setErrorMessage("Failed to load categories.");
          console.error("Error fetching categories:", error);
        } else {
          setCategories(data);
          setCurrentSelection(data[0]); // Show first category initially
        }
        setLoading(false);
      };
      fetchCategories();
    }
  }, []);

  // Handle "Yes" selection (Drill Down)
  const handleYes = async () => {
    if (!currentSelection) return;

    setSelectedPath((prev) => [...prev, currentSelection]);

    const { data: subcategories, error } = await supabase
      .from("categories")
      .select("*")
      .eq("parent_id", currentSelection.id);

    if (error) {
      console.error("Error fetching subcategories:", error);
    } else if (subcategories.length > 0) {
      setCategories(subcategories);
      setCurrentSelection(subcategories[0]); // Show first subcategory
    } else {
      const { data: places, error: placesError } = await supabase
        .from("places")
        .select("*")
        .eq("category_id", currentSelection.id);

      if (placesError) {
        console.error("Error fetching places:", placesError);
      } else {
        setCategories(places);
        setCurrentSelection(places[0]); // Show first place if no subcategories
      }
    }
  };

  // Handle "No" selection (Skip to next category)
  const handleNo = () => {
    const currentIndex = categories.findIndex((c) => c.id === currentSelection.id);
    if (currentIndex < categories.length - 1) {
      setCurrentSelection(categories[currentIndex + 1]); // Move to next category
    } else {
      setErrorMessage("No more options available.");
    }
  };

  // Handle "Go Back" action
  const handleGoBack = () => {
    if (selectedPath.length > 0) {
      const prevSelection = selectedPath[selectedPath.length - 1];
      setSelectedPath((prev) => prev.slice(0, -1));
      setCurrentSelection(prevSelection);
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center p-4">
      {/* Breadcrumb Navigation */}
      <div className="text-left w-full max-w-md mb-2">
        {selectedPath.length > 0 && (
          <p className="text-gray-600 text-sm">
            {selectedPath.map((p, index) => (
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
          disabled={selectedPath.length === 0}
        >
          Go Back
        </button>
      </div>

      {/* Error Message */}
      {errorMessage && <p className="text-red-500 mt-4">{errorMessage}</p>}
    </div>
  );
}
