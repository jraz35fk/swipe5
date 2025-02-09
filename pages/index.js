import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  const [stack, setStack] = useState([]); // Stack for navigation
  const [likedPlaces, setLikedPlaces] = useState([]); // Final selected places
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Fetch top-level categories
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
        setStack([{ type: 'category', items: data, index: 0 }]);
      }
    };
    fetchCategories();
  }, []);

  // Move forward in navigation when selecting "Yes"
  const handleYes = async () => {
    if (stack.length === 0) return;
    const layerIndex = stack.length - 1;
    const currentLayer = stack[layerIndex];
    const { type, items, index } = currentLayer;
    if (!items || index >= items.length) return;
    const currentItem = items[index];

    if (type !== 'place') {
      // Fetch subcategories or places based on current selection
      const { data: subcategories, error } = await supabase
        .from('categories')
        .select('*')
        .eq('parent_id', currentItem.id)
        .order('ranking_score', { ascending: false });

      if (error) {
        console.error('Error fetching subcategories:', error);
        return;
      }

      if (subcategories && subcategories.length > 0) {
        setStack(prev => [
          ...prev.map((layer, i) =>
            i === layerIndex ? { ...layer, index: layer.index + 1 } : layer
          ),
          { type: 'subcategory', items: subcategories, index: 0 }
        ]);
      } else {
        // No subcategories → fetch places
        const { data: places, error: placesError } = await supabase
          .from('places')
          .select('*')
          .eq('category_id', currentItem.id)
          .order('ranking_score', { ascending: false });

        if (placesError) {
          console.error('Error fetching places:', placesError);
          return;
        }

        setStack(prev => [
          ...prev.map((layer, i) =>
            i === layerIndex ? { ...layer, index: layer.index + 1 } : layer
          ),
          { type: 'place', items: places || [], index: 0 }
        ]);
      }
    } else {
      // User selects a place → Add to liked places
      setLikedPlaces(prev => [...prev, currentItem]);
      setStack(prev =>
        prev.map((layer, i) =>
          i === layerIndex ? { ...layer, index: layer.index + 1 } : layer
        )
      );
    }
  };

  // Move forward in navigation when selecting "No" (skip current option)
  const handleNo = () => {
    if (stack.length === 0) return;
    setStack(prev => {
      const newStack = [...prev];
      const layerIndex = newStack.length - 1;
      if (layerIndex < 0) return newStack;

      newStack[layerIndex] = { ...newStack[layerIndex], index: newStack[layerIndex].index + 1 };

      return newStack;
    });
  };

  // Handle "Go Back"
  const handleBack = () => {
    if (stack.length > 1) {
      setStack(prev => prev.slice(0, -1));
    }
  };

  // Handle "Start Over"
  const handleStartOver = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .is('parent_id', null)
      .order('ranking_score', { ascending: false });

    setLoading(false);
    if (error) {
      console.error('Error fetching categories:', error);
    }
    setStack([{ type: 'category', items: data, index: 0 }]);
    setLikedPlaces([]);
  };

  // Determine the current and next card
  let currentCard = null;
  let nextCard = null;
  if (stack.length > 0) {
    const topLayer = stack[stack.length - 1];
    const { items, index } = topLayer;
    if (items && index < items.length) {
      currentCard = items[index];
      if (index + 1 < items.length) {
        nextCard = items[index + 1];
      }
    }
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center p-4">
      {/* Navigation buttons */}
      <div className="flex justify-between w-full max-w-md mb-4">
        <button className="bg-gray-200 px-4 py-2 rounded" onClick={handleStartOver}>
          Start Over
        </button>
        {stack.length > 1 && (
          <button className="bg-gray-200 px-4 py-2 rounded" onClick={handleBack}>
            Go Back
          </button>
        )}
      </div>

      {/* Main Cards */}
      <div className="relative w-full max-w-md h-64">
        {currentCard && (
          <div className="absolute inset-0 bg-white p-4 rounded-xl shadow-lg flex items-center justify-center text-center">
            <h2 className="text-2xl font-semibold">{currentCard.name}</h2>
          </div>
        )}
        {nextCard && (
          <div className="absolute inset-0 bg-gray-100 p-4 rounded-xl shadow-lg flex items-center justify-center text-center translate-y-4 scale-95">
            <h2 className="text-2xl font-semibold text-gray-400">{nextCard.name}</h2>
          </div>
        )}
      </div>

      {/* Yes/No Buttons */}
      <div className="flex justify-around w-full max-w-md mt-6">
        <button className="bg-red-500 text-white px-4 py-2 rounded" onClick={handleNo}>
          No
        </button>
        <button className="bg-green-500 text-white px-4 py-2 rounded" onClick={handleYes}>
          Yes
        </button>
      </div>

      {/* Final Match Deck */}
      {likedPlaces.length > 0 && (
        <div className="w-full max-w-md bg-white p-4 rounded shadow overflow-y-auto mt-6">
          <h2 className="text-xl font-bold mb-2">Your Selections</h2>
          <ul>
            {likedPlaces.map(place => (
              <li key={place.id}>{place.name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
