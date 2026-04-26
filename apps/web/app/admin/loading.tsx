export default function AdminLoading() {
  return (
    <div className="page page--wide">
      <div className="page__head">
        <div style={{ flex: 1 }}>
          <div
            className="skeleton"
            style={{ width: 120, height: 14, marginBottom: 12 }}
          />
          <div
            className="skeleton"
            style={{ width: 280, height: 28, marginBottom: 8 }}
          />
          <div className="skeleton" style={{ width: 360, height: 14 }} />
        </div>
      </div>

      <div
        className="card"
        style={{
          padding: 24,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 24,
          marginBottom: 16,
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div key={i}>
            <div
              className="skeleton"
              style={{ width: 80, height: 12, marginBottom: 8 }}
            />
            <div className="skeleton" style={{ width: 140, height: 22 }} />
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div
          style={{
            padding: 16,
            borderBottom: "1px solid var(--cal-gray-200)",
            background: "var(--cal-gray-50)",
          }}
        >
          <div className="skeleton" style={{ width: 100, height: 12 }} />
        </div>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              padding: 16,
              borderTop: i > 0 ? "1px solid var(--cal-gray-200)" : 0,
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 16,
              alignItems: "center",
            }}
          >
            <div>
              <div
                className="skeleton"
                style={{ width: "60%", height: 14, marginBottom: 6 }}
              />
              <div className="skeleton" style={{ width: "40%", height: 12 }} />
            </div>
            <div className="skeleton" style={{ width: 80, height: 22, borderRadius: 100 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
