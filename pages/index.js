import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

export async function getServerSideProps() {
  // Initialize Supabase client with your URL and anon key
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  // Fetch all categories and places from Supabase
  const { data: categories, error: catError } = await supabase.from('categories').select('*');
  const { data: places, error: placeError } = await supabase.from('places').select('*');
  
  if (catError || placeError) {
    console.error('Supabase fetch error:', catError || placeError);
  }
  // Pass data to the page component as props
  return {
    props: {
      categories: categories ?? [],
      places: places ?? []
    }
  };
}

export default function Home({ categories, places }) {
  // Prepare data structures for quick lookup of subcategories and places
  const topCategories = categories.filter(c => c.parent_id === null)
                                  .sort((a, b) => b.ranking_score - a.ranking_score);
  const childrenMap = {};   // Map parent category id -> array of subcategory objects
  categories.forEach(c => {
    if (c.parent_id) {
      if (!childrenMap[c.parent_id]) childrenMap[c.parent_id] = [];
      childrenMap[c.parent_id].push(c);
    }
  });
  // Sort each parent's subcategories by ranking_score (desc)
  for (const parentId in childrenMap) {
    childrenMap[parentId].sort((a, b) => b.ranking_score - a.ranking_score);
  }
  const placesMap = {};   // Map category id -> array of place objects
  places.forEach(p => {
    if (!placesMap[p.category_id]) placesMap[p.category_id] = [];
    placesMap[p.category_id].push(p);
  });
  // Sort places in each category by ranking_score (desc)
  for (const catId in placesMap) {
    placesMap[catId].sort((a, b) => b.ranking_score - a.ranking_score);
  }

  // State to manage the navigation through categories
  const [path, setPath] = useState([]);             // stack of categories we said "Yes" to (drill-down path)
  const [indices, setIndices] = useState([0]);      // indices for current option at each level
  const [finalCategory, setFinalCategory] = useState(null);  // the selected final category (leaf) if reached
  const [noMoreOptions, setNoMoreOptions] = useState(false); // flag when no more options to show
  // Compute current level and current category option based on state
  const currentLevel = indices.length - 1;
  const currentOptions = currentLevel === 0 
    ? topCategories 
    : (childrenMap[path[currentLevel - 1].id] || []);
  const currentOption = (!noMoreOptions && !finalCategory && currentOptions.length > 0)
    ? currentOptions[ indices[currentLevel] ] 
    : null;

  // Handle "Yes" click
  const handleYes = () => {
    if (!currentOption) return;
    const subOptions = childrenMap[currentOption.id] || [];
    if (subOptions.length > 0) {
      // Drill down into subcategories: add current category to path and reset index for next level
      setPath(prev => [...prev, currentOption]);
      setIndices(prev => [...prev, 0]);
    } else {
      // We've reached a leaf category (no subcategories): select this as final and show its places
      setFinalCategory(currentOption);
    }
  };

  // Handle "No" click
  const handleNo = () => {
    if (!currentOption) return;
    let newPath = [...path];
    let newIndices = [...indices];
    // Increment the index at the current level to move to the next sibling option
    newIndices[currentLevel] += 1;

    // If we reached the end of options at this level, backtrack to the parent level
    let level = currentLevel;
    while (level >= 0) {
      const opts = level === 0 ? topCategories : (childrenMap[newPath[level - 1]?.id] || []);
      if (newIndices[level] < opts.length) {
        // There is another option at the current level, break out to show it
        break;
      }
      // No more options at this level, so backtrack one level up
      newIndices.pop();            // remove this level
      if (level > 0) newPath.pop();  // remove the category from the path if not at root
      level -= 1;
      if (level < 0) break;
      // Move to the next option of the parent level
      newIndices[level] += 1;
    }

    // If we've backtracked past the root (no options left at root level)
    if (newIndices.length === 0) {
      setNoMoreOptions(true);
    } else {
      setPath(newPath);
      setIndices(newIndices);
    }
  };

  // Handle restart (start over)
  const handleRestart = () => {
    setPath([]);
    setIndices([0]);
    setFinalCategory(null);
    setNoMoreOptions(false);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Discover Baltimore Places</h1>

      {finalCategory ? (
        /** Final category selected: show list of places **/
        <div>
          <h2>Places in {finalCategory.name}:</h2>
          { (placesMap[finalCategory.id] && placesMap[finalCategory.id].length > 0) ? (
            <ul>
              {placesMap[finalCategory.id].map(place => (
                <li key={place.id}>{place.name}</li>
              ))}
            </ul>
          ) : (
            <p><em>No places found for this category.</em></p>
          )}
          <button onClick={handleRestart}>Start Over</button>
        </div>
      ) : noMoreOptions ? (
        /** No more categories to show (exhausted all options without selection) **/
        <div>
          <p>🚫 <strong>No more categories</strong> to explore.</p>
          <button onClick={handleRestart}>Start Over</button>
        </div>
      ) : currentOption ? (
        /** Show the current category option with Yes/No buttons **/
        <div>
          <p>Are you interested in <strong>{currentOption.name}</strong>?</p>
          <button onClick={handleYes} style={{ marginRight: '1rem' }}>Yes</button>
          <button onClick={handleNo}>No</button>
        </div>
      ) : (
        /** Fallback (should not happen because data is preloaded) **/
        <p>Loading...</p>
      )}
    </div>
  );
}
