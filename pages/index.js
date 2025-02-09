import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with URL and anon key from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function HomePage() {
  // State for data lists
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [places, setPlaces] = useState([]);
  // State for selected items
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  // State for index of currently viewed option in the lists (for one-card-at-a-time)
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [subcategoryIndex, setSubcategoryIndex] = useState(0);
  // Final matches (activities) collected
  const [finalMatches, setFinalMatches] = useState([]);

  // Fetch all categories on initial load
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from('categories').select('*');
      if (error) {
        console.error('Error fetching categories:', error);
      } else {
        setCategories(data);
      }
    };
    fetchCategories();
  }, []);

  // Handle selecting a category
  const handleSelectCategory = async (category) => {
    setSelectedCategory(category);
    setSelectedSubcategory(null);
    setFinalMatches([]);  // reset any final matches from previous flow
    // Fetch subcategories for this category
    const { data, error } = await supabase
      .from('subcategories')
      .select('*')
      .eq('category_id', category.id);  // filter by selected category ID&#8203;:contentReference[oaicite:4]{index=4}
    if (error) {
      console.error('Error fetching subcategories:', error);
    } else {
      setSubcategories(data);
      setSubcategoryIndex(0);  // reset index for subcategories
    }
  };

  // Handle selecting a subcategory
  const handleSelectSubcategory = async (subcategory) => {
    setSelectedSubcategory(subcategory);
    // Fetch final places/activities for this subcategory
    const { data, error } = await supabase
      .from('places')
      .select('*')
      .eq('subcategory_id', subcategory.id);
    if (error) {
      console.error('Error fetching places:', error);
    } else {
      setPlaces(data);
      setFinalMatches(data);  // store the results as final matches
    }
  };

  // Handle going back to the previous step
  const handleGoBack = () => {
    if (selectedSubcategory) {
      // Currently in final matches step -> go back to subcategory selection
      setSelectedSubcategory(null);
      setPlaces([]);
      setFinalMatches([]);
      setSubcategoryIndex(0);
    } else if (selectedCategory) {
      // Currently in subcategory selection step -> go back to category selection
      setSelectedCategory(null);
      setSubcategories([]);
      setPlaces([]);
      setFinalMatches([]);
      setCategoryIndex(0);
    }
    // If no selection, there's nothing to go back to
  };

  // Handle starting over (reset all selections)
  const handleStartOver = () => {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSubcategories([]);
    setPlaces([]);
    setFinalMatches([]);
    setCategoryIndex(0);
    setSubcategoryIndex(0);
  };

  // Helper handlers to show next/prev option within the current selection list
  const showNextCategory = () => {
    if (categories.length > 0) {
      setCategoryIndex((prevIndex) => (prevIndex + 1) % categories.length);
    }
  };
  const showPrevCategory = () => {
    if (categories.length > 0) {
      setCategoryIndex((prevIndex) =>
        prevIndex === 0 ? categories.length - 1 : prevIndex - 1
      );
    }
  };
  const showNextSubcategory = () => {
    if (subcategories.length > 0) {
      setSubcategoryIndex((prevIndex) => (prevIndex + 1) % subcategories.length);
    }
  };
  const showPrevSubcategory = () => {
    if (subcategories.length > 0) {
      setSubcategoryIndex((prevIndex) =>
        prevIndex === 0 ? subcategories.length - 1 : prevIndex - 1
      );
    }
  };

  return (
    <div className="container" style={{ padding: '2rem' }}>
      {/* Stack of previous selections */}
      <div className="selected-stack" style={{ marginBottom: '1.5rem' }}>
        {selectedCategory && (
          <div className="selected-card category-card" style={{ display: 'inline-block', marginRight: '1rem' }}>
            <strong>Category:</strong> {selectedCategory.name}
          </div>
        )}
        {selectedSubcategory && (
          <div className="selected-card subcategory-card" style={{ display: 'inline-block', marginRight: '1rem' }}>
            <strong>Subcategory:</strong> {selectedSubcategory.name}
          </div>
        )}
      </div>

      {/* Selection card area */}
      {!selectedCategory ? (
        /* Category selection step */
        <div className="card category-card" style={{ marginBottom: '1rem' }}>
          {categories.length > 0 ? (
            <>
              <h2>{categories[categoryIndex]?.name}</h2>
              <p>{categories[categoryIndex]?.description}</p>
              <button onClick={() => handleSelectCategory(categories[categoryIndex])}>
                Select Category
              </button>
              {/* Only show navigation if multiple categories */}
              {categories.length > 1 && (
                <div className="nav-buttons" style={{ marginTop: '0.5rem' }}>
                  <button onClick={showPrevCategory}>◀ Prev</button>
                  <button onClick={showNextCategory}>Next ▶</button>
                </div>
              )}
            </>
          ) : (
            <p>Loading categories...</p>
          )}
        </div>
      ) : !selectedSubcategory ? (
        /* Subcategory selection step */
        <div className="card subcategory-card" style={{ marginBottom: '1rem' }}>
          {subcategories.length > 0 ? (
            <>
              <h2>{subcategories[subcategoryIndex]?.name}</h2>
              <p>{subcategories[subcategoryIndex]?.description}</p>
              <button onClick={() => handleSelectSubcategory(subcategories[subcategoryIndex])}>
                Select Subcategory
              </button>
              {subcategories.length > 1 && (
                <div className="nav-buttons" style={{ marginTop: '0.5rem' }}>
                  <button onClick={showPrevSubcategory}>◀ Prev</button>
                  <button onClick={showNextSubcategory}>Next ▶</button>
                </div>
              )}
            </>
          ) : (
            <p>{/* If no subcategories (or still loading) */}Loading options...</p>
          )}
        </div>
      ) : (
        /* Final matches step: show results */
        <div className="final-matches" style={{ marginBottom: '1rem' }}>
          <h2>Final Matches</h2>
          {finalMatches.length > 0 ? (
            <ul>
              {finalMatches.map((place) => (
                <li key={place.id}>
                  <strong>{place.name}</strong> – {place.description}
                </li>
              ))}
            </ul>
          ) : (
            <p>No matches found for this selection.</p>
          )}
        </div>
      )}

      {/* Control buttons */}
      <div className="control-buttons" style={{ marginTop: '1rem' }}>
        { (selectedCategory || selectedSubcategory) && (
          <button onClick={handleGoBack} style={{ marginRight: '0.5rem' }}>
            ⬅ Go Back
          </button>
        )}
        { (selectedCategory || selectedSubcategory) && (
          <button onClick={handleStartOver}>
            ⟲ Start Over
          </button>
        )}
      </div>
    </div>
  );
}
