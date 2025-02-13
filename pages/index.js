import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  const [tags, setTags] = useState([]);
  const [places, setPlaces] = useState([]);
  const [currentCard, setCurrentCard] = useState(null);
  const [history, setHistory] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const router = useRouter();

  useEffect(() => {
    fetchTags();
  }, []);

  async function fetchTags() {
    let { data, error } = await supabase.from('places').select('tags');
    if (error) console.error(error);
    else {
      const uniqueTags = [...new Set(data.flatMap(place => place.tags))];
      setTags(uniqueTags.map(tag => ({ type: 'tag', value: tag })));
      setCurrentCard(uniqueTags.length ? { type: 'tag', value: uniqueTags[0] } : null);
    }
  }

  async function fetchPlacesByTag(tag) {
    let { data, error } = await supabase
      .from('places')
      .select('*')
      .contains('tags', [tag]);

    if (error) console.error(error);
    else {
      setPlaces(data.map(place => ({ ...place, type: 'place' })));
      if (data.length) {
        setCurrentCard(data[0]); // Show first place matching tag
      } else {
        setCurrentCard(tags.find(t => t.value !== tag)); // Show another tag if no places found
      }
    }
  }

  function handleYes() {
    if (currentCard.type === 'tag') {
      fetchPlacesByTag(currentCard.value); // Load places matching this tag
    } else {
      setFavorites([...favorites, currentCard]); // Save place to favorites
      moveToNext();
    }
  }

  function handleNo() {
    moveToNext();
  }

  function moveToNext() {
    if (currentCard.type === 'tag') {
      // Show another tag if places are not yet being shown
      setCurrentCard(tags.find(t => !history.includes(t)));
    } else {
      // Move to next place or revert to showing a tag
      setPlaces(places.slice(1));
      setCurrentCard(places[1] || tags.find(t => !history.includes(t)));
    }
    setHistory([...history, currentCard]);
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center">
      <header className="w-full bg-blue-600 text-white text-center py-4 text-xl font-bold">
        DialN - Discover Baltimore
      </header>

      <div className="w-full max-w-md mt-8">
        {currentCard ? (
          <div className="bg-white p-6 shadow-md rounded-lg text-center">
            {currentCard.type === 'tag' ? (
              <>
                <h2 className="text-lg font-bold">Explore {currentCard.value}</h2>
                <p>Click Yes to see places tagged with {currentCard.value}</p>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold">{currentCard.name}</h2>
                <p>{currentCard.description}</p>
                <p className="text-sm text-gray-600">{currentCard.address}</p>
                <button
                  onClick={() => router.push(`/place/${currentCard.id}`)}
                  className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
                >
                  View Details
                </button>
              </>
            )}

            <div className="flex justify-center space-x-4 mt-4">
              <button onClick={handleYes} className="bg-green-500 text-white p-2 rounded">
                Yes
              </button>
              <button onClick={handleNo} className="bg-red-500 text-white p-2 rounded">
                No
              </button>
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-600">No more places. Refresh to start over.</p>
        )}
      </div>

      <footer className="w-full bg-blue-600 text-white text-center py-2 mt-auto">
        © 2024 DialN
      </footer>
    </div>
  );
}
