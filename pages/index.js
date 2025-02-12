import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Home() {
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    const { data, error } = await supabase.from('places').select('*').order('id', { ascending: true });
    if (error) console.error('Error fetching places:', error);
    else setCards(data);
  };

  const handleYes = () => {
    console.log('Liked:', cards[currentIndex]);
    goToNextCard();
  };

  const handleNo = () => {
    console.log('Disliked:', cards[currentIndex]);
    goToNextCard();
  };

  const goToNextCard = () => {
    if (currentIndex < cards.length - 1) {
      setHistory([...history, currentIndex]);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goBack = () => {
    if (history.length > 0) {
      const lastIndex = history.pop();
      setHistory([...history]);
      setCurrentIndex(lastIndex);
    }
  };

  const reshuffle = () => {
    setCards([...cards].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setHistory([]);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
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
