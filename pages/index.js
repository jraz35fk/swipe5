import { useState, useEffect } from 'react';
import TinderCard from 'react-tinder-card';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with your project credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function HomePage() {
  const [categories, setCategories] = useState([]);      // Top-level categories
  const [subcategories, setSubcategories] = useState([]); // Subcategories of selected category
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    // Fetch all categories and linking data, then filter for top-level categories
    const loadCategories = async () => {
      const { data: allCategories, error: catError } = await supabase
        .from('categories')
        .select('*');
      const { data: links, error: linkError } = await supabase
        .from('category_parents')
        .select('*');
      if (catError || linkError) {
        console.error(catError || linkError);
        return;
      }
      // Determine top-level categories (those not listed as a child in any link)
      const childIds = links.map((l) => l.child_id);
      const topCategories = allCategories.filter((cat) => !childIds.includes(cat.id));
      // Optional: sort by ID or name for consistent order
      topCategories.sort((a, b) => a.id - b.id);
      setCategories(topCategories);
    };
    loadCategories();
  }, []);

  const handleSwipe = async (direction, cardData) => {
    if (!selectedCategory && direction === 'right') {
      // A category is chosen – load its subcategories
      setSelectedCategory(cardData);  // Save selected category
      const { data: childLinks, error } = await supabase
        .from('category_parents')
        .select('child_id')
        .eq('parent_id', cardData.id);
      if (error) {
        console.error(error);
        return;
      }
      const childIds = childLinks.map((l) => l.child_id);
      const { data: subs, error: subError } = await supabase
        .from('categories')
        .select('*')
        .in('id', childIds);
      if (subError) {
        console.error(subError);
        return;
      }
      // Sort subcategories (optional, e.g. alphabetically or by ID)
      subs.sort((a, b) => a.id - b.id);
      setSubcategories(subs);
    }
  };

  const handleCardLeftScreen = (name, type) => {
    // Remove card from state when it goes off-screen
    if (type === 'category') {
      setCategories((prev) => prev.filter((c) => c.name !== name));
    } else if (type === 'subcategory') {
      setSubcategories((prev) => prev.filter((s) => s.name !== name));
    }
  };

  return (
    <div className="container">
      {!selectedCategory ? (
        // Category cards view
        <div className="cardContainer">
          {categories.map((cat) => (
            <TinderCard
              className="swipe"
              key={cat.id}
              onSwipe={(dir) => handleSwipe(dir, cat)}
              onCardLeftScreen={() => handleCardLeftScreen(cat.name, 'category')}
              preventSwipe={['up', 'down']}
            >
              <div className="card">{cat.name}</div>
            </TinderCard>
          ))}
          {categories.length === 0 && (
            <p>No more categories. (Refresh to start over.)</p>
          )}
        </div>
      ) : (
        // Subcategory cards view (after a category is selected)
        <div className="cardContainer">
          {subcategories.map((sub) => (
            <TinderCard
              className="swipe"
              key={sub.id}
              onSwipe={(dir) => handleSwipe(dir, sub)}
              onCardLeftScreen={() => handleCardLeftScreen(sub.name, 'subcategory')}
              preventSwipe={['up', 'down']}
            >
              <div className="card">{sub.name}</div>
            </TinderCard>
          ))}
          {subcategories.length === 0 && (
            <p>Loading subcategories...</p>
          )}
        </div>
      )}
      {/* Basic styles for the card layout */}
      <style jsx global>{`
        /* Prevent off-screen cards from showing scrollbars */
        body, #__next {
          overflow: hidden;
        }
      `}</style>
      <style jsx>{`
        .container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }
        .cardContainer {
          position: relative;
          width: 300px;
          height: 400px;
        }
        .swipe {
          position: absolute;
        }
        .card {
          background: #fff;
          width: 100%;
          height: 100%;
          padding: 20px;
          box-shadow: 0 0 8px rgba(0,0,0,0.15);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          font-size: 1.2rem;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
