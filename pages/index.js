import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  const [stack, setStack] = useState([]); // Stores layers of categories → subcategories → places
  const [likedPlaces, setLikedPlaces] = useState([]); // Stores selected final places
  const [showMatches, setShowMatches] = useState(false); // Toggle Final Match Deck view
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch top-level categories on page load
    const fetchTopCategories = async () => {
      const { data: categories, error } = await supabase
        .from('categories')
        .select('id, name, ranking_score')
        .is('parent_id', null) // Fetch only top-level categories
        .order('ranking_score', { ascending: false }); // Show higher-ranked first

      if (error) {
        console.error('Error fetching categories:', error);
      } else {
        setStack([{ type: 'category', items: categories, index: 0 }]);
      }
      setLoading(false);
    };
    fetchTopCategories();
  }, []);

  // Helper function to remove exhausted layers
  function cascadePop(layers) {
    let newStack = [...layers];
    while (newStack.length > 0) {
      const top = newStack[newStack.length - 1];
      if (top.index >= top.items.length) {
        newStack.pop();
        if (newStack.length > 0) {
          newStack[newStack.length - 1].index++; // Move to next item in previous layer
        }
      } else {
        break;
      }
    }
    return newStack;
  }

  // Handle "Yes" button click (go deeper or select place)
  const handleYes = async () => {
    if (stack.length === 0) return;
    const layerIndex = stack.length - 1;
    const currentLayer = stack[layerIndex];
    const { type, items, index } = currentLayer;
    if (!items || index >= items.length) return;
    const currentItem = items[index];

    if (type !== 'place') {
      // Fetch subcategories or places based on current category
      const { data: children, error } = await supabase
        .from('categories')
        .select('id, name, ranking_score')
        .eq('parent_id', currentItem.id)
        .order('ranking_score', { ascending: false });

      if (error) {
        console.error('Error fetching subcategories:', error);
      }

      if (children && children.length > 0) {
        // Add a new subcategory layer
        setStack(prev => cascadePop([...prev, { type: 'subcategory', items: children, index: 0 }]));
      } else {
        // No subcategories exist → Fetch places
        const { data: places, error: placesError } = await supabase
          .from('places')
          .select('id, name, description, ranking_score')
          .eq('category_id', currentItem.id)
          .order('ranking_score', { ascending: false });

        if (placesError) {
          console.error('Error fetching places:', placesError);
        }
        setStack(prev => cascadePop([...prev, { type: 'place', items: places || [], index: 0 }]));
      }
    } else {
      // User selects a place → Add to likedPlaces
      setLikedPlaces(prev => (prev.some(p => p.id === currentItem.id) ? prev : [...prev, currentItem]));
      setStack(prev => cascadePop([...prev.slice(0, -1), { ...prev[prev.length - 1], index: index + 1 }]));
    }
  };

  // Handle "No" button click (skip current card)
  const handleNo = () => {
    setStack(prev => cascadePop([...prev.slice(0, -1), { ...prev[prev.length - 1], index: prev[prev.length - 1].index + 1 }]));
  };

  // Handle "Go Back" button click
  const handleBack = () => {
    if (stack.length > 1) setStack(prev => prev.slice(0, -1));
  };

  // Handle "Start Over" button click
  const handleStartOver = async () => {
    setLoading(true);
    const { data: categories, error } = await supabase
      .from('categories')
      .select('id, name, ranking_score')
      .is('parent_id', null)
      .order('ranking_score', { ascending: false });

    if (error) {
      console.error('Error fetching categories:', error);
    }
    setStack([{ type: 'category', items: categories, index: 0 }]);
    setLikedPlaces([]); // Reset liked places
    setLoading(false);
  };

  // Determine current and next cards
  let currentCard = null, nextCard = null;
  if (stack.length > 0) {
    const topLayer = stack[stack.length - 1];
    const { items, index } = topLayer;
    if (items && index < items.length) {
      currentCard = items[index];
      nextCard = items[index + 1] || null;
    }
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center p-4">
      {/* Navigation buttons */}
      <div className="flex justify-between w-full max-w-md mb-4">
        <button className="bg-gray-200 px-4 py-2 rounded" onClick={handleStartOver}>Start Over</button>
        {stack.length > 1 && (
          <button className="bg-gray-200 px-4 py-2 rounded" onClick={handleBack}>Go Back</button>
        )}
        <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={() => setShowMatches(true)}>Final Match Deck</button>
      </div>

      {/* Match Deck View */}
      {showMatches ? (
        <div className="w-full max-w-md bg-white p-4 rounded shadow overflow-y-auto">
          <h2 className="text-xl font-bold mb-2">Your Selections</h2>
          {likedPlaces.length === 0 ? <p className="text-gray-500">No places selected yet.</p> : 
            <ul>{likedPlaces.map(place => <li key={place.id} className="py-2">{place.name}</li>)}</ul>}
          <button className="mt-4 w-full bg-gray-300 px-4 py-2 rounded" onClick={() => setShowMatches(false)}>Back to Swiping</button>
        </div>
      ) : (
        /* Main Cards Display */
        <div className="relative w-full max-w-md h-64">
          {currentCard && <div className="absolute inset-0 bg-white p-4 rounded-xl shadow-lg">{currentCard.name}</div>}
          {nextCard && <div className="absolute inset-0 bg-gray-100 p-4 rounded-xl shadow-lg translate-y-4 scale-95">{nextCard.name}</div>}
        </div>
      )}

      {/* Yes/No Buttons */}
      {!showMatches && <div className="flex justify-around w-full max-w-md mt-6">
        <button className="bg-red-500 text-white w-24 py-2 rounded" onClick={handleNo}>No</button>
        <button className="bg-green-500 text-white w-24 py-2 rounded" onClick={handleYes}>Yes</button>
      </div>}
    </div>
  );
}
