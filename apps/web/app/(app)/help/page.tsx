import { I } from "@/components/icons";

export default function HelpPage() {
  const items = [
    {
      icon: <I.Sparkle size={16} />,
      title: "Generate your first image",
      body: "Pick an output target, write a brief, choose a brand, optionally a mood, click Generate. You'll get 4 variants in ~30 seconds.",
    },
    {
      icon: <I.Briefcase size={16} />,
      title: "Brand kit",
      body: "Upload a logo, paste your palette, pick fonts, write voice notes. Studio uses these to ground every generation.",
    },
    {
      icon: <I.Library size={16} />,
      title: "Moods",
      body: "Curated style packs that blend with your brand. Christmas, Midsummer, Minimalist Tech. Combine seasonal flavor without abandoning your palette.",
    },
    {
      icon: <I.Coin size={16} />,
      title: "Credits",
      body: "Standard variant: 5 credits. Premium model: 15 credits. Inspiration upload: +4 credits. Top-up packs never expire.",
    },
  ];
  return (
    <div className="page page--narrow">
      <div className="page__head">
        <div>
          <h1 className="page__title">Help</h1>
          <p className="page__sub">
            Quick guidance for generation, brands, moods, billing, and admin operations.
          </p>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((it) => (
          <div
            key={it.title}
            className="card"
            style={{
              padding: 20,
              display: "grid",
              gridTemplateColumns: "32px 1fr",
              gap: 16,
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "var(--studio-violet-50)",
                color: "var(--studio-violet)",
                display: "grid",
                placeItems: "center",
              }}
            >
              {it.icon}
            </div>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 16,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                {it.title}
              </div>
              <div className="t-small" style={{ fontSize: 14 }}>
                {it.body}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
