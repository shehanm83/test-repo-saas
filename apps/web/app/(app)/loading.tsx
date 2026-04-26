export default function Loading() {
  return (
    <div className="page">
      <div className="page__head">
        <div style={{ flex: 1 }}>
          <div
            className="skeleton"
            style={{ width: 120, height: 14, marginBottom: 12 }}
          />
          <div
            className="skeleton"
            style={{ width: 260, height: 32, marginBottom: 8 }}
          />
          <div className="skeleton" style={{ width: 380, height: 14 }} />
        </div>
        <div
          className="skeleton"
          style={{ width: 140, height: 36, borderRadius: 8 }}
        />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="skeleton" style={{ height: 88, borderRadius: 0 }} />
            <div style={{ padding: 20 }}>
              <div
                className="skeleton"
                style={{ width: "70%", height: 18, marginBottom: 8 }}
              />
              <div
                className="skeleton"
                style={{ width: "50%", height: 12, marginBottom: 16 }}
              />
              <div className="skeleton" style={{ height: 18 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
