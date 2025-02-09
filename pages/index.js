import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client using environment variables (make sure these are set in Vercel)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Home() {
  const [stack, setStack] = useState([]);        // stack of category/subcategory/place layers
  const [likedPlaces, setLikedPlaces] = useState([]);  // final liked places
  const [showMatches, setShowMatches] = useState(false); // controls "Final Match Deck" view
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch top-level categories on initial load
    const fetchTopCategories = async () => {
      const { data: categories, error } = await supabase
        .from('categories')
        .select('*')
        .is('parent_id', null)  // top-level categories (no parent)
        .order('ranking_score', { ascending: false });  // highest ranking first
      if (error) {
        console.error('Error fetching categories:', error);
      }
      if (categories) {
        setStack([{
          type: 'category',
          parentId: null,
          items: categories,
          index: 0
        }]);
      }
      setLoading(false);
    };
    fetchTopCategories();
  }, []);

  // Helper: cascade-pop finished layers (when a layer runs out of items)
  function cascadePop(layersStack) {
    let newStack = [...layersStack];
    // Continue popping while the top layer is exhausted
    while (newStack.length > 0) {
      const topLayer = newStack[newStack.length - 1];
      if (topLayer.index >= topLayer.items.length) {
        if (newStack.length > 1) {
          // Remove the finished layer and check the next one up
          newStack.pop();
          // No need to increment parent index here (already handled on entry)
          continue;
        } else {
          // Top-level layer exhausted; nothing left to pop
          break;
        }
      }
      break;
    }
    return newStack;
  }

  // Handle "Yes" button (select item or like place)
  const handleYes = async () => {
    if (stack.length === 0) return;
    const layerIndex = stack.length - 1;
    const currentLayer = stack[layerIndex];
    const { type, items, index } = currentLayer;
    if (!items || index >= items.length) return;
    const currentItem = items[index];

    if (type !== 'place') {
      // If current item is a category or subcategory, drill down into it
      const { data: childCategories, error: childError } = await supabase
        .from('categories')
        .select('*')
        .eq('parent_id', currentItem.id)
        .order('ranking_score', { ascending: false });
      if (childError) {
        console.error('Error fetching subcategories:', childError);
      }
      if (childCategories && childCategories.length > 0) {
        // Push a new layer of subcategories
        const newLayer = {
          type: 'subcategory',
          parentId: currentItem.id,
          items: childCategories,
          index: 0
        };
        setStack(prevStack => {
          const newStack = [...prevStack];
          // Skip this category for future (increment its index)
          newStack[layerIndex] = { 
            ...newStack[layerIndex], 
            index: newStack[layerIndex].index + 1 
          };
          newStack.push(newLayer);
          return cascadePop(newStack);
        });
      } else {
        // No subcategories – fetch places for this category
        const { data: places, error: placesError } = await supabase
          .from('places')
          .select('*')
          .eq('category_id', currentItem.id)
          .order('ranking_score', { ascending: false });
        if (placesError) {
          console.error('Error fetching places:', placesError);
        }
        const newLayer = {
          type: 'place',
          parentId: currentItem.id,
          items: places || [],
          index: 0
        };
        setStack(prevStack => {
          const newStack = [...prevStack];
          // Skip this category for future
          newStack[layerIndex] = { 
            ...newStack[layerIndex], 
            index: newStack[layerIndex].index + 1 
          };
          newStack.push(newLayer);
          return cascadePop(newStack);
        });
      }
    } else {
      // Current item is a place – user likes this place
      setLikedPlaces(prev => (
        prev.find(p => p.id === currentItem.id) ? prev : [...prev, currentItem]
      ));
      // Move to next place in the current places list
      setStack(prevStack => {
        const newStack = [...prevStack];
        newStack[layerIndex] = { 
          ...newStack[layerIndex], 
          index: newStack[layerIndex].index + 1 
        };
        return cascadePop(newStack);
      });
    }
  };

  // Handle "No" button (skip current item)
  const handleNo = () => {
    if (stack.length === 0) return;
    setStack(prevStack => {
      const newStack = [...prevStack];
      const layerIndex = newStack.length - 1;
      if (layerIndex < 0) return newStack;
      // Skip this item by advancing index
      newStack[layerIndex] = { 
        ...newStack[layerIndex], 
        index: newStack[layerIndex].index + 1 
      };
      return cascadePop(newStack);
    });
  };

  // Handle "Go Back" button (return to previous layer)
  const handleBack = () => {
    if (stack.length <= 1) return; // no previous layer if at root
    setStack(prevStack => {
      const newStack = [...prevStack];
      newStack.pop(); // remove current top layer
      return newStack;
    });
  };

  // Handle "Start Over" button (reset to top-level categories)
  const handleStartOver = async () => {
    setLoading(true);
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .is('parent_id', null)
      .order('ranking_score', { ascending: false });
    if (error) {
      console.error('Error fetching categories:', error);
    }
    if (categories) {
      setStack([{
        type: 'category',
        parentId: null,
        items: categories,
        index: 0
      }]);
    } else {
      setStack([]);
    }
    // Reset liked places (remove this line if you want to preserve previous selections)
    setLikedPlaces([]);
    setLoading(false);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  // Determine the current and next card from the top layer
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
      {/* Top navigation controls */}
      <div className="flex justify-between w-full max-w-md mb-4">
        <button 
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded" 
          onClick={handleStartOver}
        >
          Start Over
        </button>
        {stack.length > 1 ? (
          <button 
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded" 
            onClick={handleBack}
          >
            Go Back
          </button>
        ) : <span /> }
        <button 
          className="bg-blue-500 text-white px-4 py-2 rounded" 
          onClick={() => setShowMatches(true)}
        >
          Final Match Deck
        </button>
      </div>

      {/* Main card stack or final matches list */}
      {showMatches ? (
        /* Final Match Deck View */
        <div className="w-full max-w-md bg-white p-4 rounded shadow overflow-y-auto">
          <h2 className="text-xl font-bold mb-2">Your Selections</h2>
          {likedPlaces.length === 0 ? (
            <p className="text-gray-500">No places selected yet.</p>
          ) : (
            <ul>
              {likedPlaces.map(place => (
                <li key={place.id} className="border-b last:border-0 py-2">
                  {place.name}
                </li>
              ))}
            </ul>
          )}
          <button 
            className="mt-4 w-full bg-gray-300 text-gray-800 px-4 py-2 rounded" 
            onClick={() => setShowMatches(false)}
          >
            Back to Swiping
          </button>
        </div>
      ) : (
        /* Tinder-style swipe cards */
        <div className="relative w-full max-w-md h-64">
          {/* Current card (front) */}
          {currentCard ? (
            <div className="absolute inset-0 bg-white rounded-xl shadow-lg flex items-center justify-center text-center p-4">
              <div>
                <h2 className="text-2xl font-semibold">{currentCard.name}</h2>
                {currentCard.description && (
                  <p className="mt-2 text-gray-600">{currentCard.description}</p>
                )}
              </div>
            </div>
          ) : (
            // No current card available
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-gray-500">No more options.</p>
            </div>
          )}
          {/* Next card (peeking from behind) */}
          {nextCard && (
            <div className="absolute inset-0 bg-white rounded-xl shadow-lg flex items-center justify-center text-center p-4 transform translate-y-4 scale-95">
              <div>
                <h2 className="text-2xl font-semibold text-gray-400">{nextCard.name}</h2>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Yes/No action buttons (shown only in swipe mode) */}
      {!showMatches && (
        <div className="flex justify-around w-full max-w-md mt-6">
          <button 
            className="bg-red-500 text-white w-24 py-2 rounded font-semibold" 
            onClick={handleNo}
          >
            No
          </button>
          <button 
            className="bg-green-500 text-white w-24 py-2 rounded font-semibold" 
            onClick={handleYes}
          >
            Yes
          </button>
        </div>
      )}
    </div>
  );
}
