export default function MatchDeck({
  matches,
  newMatchesCount,
  matchDeckOpen,
  setMatchDeckOpen,
  setNewMatchesCount
}) {
  return (
    <div style={styles.matchDeckBtnContainer}>
      <button
        style={styles.matchDeckButton}
        onClick={() => {
          setMatchDeckOpen(true);
          setNewMatchesCount(0);
        }}
      >
        Matches {newMatchesCount > 0 && `(+${newMatchesCount})`}
      </button>
    </div>
  );
}

const styles = {
  matchDeckBtnContainer: { textAlign: "center", marginTop: "10px" },
  matchDeckButton: { backgroundColor: "#ff9800", color: "#fff", padding: "10px 20px", borderRadius: "5px", cursor: "pointer", fontSize: "1.1em" }
};
