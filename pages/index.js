// Pseudocode for the main component render in index.js
export default function Home({ places }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState([]);

  const handleLike = () => {
    setSelected([...selected, places[index]]);
    setIndex(index + 1);
  };
  const handleSkip = () => {
    setIndex(index + 1);
  };

  const currentPlace = places[index];

  return (
    <div className="app">
      {currentPlace ? (
        <SwipeCard place={currentPlace} onLike={handleLike} onSkip={handleSkip} />
      ) : (
        <div className="end-message">No more activities to show!</div>
      )}

      {selected.length > 0 && (
        <div className="matches-section">
          <h2>Your Matches:</h2>
          <ul>
            {selected.map((place) => (
              <li key={place.id}>{place.name} – <em>{place.subcategory_name}</em></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
