import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Home() {
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState([]);
  const [layer, setLayer] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchLayerCards(1, null);
  }, []);

  const fetchLayerCards = async (layer, parentId) => {
    let query;
    if (layer === 1) {
      query = supabase.from('taxonomy').select('*').order('id', { ascending: true }).limit(5);
    } else {
      query = supabase.from('taxonomy').select('*').eq('parent_id', parentId);
      
      const { data: subcategories, error } = await query;
      if (error) console.error('Error fetching subcategories:', error);
      else if (subcategories.length > 0) {
        setCards(subcategories);
        setLayer(layer + 1);
        return;
      }
      
      query = supabase.from('place_taxonomy').select('place_id, places(*)').eq('taxonomy_id', parentId);
    }
    
    const { data, error } = await query;
    if (error) console.error('Error fetching cards:', error);
    else {
      setCards(data.map(d => d.places || d));
      setCurrentIndex(0);
    }
  };

  const handleYes = () => {
    if (layer < 3) {
      setSelectedCategories([...selectedCategories, cards[currentIndex].name]);
      fetchLayerCards(layer + 1, cards[currentIndex].id);
    } else {
      console.log('Matched Place:', cards[currentIndex]);
    }
    goToNextCard();
  };

  const handleNo = () => {
    goToNextCard();
  };

  const goToNextCard = () => {
    if (currentIndex < cards.length - 1) {
      setHistory([...history, { index: currentIndex, layer }]);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goBack = () => {
    if (history.length > 0) {
      const lastState = history.pop();
      setHistory([...history]);
      setCurrentIndex(lastState.index);
      setLayer(lastState.layer);
    }
  };

  const reshuffle = () => {
    setCards([...cards].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setHistory([]);
  };

  const handleSearch = async () => {
    const { data, error } = await supabase.from('taxonomy').select('*').ilike('name', `%${searchQuery}%`);
    if (error) console.error('Error searching:', error);
    else setCards(data);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <input
        type="text"
        placeholder="Search categories..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="p-2 border rounded mb-4"
      />
      <button onClick={handleSearch} className="mb-4 bg-gray-700 text-white px-4 py-2 rounded">Search</button>
      {cards.length > 0 && currentIndex < cards.length ? (
        <div className="bg-white p-6 rounded-lg shadow-lg text-center w-96">
          <h2 className="text-xl font-bold mb-2">{cards[currentIndex].name}</h2>
          <p className="text-gray-600 mb-4">{cards[currentIndex].description}</p>
          <div className="flex justify-between mt-4">
            <button onClick={handleNo} className="bg-red-500 text-white px-4 py-2 rounded">No</button>
            <button onClick={goBack} className="bg-gray-500 text-white px-4 py-2 rounded">Go Back</button>
            <button onClick={handleYes} className="bg-green-500 text-white px-4 py-2 rounded">Yes</button>
          </div>
        </div>
      ) : (
        <p className="text-gray-600">No more cards available.</p>
      )}
      <button onClick={reshuffle} className="mt-4 bg-blue-500 text-white px-4 py-2 rounded">Reshuffle</button>
    </div>
  );
}
