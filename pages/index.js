import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client securely
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  const [stack, setStack] = useState([]); // Stack of previous choices
  const [options, setOptions] = useState([]); // Current options (2 at a time)
  const [selectedTags, setSelectedTags] = useState([]); // User's selected categories/tags
  const [likedPlaces, setLikedPlaces] = useState([]); // Final chosen places
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Fetch top-level categories on page load
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
    const { id } = selectedItem;
    let newTags = [...selectedTags, selectedItem.name];

    // Fetch subcategories or places
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

    setSelectedTags(newTags);
  };

  // Handles No selection (replace option dynamically)
  const handleNo = async (rejectedItem) => {
    let newOptions = [...options];

    // Remove the rejected item
    newOptions = newOptions.filter((item) => item.id !== rejectedItem.id);

    // Fetch another option
    const { data: newOption, error } = await supabase
      .from('categories')
      .select('*')
      .is('parent_id', null)
      .not('id', 'in', `(${rejectedItem.id})`) // Exclude the rejected option
      .order('ranking_score', { ascending: false })
      .limit(1);

    if (!error && newOption.length > 0) {
      newOptions.push(newOption[0]);
    }

    setOptions(newOptions.slice(0, 2));
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

      {/* Display branching UI */}
      <div className="relative w-full max-w-md">
        {stack.map((item, index) => (
          <div key={index} className="mb-2 p-3 bg-gray-100 rounded">
            <h3 className="text-lg font-semibold">{item.name}</h3>
          </div>
        ))}
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
