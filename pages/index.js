import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (use your own URL and anon key from environment variables)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Home() {
  // State variables for current options list, current index, level type, and navigation history and matches
  const [options, setOptions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentLevel, setCurrentLevel] = useState('category'); // 'category' or 'place'
  const [history, setHistory] = useState([]);
  const [matchedPlaces, setMatchedPlaces] = useState([]);

  // Fetch top-level categories on initial load
  useEffect(() => {
    const fetchTopCategories = async () => {
      let { data: topCategories } = await supabase
        .from('categories')
        .select('*')
        .is('parent_id', null)
        .order('ranking_score', { ascending: false });
      setOptions(topCategories || []);
      setCurrentIndex(0);
      setCurrentLevel('category');
    };
    fetchTopCategories();
  }, []);

  const handleYes = async () => {
    if (currentIndex >= options.length) return;
    const currentItem = options[currentIndex];
    if (currentLevel === 'category') {
      // Check for subcategories of the chosen category
      let { data: subCategories } = await supabase
        .from('categories')
        .select('*')
        .eq('parent_id', currentItem.id)
        .order('ranking_score', { ascending: false });
      if (subCategories && subCategories.length > 0) {
        // Push current context to history (skip the accepted category on return)
        setHistory(prev => [...prev, {
          level: 'category',
          options: options,
          index: currentIndex + 1
        }]);
        // Update to show subcategories
        setOptions(subCategories);
        setCurrentIndex(0);
        setCurrentLevel('category');
      } else {
        // No subcategories, fetch places for this final category
        let { data: places } = await supabase
          .from('places')
          .select('*')
          .eq('category_id', currentItem.id)
          .order('ranking_score', { ascending: false });
        // Push current category context to history
        setHistory(prev => [...prev, {
          level: 'category',
          options: options,
          index: currentIndex + 1
        }]);
        // Show places in this category
        setOptions(places || []);
        setCurrentIndex(0);
        setCurrentLevel('place');
      }
    } else if (currentLevel === 'place') {
      // User liked a place
      const currentPlace = options[currentIndex];
      setMatchedPlaces(prev => {
        // Avoid duplicates in matched list (in case of accidental double yes)
        if (!prev.find(p => p.id === currentPlace.id)) {
          return [...prev, currentPlace];
        }
        return prev;
      });
      // Move to next place
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleNo = () => {
    if (currentIndex >= options.length) return;
    // Simply advance to next option
    setCurrentIndex(prev => prev + 1);
  };

  const handleBack = () => {
    if (history.length === 0) return;
    // Copy history to manipulate
    let newHistory = [...history];
    let prevContext = newHistory.pop();
    // If the previous context is a category level with no remaining options (exhausted),
    // continue popping back
    while (prevContext && prevContext.index >= prevContext.options.length && newHistory.length > 0) {
      prevContext = newHistory.pop();
    }
    if (!prevContext) {
      // Nothing to go back to (already at top level)
      return;
    }
    // Restore previous context
    setHistory(newHistory);
    setOptions(prevContext.options);
    setCurrentIndex(prevContext.index);
    setCurrentLevel(prevContext.level);
  };

  const handleReset = async () => {
    // Clear navigation history and go back to top-level categories
    setHistory([]);
    let { data: topCategories } = await supabase
      .from('categories')
      .select('*')
      .is('parent_id', null)
      .order('ranking_score', { ascending: false });
    setOptions(topCategories || []);
    setCurrentIndex(0);
    setCurrentLevel('category');
    // (Optionally, we keep matched places intact so user can see their deck across sessions)
  };

  // Determine what to display for current card
  let currentCard = null;
  if (currentIndex < options.length) {
    if (currentLevel === 'category') {
      currentCard = (
        <div className="card category-card">
          <h2>{options[currentIndex].name}</h2>
        </div>
      );
    } else if (currentLevel === 'place') {
      const place = options[currentIndex];
      currentCard = (
        <div className="card place-card">
          <h2>{place.name}</h2>
          <p>{place.description}</p>
          <p><em>{place.location}</em></p>
        </div>
      );
    }
  } else {
    // No more options at this level
    if (history.length === 0) {
      currentCard = <div className="card"><p>No more options available.</p></div>;
    } else {
      currentCard = <div className="card"><p>No more options here. You can go back or start over.</p></div>;
    }
  }

  return (
    <div className="container">
      <div className="controls">
        <button onClick={handleBack} disabled={history.length === 0}>Go Back</button>
        <button onClick={handleReset}>Start Over</button>
      </div>
      <div className="swipe-deck">
        {currentCard}
        <div className="decision-buttons">
          <button onClick={handleNo} disabled={currentIndex >= options.length}>No</button>
          <button onClick={handleYes} disabled={currentIndex >= options.length}>Yes</button>
        </div>
      </div>
      {matchedPlaces.length > 0 && (
        <div className="match-deck">
          <h3>Matched Locations:</h3>
          <ul>
            {matchedPlaces.map(place => (
              <li key={place.id}>{place.name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
