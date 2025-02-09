import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client using environment variables (must be prefixed with NEXT_PUBLIC_ for client-side use)&#8203;:contentReference[oaicite:4]{index=4}
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function HomePage() {
  // State for each level of the decision tree
  const [categories, setCategories] = useState([]);
  const [catIndex, setCatIndex] = useState(0);
  const [subcategories, setSubcategories] = useState([]);
  const [subcatIndex, setSubcatIndex] = useState(0);
  const [activities, setActivities] = useState([]);
  const [actIndex, setActIndex] = useState(0);

  const [currentLevel, setCurrentLevel] = useState('category');  // 'category' | 'subcategory' | 'activity'
  const [path, setPath] = useState([]);  // Breadcrumb path of chosen items (categories/subcategories)

  // Load top-level categories on initial render
  useEffect(() => {
    const loadCategories = async () => {
      const { data, error } = await supabase.from('categories').select('*');
      if (error) {
        console.error('Error loading categories:', error);
      } else {
        setCategories(data);
        setCatIndex(0);
        setCurrentLevel('category');
      }
    };
    loadCategories();
  }, []);

  // Helper to get the current item based on level
  const currentItem = 
    currentLevel === 'category' ? categories[catIndex] 
    : currentLevel === 'subcategory' ? subcategories[subcatIndex] 
    : activities[actIndex];

  // Handle the "Yes" action
  const handleYes = async () => {
    if (!currentItem) return;
    if (currentLevel === 'category') {
      // User accepts this category: add to path and load its subcategories
      setPath(prev => [...prev, currentItem.name || currentItem.title]);  // Use name/title for breadcrumb
      const { data, error } = await supabase
        .from('subcategories')
        .select('*')
        .eq('category_id', currentItem.id);  // Fetch subcategories for this category&#8203;:contentReference[oaicite:5]{index=5}
      if (error) {
        console.error('Error loading subcategories:', error);
      } else {
        setSubcategories(data || []);
        setSubcatIndex(0);
        setCurrentLevel('subcategory');
      }
      // Note: we keep catIndex at the current category so that Go Back can return here
    } else if (currentLevel === 'subcategory') {
      // User accepts this subcategory: add to path and load its activities
      setPath(prev => [...prev, currentItem.name || currentItem.title]);
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('subcategory_id', currentItem.id);  // Fetch activities for this subcategory&#8203;:contentReference[oaicite:6]{index=6}
      if (error) {
        console.error('Error loading activities:', error);
      } else {
        setActivities(data || []);
        setActIndex(0);
        setCurrentLevel('activity');
      }
      // Keep subcatIndex at current so Go Back returns here
    } else if (currentLevel === 'activity') {
      // User accepts an activity – this could be the final selection
      setPath(prev => [...prev, currentItem.name || currentItem.title]);
      alert(`You selected: ${currentItem.name || currentItem.title}!`);  // final selection (could be replaced with a nicer UI)
      // Reset (or handle end of flow as needed)
      // Here we simply reset to start over after a selection
      setCategories([]); setCatIndex(0);
      setSubcategories([]); setSubcatIndex(0);
      setActivities([]); setActIndex(0);
      setCurrentLevel('category');
      setPath([]);
      // Reload categories to restart (optional)
      const { data, error } = await supabase.from('categories').select('*');
      if (!error) {
        setCategories(data || []);
        setCatIndex(0);
      }
    }
  };

  // Handle the "No" action
  const handleNo = () => {
    if (currentLevel === 'category') {
      // Skip this category, go to next category
      if (catIndex < categories.length - 1) {
        setCatIndex(catIndex + 1);
      } else {
        // No more categories – end of list
        console.log('No more categories to show.');
      }
      // (Optionally handle end-of-list for categories, e.g., show a message)
    } else if (currentLevel === 'subcategory') {
      if (subcatIndex < subcategories.length - 1) {
        // Go to next subcategory within the same category
        setSubcatIndex(subcatIndex + 1);
      } else {
        // No more subcategories in this category – go back to category level
        // Remove last category from path (user didn't find a suitable subcategory)
        setPath(prev => prev.slice(0, -1));
        if (catIndex < categories.length - 1) {
          // Move to next category
          setCatIndex(catIndex + 1);
          setCurrentLevel('category');
        } else {
          // No more categories left
          console.log('No more categories to show.');
          setCurrentLevel('category');
        }
      }
    } else if (currentLevel === 'activity') {
      if (actIndex < activities.length - 1) {
        // Show next activity in the same subcategory
        setActIndex(actIndex + 1);
      } else {
        // No more activities in this subcategory – go back to subcategory level
        // Remove last subcategory from path (no activity was suitable)
        setPath(prev => prev.slice(0, -1));
        if (subcatIndex < subcategories.length - 1) {
          // Move to next subcategory in the same category
          setSubcatIndex(subcatIndex + 1);
          setCurrentLevel('subcategory');
        } else {
          // No more subcategories left in this category – go back to category level
          setPath(prev => prev.slice(0, -1));  // remove category as well
          if (catIndex < categories.length - 1) {
            setCatIndex(catIndex + 1);
            setCurrentLevel('category');
          } else {
            console.log('No more categories to show.');
            setCurrentLevel('category');
          }
        }
      }
    }
  };

  // Handle the "Go Back" action
  const handleGoBack = () => {
    if (currentLevel === 'subcategory') {
      // Go back from subcategory level to category level
      setCurrentLevel('category');
      // Remove the last category from path (undo choosing this category)
      setPath(prev => prev.slice(0, -1));
    } else if (currentLevel === 'activity') {
      // Go back from activity level to subcategory level
      setCurrentLevel('subcategory');
      // Remove the last subcategory from path (undo choosing this subcategory)
      setPath(prev => prev.slice(0, -1));
    } else {
      // If at category level (top), there's no parent to go back to
      console.log('Already at top level. Cannot go back further.');
    }
  };

  // Determine the title to display at bottom of card (if currentItem exists)
  const currentTitle = currentItem ? (currentItem.title || currentItem.name) : '';

  // Simple styles for responsiveness and card layout
  const containerStyle = {
    maxWidth: '500px', margin: '0 auto', padding: '1rem',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
    height: '100vh'  // use full viewport height for a phone-like feel
  };
  const breadcrumbStyle = {
    alignSelf: 'flex-start', fontSize: '0.9rem', color: '#555'
  };
  const cardStyle = {
    flex: '1 1 auto', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    width: '100%', maxHeight: '80vh',
    background: '#f0f0f0', borderRadius: '8px', padding: '1rem',
    textAlign: 'center', position: 'relative'
  };
  const titleStyle = {
    position: 'absolute', bottom: '1rem', width: '100%',
    textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem'
  };
  const buttonsContainerStyle = {
    display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '1rem'
  };
  const buttonStyle = {
    flex: '1 1 30%', padding: '0.5rem', fontSize: '1rem',
    border: 'none', borderRadius: '5px'
  };

  return (
    <div style={containerStyle}>
      {/* Breadcrumb Path */}
      <div style={breadcrumbStyle}>
        {path.length > 0 ? path.join(' > ') : ''}
      </div>

      {/* Card Display */}
      <div style={cardStyle}>
        {currentItem ? (
          <>
            {/* You can display more content about currentItem here if needed */}
            <div style={titleStyle}>
              {currentTitle || '(No selection)'}
            </div>
          </>
        ) : (
          <div style={titleStyle}>
            {currentLevel === 'category' ? 'No categories available' : 
             currentLevel === 'subcategory' ? 'No subcategories available' : 
             'No activities available'}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={buttonsContainerStyle}>
        <button 
          onClick={handleYes} 
          style={{ ...buttonStyle, background: '#4caf50', color: '#fff', marginRight: '0.5rem' }}
        >
          Yes
        </button>
        <button 
          onClick={handleNo} 
          style={{ ...buttonStyle, background: '#f44336', color: '#fff', marginRight: '0.5rem' }}
        >
          No
        </button>
        <button 
          onClick={handleGoBack} 
          style={{ ...buttonStyle, background: '#9e9e9e', color: '#fff' }}
          disabled={currentLevel === 'category'}  /* disable Go Back at root level */
        >
          Go Back
        </button>
      </div>
    </div>
  );
}
