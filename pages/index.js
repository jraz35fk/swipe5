import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  const [stage, setStage] = useState('category'); // 'category' → 'subcategory' → 'place' → 'finished'
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [places, setPlaces] = useState([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [currentSubIndex, setCurrentSubIndex] = useState(0);
  const [currentPlaceIndex, setCurrentPlaceIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [likedPlaces, setLikedPlaces] = useState([]);
  const [showMatches, setShowMatches] = useState(false);

  // Fetch top-level categories on page load
  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      setErrorMessage('');
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .is('parent_id', null) // Fetch only top-level categories
        .order('ranking_score', { ascending: false });

      setLoading(false);
      if (error) {
        setErrorMessage('Failed to load categories.');
        console.error('Error fetching categories:', error);
      } else {
        setCategories(data);
      }
    };
    fetchCategories();
  }, []);

  // Handle "Yes" button click
  const handleYes = async () => {
    setErrorMessage('');

    if (stage === 'category') {
      if (!categories[currentCategoryIndex]) return;
      const selectedCategory = categories[currentCategoryIndex];

      // Fetch subcategories (these are stored in "categories" with a parent_id reference)
      setLoading(true);
      const { data: subcats, error } = await supabase
        .from('categories')
        .select('*')
        .eq('parent_id', selectedCategory.id)
        .order('ranking_score', { ascending: false });

      setLoading(false);

      if (error) {
        setErrorMessage('Failed to load subcategories.');
        console.error('Error fetching subcategories:', error);
        return;
      }

      if (!subcats || subcats.length === 0) {
        // No subcategories exist → Fetch places directly
        setStage('place');
        fetchPlaces(selectedCategory.id);
      } else {
        setSubcategories(subcats);
        setCurrentSubIndex(0);
        setStage('subcategory');
      }
    } 
    else if (stage === 'subcategory') {
      if (!subcategories[currentSubIndex]) return;
      const selectedSubcategory = subcategories[currentSubIndex];
      setStage('place');
      fetchPlaces(selectedSubcategory.id);
    } 
    else if (stage === 'place') {
      if (!places[currentPlaceIndex]) return;
      const chosenPlace = places[currentPlaceIndex];
      setLikedPlaces(prev => [...prev, chosenPlace]);
      setStage('finished');
    }
  };

  // Fetch places under the selected category/subcategory
  const fetchPlaces = async (categoryId) => {
    setLoading(true);
    setErrorMessage('');
    const { data: placesData, error } = await supabase
      .from('places')
      .select('*')
      .eq('category_id', categoryId)
      .order('ranking_score', { ascending: false });

    setLoading(false);

    if (error) {
      setErrorMessage('Failed to load places.');
      console.error('Error fetching places:', error);
      return;
    }

    if (!placesData || placesData.length === 0) {
      setErrorMessage('No places found.');
      setStage('subcategory');
      setCurrentSubIndex(prev => prev + 1);
      return;
    }

    setPlaces(placesData);
    setCurrentPlaceIndex(0);
  };

  // Handle "No" button click
  const handleNo = () => {
    setErrorMessage('');

    if (stage === 'category') {
      const nextIndex = currentCategoryIndex + 1;
      if (nextIndex < categories.length) {
        setCurrentCategoryIndex(nextIndex);
      } else {
        setStage('finished');
      }
    } 
    else if (stage === 'subcategory') {
      const nextSubIndex = currentSubIndex + 1;
      if (nextSubIndex < subcategories.length) {
        setCurrentSubIndex(nextSubIndex);
      } else {
        setStage('category');
        setCurrentCategoryIndex(prev => prev + 1);
      }
    } 
    else if (stage === 'place') {
      const nextPlaceIndex = currentPlaceIndex + 1;
      if (nextPlaceIndex < places.length) {
        setCurrentPlaceIndex(nextPlaceIndex);
      } else {
        setStage('subcategory');
        setCurrentSubIndex(prev => prev + 1);
      }
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center p-4">
      {/* Navigation buttons */}
      <div className="flex justify-between w-full max-w-md mb-4">
        <button className="bg-gray-200 px-4 py-2 rounded" onClick={() => window.location.reload()}>Start Over</button>
        <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={() => setShowMatches(true)}>Final Match Deck</button>
      </div>

      {/* Match Deck View */}
      {showMatches ? (
        <div className="w-full max-w-md bg-white p-4 rounded shadow">
          <h2 className="text-xl font-bold mb-2">Your Selections</h2>
          {likedPlaces.length === 0 ? <p>No places selected yet.</p> : 
            <ul>{likedPlaces.map(place => <li key={place.id}>{place.name}</li>)}</ul>}
          <button className="mt-4 w-full bg-gray-300 px-4 py-2 rounded" onClick={() => setShowMatches(false)}>Back</button>
        </div>
      ) : (
        <div>
          <h2>Explore Places</h2>
          {stage === 'category' && <p><strong>{categories[currentCategoryIndex]?.name}</strong></p>}
          {stage === 'subcategory' && <p><strong>{subcategories[currentSubIndex]?.name}</strong></p>}
          {stage === 'place' && <p><strong>{places[currentPlaceIndex]?.name}</strong></p>}
          <div className="flex mt-4">
            <button className="bg-red-500 text-white px-4 py-2 rounded mr-2" onClick={handleNo}>No</button>
            <button className="bg-green-500 text-white px-4 py-2 rounded" onClick={handleYes}>Yes</button>
          </div>
        </div>
      )}
    </div>
  );
}
