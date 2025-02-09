import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  const [stack, setStack] = useState([]); // Tracks selected categories/subcategories
  const [options, setOptions] = useState([]); // Current options being displayed
  const [selectedTags, setSelectedTags] = useState([]); // Tracks selected tags for prioritization
  const [likedPlaces, setLikedPlaces] = useState([]); // Final selections
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Fetch top-level categories on load
    const fetchCategories = async () => {
      setLoading(true);
      setErrorMessage('');
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .is('parent_id', null)
        .order('ranking_score', { ascending: false });

      setLoading(false);
      if (error) {
        setErrorMessage('Failed to load categories.');
        console.error('Error fetching categories:', error);
      } else {
        setOptions(data.slice(0, 2)); // Show first 2 options
      }
    };
    fetchCategories();
  }, []);

  // Handles Yes selection (move deeper into the category)
  const handleYes = async (selectedItem) => {
    const { type, id } = selectedItem;
    let newTags = [...selectedTags, selectedItem.name];

    if (type !== 'place') {
      // Fetch subcategories or places based on current selection
      const { data: subcategories, error } = await supabase
        .from('categories')
        .select('*')
        .eq('parent_id', id)
        .order('ranking_score', { ascending: false });

      if (error) {
        console.error('Error fetching subcategories:', error);
        return;
      }

      if (subcategories.length > 0) {
        setStack((prev) => [...prev, selectedItem]);
        setOptions(subcategories.slice(0, 2));
      } else {
        // No subcategories → fetch places
        const { data: places, error: placesError } = await supabase
          .from('places')
          .select('*')
          .eq('category_id', id)
          .order('ranking_score', { ascending: false });

        if (placesError) {
          console.error('Error fetching places:', placesError);
          return;
        }

        setStack((prev) => [...prev, selectedItem]);
        setOptions(places.slice(0, 2));
      }
    } else {
      // User selects a place → Add to liked places
      setLikedPlaces((prev) => [...prev, selectedItem]);
      setOptions((prev) => prev.slice(1)); // Remove selected place from options
    }
    setSelectedTags(newTags);
  };

  // Handles No selection (replace the option with another one)
  const handleNo = async (rejectedItem) => {
    const nextOptionIndex = options.length; // Find next available item index
    let newOptions = [...options];

    const { type, id } = rejectedItem;

    if (type !== 'place') {
      const { data: subcategories, error } = await supabase
        .from('categories')
        .select('*')
        .eq('parent_id', id)
        .order('ranking_score', { ascending: false });

      if (error) {
        console.error('Error fetching subcategories:', error);
        return;
      }

      if (subcategories.length > 0) {
        newOptions[nextOptionIndex] = subcategories[0]; // Replace with first available subcategory
      } else {
        const { data: places, error: placesError } = await supabase
          .from('places')
          .select('*')
          .eq('category_id', id)
          .order('ranking_score', { ascending: false });

        if (placesError) {
          console.error('Error fetching places:', placesError);
          return;
        }

        if (places.length > 0) {
          newOptions[nextOptionIndex] = places[0]; // Replace with first available place
        }
      }
    } else {
      // If rejecting a place, just remove it
      newOptions = newOptions.filter((place) => place.id !== rejectedItem.id);
    }

    setOptions(newOptions.slice(0, 2)); // Ensure only 2 options at a time
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center p-4">
      {/* Navigation buttons */}
      <div className="flex justify-between w-full max-w-md mb-4">
        <button
          className="bg-gray-200 px-4 py-2 rounded"
          onClick={() => window.location.reload()}
        >
          Start Over
        </button>
      </div>

      {/* Display two cards at a time */}
      <div className="relative w-full max-w-md h-64">
        {options.map((option, index) => (
          <div
            key={option.id}
            className={`absolute inset-0 bg-white p-4 rounded-xl shadow-lg flex flex-col items-center justify-center text-center ${
              index === 1 ? 'translate-y-6 scale-95 opacity-80' : ''
            }`}
          >
            <h2 className="text-2xl font-semibold">{option.name}</h2>
            <div className="flex justify-around w-full mt-4">
              <button
                className="bg-red-500 text-white px-4 py-2 rounded"
                onClick={() => handleNo(option)}
              >
                No
              </button>
              <button
                className="bg-green-500 text-white px-4 py-2 rounded"
                onClick={() => handleYes(option)}
              >
                Yes
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Display matched places */}
      {likedPlaces.length > 0 && (
        <div className="w-full max-w-md bg-white p-4 rounded shadow overflow-y-auto mt-6">
          <h2 className="text-xl font-bold mb-2">Your Selections</h2>
          <ul>
            {likedPlaces.map((place) => (
              <li key={place.id}>{place.name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
