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
  searchBarContainer: { position: "relative" },
  searchInput: { width: "220px", padding: "6px", borderRadius: "4px", border: "1px solid #888" },
  suggestionList: { position: "absolute", top: "35px", left: 0, width: "220px", backgroundColor: "#333", borderRadius: "4px", zIndex: 9999, maxHeight: "140px", overflowY: "auto" },
  suggestionItem: { padding: "5px", color: "#fff", cursor: "pointer", borderBottom: "1px solid #555" },
};
