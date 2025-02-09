import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (for demo purposes; in real apps use env vars)
const supabase = createClient('NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY');

export default function Home() {
  // Initial two options (parent category and its two child cards)
  const [initialCategory] = useState("Parent Category");  // could be fetched or static
  const [options, setOptions] = useState([
    { name: "Option A", selected: false },
    { name: "Option B", selected: false }
  ]);
  // Path state to track branching (each element: { category, options: [...] })
  const [path, setPath] = useState([
    { category: initialCategory, options: options }
  ]);
  // Next-level options (if a single branch is chosen)
  const [subOptions, setSubOptions] = useState(null);
  // Results state to hold activities to display (if we've reached a result stage)
  const [results, setResults] = useState(null);

  // Handler for selecting Yes/No on an option
  const handleSelection = (levelIndex, optionIndex, isYes) => {
    // Clone current path to avoid direct state mutation
    const newPath = [...path].map(level => ({
      category: level.category,
      options: level.options.map(opt => ({ ...opt }))
    }));
    // Update the selection at specified level and option
    newPath[levelIndex].options[optionIndex].selected = isYes;
    // If setting to Yes/No might require adjusting the other option at same level:
    // We allow independent Yes/No, so both could be true, or one true one false.
    // If user explicitly clicks "No" (isYes=false), we record that too.
    // (If we consider default as No, this still lets user toggle Yes off to indicate No.)
    setPath(newPath);
    // Clear any deeper path levels when an upper-level choice changes
    if (levelIndex < newPath.length - 1) {
      // Remove deeper levels beyond this one
      newPath.splice(levelIndex + 1);
      setPath(newPath);
      setResults(null);
      setSubOptions(null);
    }
  };

  // useEffect to respond to path changes and load next options or results
  useEffect(() => {
    if (!path.length) return;
    const currentLevel = path[path.length - 1];        // last level in the path
    const choices = currentLevel.options;
    const bothYes = choices.every(opt => opt.selected);      // true if both are selected Yes
    const oneYesIndex = choices.findIndex(opt => opt.selected);  // index of a Yes (if any)
    const anyYesCount = choices.filter(opt => opt.selected).length;

    // If both cards are marked Yes -> fetch combined results
    if (bothYes && choices.length === 2) {
      const tag1 = choices[0].name;
      const tag2 = choices[1].name;
      // Query Supabase for activities containing both tags (intersection)
      supabase.from('activities')
        .select('*')
        .contains('tags', [tag1, tag2])
        .order('weight', { ascending: false })
        .then(({ data: bothData, error: err1 }) => {
          if (err1) console.error(err1);
          // Query for any with either tag (union), sorted by weight
          supabase.from('activities')
            .select('*')
            .overlaps('tags', [tag1, tag2])
            .order('weight', { ascending: false })
            .then(({ data: unionData, error: err2 }) => {
              if (err2) console.error(err2);
              let additional = [];
              if (unionData) {
                // Filter out the ones that have both tags (already in bothData)
                additional = unionData.filter(item => {
                  // Assuming each item has a unique id and a tags array:
                  const hasBoth = item.tags && item.tags.includes(tag1) && item.tags.includes(tag2);
                  return !hasBoth;
                });
              }
              // Combine results: shared-tag first, then additional
              const combinedResults = [];
              if (bothData) combinedResults.push(...bothData);
              if (additional) combinedResults.push(...additional);
              setResults(combinedResults);
            });
        });
      // We don't set subOptions because this is a terminal branch (showing results)
      setSubOptions(null);
    }
    // If exactly one card is Yes -> follow that branch
    else if (anyYesCount === 1) {
      const yesOption = choices[oneYesIndex];
      const noOption = choices[(oneYesIndex === 0 ? 1 : 0)];
      // If we are at the last level of the current path, add a new branch for the yes option
      // (This assumes we have a way to get sub-categories for yesOption if any)
      // For demo, we'll simulate two sub-options if not already present:
      const nextLevelCategory = yesOption.name;
      const nextOptions = [
        { name: `${yesOption.name} - Sub1`, selected: false },
        { name: `${yesOption.name} - Sub2`, selected: false }
      ];
      // Update path with new level
      setPath(prev => {
        // Remove any existing deeper levels first
        const truncated = prev.slice(0, path.length);
        truncated[path.length] = { category: nextLevelCategory, options: nextOptions };
        return truncated;
      });
      setSubOptions(nextOptions);
      setResults(null);  // clear any previous results
      // If there are no subcategories and this is a leaf category, fetch results for this category:
      // (For example, if yesOption has no further subdivisions)
      // Here, we assume there *are* subcategories (nextOptions) for demonstration.
      // In a real scenario, you'd check if nextOptions exist or if we've reached activities level.
      // If leaf:
      // supabase.from('activities').select('*')
      //   .contains('tags', [yesOption.name])
      //   .order('weight', { ascending: false })
      //   .then(({ data, error }) => setResults(data));
    }
    // If no card is selected Yes (both No or not yet chosen), do nothing or reset
    else if (anyYesCount === 0) {
      // Both No: we could either stay on the same level and wait for a Yes, or handle as needed.
      setResults(null);
      setSubOptions(null);
      // (No branch to follow since user declined both; maybe prompt or end.)
    }
  }, [path]);

  return (
    <div style={{ padding: '1rem' }}>
      {/* Render the branching UI based on the path state */}
      {path.map((level, idx) => (
        <div key={idx} style={{ marginLeft: idx === 0 ? 0 : '2rem' }}>
          {/* Parent category label */}
          <h3>{level.category}</h3>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {level.options.map((opt, j) => (
              <div key={j} style={{ border: '1px solid #ccc', padding: '0.5rem' }}>
                <p>{opt.name}</p>
                {/* Buttons or toggles for Yes/No selection */}
                <button 
                  style={{ marginRight: '0.5rem', backgroundColor: opt.selected ? '#4caf50' : '#eee' }}
                  onClick={() => handleSelection(idx, j, true)}>
                  Yes
                </button>
                <button 
                  style={{ backgroundColor: !opt.selected ? '#f44336' : '#eee' }}
                  onClick={() => handleSelection(idx, j, false)}>
                  No
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* If results are available, display them */}
      {results && (
        <div style={{ marginTop: '1rem' }}>
          <h3>Recommended Activities</h3>
          {results.length > 0 ? (
            <ul>
              {/* List each result (could be styled as cards as well) */}
              {results.map((activity, i) => (
                <li key={i}>
                  {activity.name || activity.title || JSON.stringify(activity)}
                </li>
              ))}
            </ul>
          ) : (
            <p>No activities found for the selected criteria.</p>
          )}
        </div>
      )}
    </div>
  );
}
