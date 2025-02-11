export default function SearchBar({
  searchTerm,
  setSearchTerm,
  suggestions,
  showSuggestions,
  setShowSearchSuggestions,
  onPick
}) {
  function handleFocus() {
    if (searchTerm) setShowSearchSuggestions(true);
  }

  function handleBlur() {
    setTimeout(() => {
      setShowSearchSuggestions(false);
    }, 200);
  }

  return (
    <div style={styles.searchBarContainer}>
      <input
        style={styles.searchInput}
        type="text"
        placeholder="Type e.g. 'food' or 'Federal Hill'..."
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setShowSearchSuggestions(true);
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div style={styles.suggestionList}>
          {suggestions.map((sug, i) => (
            <div key={i} style={styles.suggestionItem} onClick={() => onPick(sug)}>
              {sug.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  searchBarContainer: { position: "relative", marginTop: "10px" },
  searchInput: { width: "300px", padding: "8px", borderRadius: "5px", border: "1px solid #ccc" },
  suggestionList: { position: "absolute", top: "35px", left: 0, width: "100%", backgroundColor: "#fff", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", borderRadius: "5px" },
  suggestionItem: { padding: "8px", cursor: "pointer", borderBottom: "1px solid #ddd" }
};
