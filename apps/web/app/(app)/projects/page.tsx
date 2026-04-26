import { I } from "@/components/icons";

export default function ProjectsPage() {
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Projects</h1>
          <p className="page__sub">
            Group generations by campaign or initiative. Coming next.
          </p>
        </div>
      </div>
      <div className="empty card">
        <div className="empty__art">
          <I.Folder size={28} />
        </div>
        <div className="empty__title">No projects yet</div>
        <div className="empty__sub">
          Use brands and history for now while project workflows are being expanded.
        </div>
      </div>
    </div>
  );
}
