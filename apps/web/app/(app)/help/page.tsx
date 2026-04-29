import { I } from "@/components/icons";

export default function HelpPage() {
  const items = [
    {
      icon: <I.Sparkle size={22} />,
      title: "Generate your first image",
      body: "Pick an output target, write a brief, choose a brand, optionally a mood, click Generate. You'll get 4 variants in ~30 seconds.",
      bg: "linear-gradient(135deg, #FFE5C7, #FBC8A6)",
      iconBg: "#C97A3F",
    },
    {
      icon: <I.Briefcase size={22} />,
      title: "Brand kit",
      body: "Upload a logo, paste your palette, pick fonts, write voice notes. Vyora uses these to ground every generation.",
      bg: "linear-gradient(135deg, #E8E7FA, #D4D2F5)",
      iconBg: "#5E5CE6",
    },
    {
      icon: <I.Library size={22} />,
      title: "Moods",
      body: "Curated style packs that blend with your brand. Christmas, Midsummer, Minimalist Tech. Combine seasonal flavor without abandoning your palette.",
      bg: "linear-gradient(135deg, #D7E5C7, #B8D4A0)",
      iconBg: "#1F7A5A",
    },
    {
      icon: <I.Coin size={22} />,
      title: "Credits",
      body: "Standard variant: 5 credits. Premium model: 15 credits. Inspiration upload: +4 credits. Top-up packs never expire.",
      bg: "linear-gradient(135deg, #FCE5C5, #F8D8D8)",
      iconBg: "#7A0E0E",
    },
  ];
  return (
    <div className="page page--narrow">
      <div className="page__head">
        <div>
          <div
            className="t-eyebrow"
            style={{ color: "var(--studio-violet)", marginBottom: 6 }}
          >
            <I.HelpCircle size={11} style={{ verticalAlign: "-1px" }} /> Quickstart
          </div>
          <h1 className="page__title">Help</h1>
          <p className="page__sub">
            Quick guidance for generation, brands, moods, and billing.
          </p>
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
        }}
      >
        {items.map((it) => (
          <div
            key={it.title}
            className="card"
            style={{ padding: 0, overflow: "hidden", background: "white" }}
          >
            <div
              style={{
                background: it.bg,
                padding: "28px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background: it.iconBg,
                  color: "white",
                  display: "grid",
                  placeItems: "center",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                }}
              >
                {it.icon}
              </div>
            </div>
            <div style={{ padding: 22 }}>
              <h3 className="t-h4" style={{ margin: "0 0 8px" }}>
                {it.title}
              </h3>
              <p className="t-body-muted" style={{ margin: 0, fontSize: 14 }}>
                {it.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
