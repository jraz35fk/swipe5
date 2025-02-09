import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Initialize Supabase client with URL and anon key (includes API key in requests)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Home() {
  // State variables
  const [stage, setStage] = useState('category');  // 'category' | 'subcategory' | 'place' | 'finished'
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [places, setPlaces] = useState([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [currentSubIndex, setCurrentSubIndex] = useState(0);
  const [currentPlaceIndex, setCurrentPlaceIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [finalPlace, setFinalPlace] = useState(null); // store the chosen place when finished

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      setErrorMessage('');
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('ranking_score', { ascending: false });  // sort by ranking_score (highest first)
      setLoading(false);
      if (error) {
        console.error('Error fetching categories:', error);
        setErrorMessage('Failed to load categories. Please check your connection.');
        return;
      }
      if (!data || data.length === 0) {
        setErrorMessage('No categories available.');
        setCategories([]);
      } else {
        setCategories(data);
        setCurrentCategoryIndex(0);
        setStage('category');
      }
    };
    fetchCategories();
  }, []);

  // Handler for "Yes" button
  const handleYes = async () => {
    setErrorMessage('');
    if (stage === 'category') {
      // User selected the current category -> fetch its subcategories
      if (!categories[currentCategoryIndex]) return;
      const selectedCategory = categories[currentCategoryIndex];
      setLoading(true);
      setStage('subcategory');  // move to subcategory stage (we will show loading state if needed)
      const { data: subcats, error } = await supabase
        .from('subcategories')
        .select('*')
        .eq('category_id', selectedCategory.id)
        .order('ranking_score', { ascending: false });
      setLoading(false);
      if (error) {
        console.error('Error fetching subcategories:', error);
        setErrorMessage('Failed to load subcategories. Please check your connection.');
        // Stay on subcategory stage (user can retry by clicking Yes again)
        return;
      }
      if (!subcats || subcats.length === 0) {
        // No subcategories found for this category
        setErrorMessage(`No subcategories found for "${selectedCategory.name}".`);
        // Move to next category
        setStage('category');
        setCurrentCategoryIndex(prevIndex => prevIndex + 1);
        return;
      }
      // Subcategories fetched successfully
      setSubcategories(subcats);
      setCurrentSubIndex(0);
      // stage remains 'subcategory', now with data ready to display
    } 
    else if (stage === 'subcategory') {
      // User selected the current subcategory -> fetch its places
      if (!subcategories[currentSubIndex]) return;
      const selectedSubcategory = subcategories[currentSubIndex];
      setLoading(true);
      setStage('place');  // move to place stage, show loading if needed
      const { data: placesData, error } = await supabase
        .from('places')
        .select('*')
        .eq('subcategory_id', selectedSubcategory.id)
        .order('ranking_score', { ascending: false });
      setLoading(false);
      if (error) {
        console.error('Error fetching places:', error);
        setErrorMessage('Failed to load places. Please check your connection.');
        // Stay on place stage (user can retry by clicking Yes again for this subcategory)
        return;
      }
      if (!placesData || placesData.length === 0) {
        // No places in this subcategory
        setErrorMessage(`No places found for "${selectedSubcategory.name}".`);
        // Move back to subcategory stage to try next subcategory
        setStage('subcategory');
        setCurrentSubIndex(prevIndex => prevIndex + 1);
        // If that was the last subcategory, the UI below will handle moving to next category
        return;
      }
      // Places fetched successfully
      setPlaces(placesData);
      setCurrentPlaceIndex(0);
      // stage remains 'place'
    } 
    else if (stage === 'place') {
      // User selected the current place -> finish the flow
      if (!places[currentPlaceIndex]) return;
      const chosenPlace = places[currentPlaceIndex];
      setFinalPlace(chosenPlace);
      setStage('finished');
      // (You could also trigger any other action here, e.g., navigate or record the choice)
    }
  };

  // Handler for "No" button
  const handleNo = () => {
    setErrorMessage('');
    if (stage === 'category') {
      // Skip current category, go to next one
      const nextIndex = currentCategoryIndex + 1;
      if (nextIndex < categories.length) {
        setCurrentCategoryIndex(nextIndex);
        // remain in category stage, show next category
      } else {
        // No more categories
        setStage('finished');
        setFinalPlace(null);
      }
    } 
    else if (stage === 'subcategory') {
      // Skip current subcategory, go to next one
      const nextSubIndex = currentSubIndex + 1;
      if (nextSubIndex < subcategories.length) {
        setCurrentSubIndex(nextSubIndex);
        // remain in subcategory stage, show next subcategory
      } else {
        // No more subcategories in this category, go back to category stage for next category
        const nextCatIndex = currentCategoryIndex + 1;
        if (nextCatIndex < categories.length) {
          setCurrentCategoryIndex(nextCatIndex);
          setStage('category');
          setSubcategories([]);
          setCurrentSubIndex(0);
        } else {
          // No more categories left
          setStage('finished');
          setFinalPlace(null);
        }
      }
    } 
    else if (stage === 'place') {
      // Skip current place, go to next one
      const nextPlaceIndex = currentPlaceIndex + 1;
      if (nextPlaceIndex < places.length) {
        setCurrentPlaceIndex(nextPlaceIndex);
        // remain in place stage, show next place
      } else {
        // No more places in this subcategory, return to subcategory stage for next subcategory
        const nextSubIndex = currentSubIndex + 1;
        if (nextSubIndex < subcategories.length) {
          setCurrentSubIndex(nextSubIndex);
          setStage('subcategory');
          setPlaces([]);
          setCurrentPlaceIndex(0);
        } else {
          // No more subcategories in this category
          const nextCatIndex = currentCategoryIndex + 1;
          if (nextCatIndex < categories.length) {
            setCurrentCategoryIndex(nextCatIndex);
            setStage('category');
            setSubcategories([]);
            setCurrentSubIndex(0);
            setPlaces([]);
            setCurrentPlaceIndex(0);
          } else {
            // No more categories
            setStage('finished');
            setFinalPlace(null);
          }
        }
      }
    }
  };

  // Rendering logic for different stages
  let content = null;
  if (loading) {
    // Show a loading indicator while data is being fetched
    content = <p>Loading...</p>;
  } else if (stage === 'finished') {
    // End of flow: either a place was selected or no more items
    if (finalPlace) {
      content = (
        <div>
          <h2>Place Selected:</h2>
          <p><strong>{finalPlace.name}</strong></p>
          <p>{finalPlace.description || 'No description available.'}</p>
        </div>
      );
    } else {
      content = <h2>No more recommendations available.</h2>;
    }
  } else if (stage === 'category') {
    // Category selection stage
    if (categories.length === 0) {
      content = <p>No categories to show.</p>;
    } else {
      const category = categories[currentCategoryIndex];
      content = (
        <div>
          <h2>Category</h2>
          <p><strong>{category.name}</strong></p>
          <p>{category.description || ''}</p>
        </div>
      );
    }
  } else if (stage === 'subcategory') {
    // Subcategory selection stage
    if (subcategories.length === 0 || currentSubIndex >= subcategories.length) {
      content = <p>No subcategories to show.</p>;
    } else {
      const subcat = subcategories[currentSubIndex];
      content = (
        <div>
          <h2>Subcategory</h2>
          <p><strong>{subcat.name}</strong></p>
          <p>{subcat.description || ''}</p>
        </div>
      );
    }
  } else if (stage === 'place') {
    // Place selection stage
    if (places.length === 0 || currentPlaceIndex >= places.length) {
      content = <p>No places to show.</p>;
    } else {
      const place = places[currentPlaceIndex];
      content = (
        <div>
          <h2>Place</h2>
          <p><strong>{place.name}</strong></p>
          <p>{place.details || place.description || ''}</p>
        </div>
      );
    }
  }

  return (
    <main style={{ textAlign: 'center', padding: '20px' }}>
      <h1>Explore Places</h1>
      {/* Display error messages if any */}
      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
      {/* Display the current content (category, subcategory, place, or finished info) */}
      {content}
      {/* Show Yes/No buttons if we are in an active selection stage */}
      {['category', 'subcategory', 'place'].includes(stage) && !loading && (
        <div style={{ marginTop: '20px' }}>
          <button onClick={handleNo} style={{ marginRight: '10px' }}>No</button>
          <button onClick={handleYes}>Yes</button>
        </div>
      )}
    </main>
  );
}
