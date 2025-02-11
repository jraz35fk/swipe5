export default function MatchDeckOverlay({ matches, onClose }) {
  return (
    <div style={styles.matchDeckOverlay}>
      <div style={styles.matchDeckBox}>
        <h2>Match Deck</h2>
        <button onClick={onClose} style={styles.closeDeckButton}>Close</button>
        {matches.length === 0 ? (
          <p>No matches yet.</p>
        ) : (
          <ul>
            {matches.map((m, i) => (
              <li key={i}>
                <strong>{m.name}</strong>
                {m.neighborhood && ` - ${m.neighborhood}`}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const styles = {
  matchDeckOverlay: { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10000 },
  matchDeckBox: { backgroundColor: "#fff", padding: "20px", borderRadius: "8px", width: "400px", maxHeight: "70vh", overflowY: "auto", position: "relative" },
  closeDeckButton: { position: "absolute", top: "10px", right: "10px", padding: "5px 10px", backgroundColor: "red", color: "white", borderRadius: "5px", cursor: "pointer" }
};
