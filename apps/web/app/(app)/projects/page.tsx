import { I } from "@/components/icons";

export default function ProjectsPage() {
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <div
            className="t-eyebrow"
            style={{ color: "var(--studio-violet)", marginBottom: 6 }}
          >
            <I.Folder size={11} style={{ verticalAlign: "-1px" }} /> Coming soon
          </div>
          <h1 className="page__title">Projects</h1>
          <p className="page__sub">
            Group generations by campaign or initiative.
          </p>
        </div>
      </div>
      <div
        className="card card--elevated"
        style={{
          padding: 0,
          overflow: "hidden",
          background:
            "radial-gradient(ellipse 80% 80% at 50% 0%, #E8E7FA 0%, transparent 60%), radial-gradient(ellipse 50% 60% at 100% 80%, #D7E5C7 0%, transparent 60%), white",
        }}
      >
        <div className="empty" style={{ padding: "80px 32px" }}>
          <div
            className="empty__art"
            style={{
              background: "linear-gradient(135deg, #5E5CE6 0%, #B5B4F2 100%)",
              color: "white",
            }}
          >
            <I.Folder size={32} />
          </div>
          <div className="empty__title">Project workspaces are coming</div>
          <div className="empty__sub">
            Soon you&apos;ll group generations by campaign or initiative — keep using
            Brands and History for now.
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 8,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <span className="pill pill--accent">
              <I.Sparkle size={11} /> In design
            </span>
            <span className="pill">
              <I.Calendar size={11} /> ETA Q2 2026
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
