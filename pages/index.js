import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Swipeable from 'react-swipeable-cards';
import { useRouter } from 'next/router';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  const [places, setPlaces] = useState([]);
  const [filteredPlaces, setFilteredPlaces] = useState([]);
  const [personaFilter, setPersonaFilter] = useState(null);
  const [neighborhoodFilter, setNeighborhoodFilter] = useState(null);
  const [tagsFilter, setTagsFilter] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const router = useRouter();

  useEffect(() => {
    fetchPlaces();
  }, []);

  async function fetchPlaces() {
    let { data, error } = await supabase.from('places').select('*');
    if (error) console.error(error);
    else setPlaces(data);
  }

  function applyFilters() {
    let results = places;
    if (personaFilter) {
      results = results.filter(place => place.persona === personaFilter);
    }
    if (neighborhoodFilter) {
      results = results.filter(place => place.neighborhood_id === neighborhoodFilter);
    }
    if (tagsFilter.length > 0) {
      results = results.filter(place => tagsFilter.some(tag => place.tags.includes(tag)));
    }
    setFilteredPlaces(results);
  }

  function handleSwipeRight(place) {
    setFavorites([...favorites, place]);
  }

  function handleSwipeLeft() {
    setFilteredPlaces(filteredPlaces.slice(1));
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center">
      <header className="w-full bg-blue-600 text-white text-center py-4 text-xl font-bold">
        DialN - Discover Baltimore
      </header>

      <div className="flex justify-center space-x-4 mt-4">
        <select onChange={(e) => setPersonaFilter(e.target.value)} className="p-2 border rounded">
          <option value="">Select Persona</option>
          <option value="Foodie">Foodie</option>
          <option value="Socialite">Socialite</option>
          <option value="Adventurer">Adventurer</option>
          <option value="Curator">Curator</option>
        </select>

        <select onChange={(e) => setNeighborhoodFilter(e.target.value)} className="p-2 border rounded">
          <option value="">Select Neighborhood</option>
          <option value="1">Fells Point</option>
          <option value="2">Canton</option>
          <option value="3">Hampden</option>
          <option value="4">Federal Hill</option>
        </select>

        <button onClick={applyFilters} className="bg-green-500 text-white p-2 rounded">
          Apply Filters
        </button>
      </div>

      <div className="w-full max-w-md mt-8">
        {filteredPlaces.length > 0 ? (
          <Swipeable
            items={filteredPlaces}
            onSwipeRight={handleSwipeRight}
            onSwipeLeft={handleSwipeLeft}
            renderItem={(place) => (
              <div className="bg-white p-4 shadow-md rounded-lg text-center">
                <h2 className="text-lg font-bold">{place.name}</h2>
                <p>{place.description}</p>
                <p className="text-sm text-gray-600">{place.address}</p>
                <Link href={`/place/${place.id}`}>
                  <a className="text-blue-500 underline">View Details</a>
                </Link>
              </div>
            )}
          />
        ) : (
          <p className="text-center text-gray-600">No places available. Try adjusting filters.</p>
        )}
      </div>

      <footer className="w-full bg-blue-600 text-white text-center py-2 mt-auto">
        © 2024 DialN
      </footer>
    </div>
  );
}
