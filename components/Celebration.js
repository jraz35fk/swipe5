export default function Celebration() {
  return (
    <div style={styles.celebrationOverlay}>
      <div style={styles.celebrationBox}>
        <h2 style={{ margin: 0 }}>MATCH!</h2>
        <p>Great choice!</p>
      </div>
    </div>
  );
}

const styles = {
  celebrationOverlay: { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 },
  celebrationBox: { backgroundColor: "#fff", padding: "30px", borderRadius: "10px", textAlign: "center", boxShadow: "0 4px 8px rgba(0,0,0,0.3)" }
};
