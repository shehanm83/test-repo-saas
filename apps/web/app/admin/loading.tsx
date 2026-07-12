import { AdminPage, AdminSection, AdminStatGrid } from "@/components/admin/ui";

export default function AdminLoading() {
  return (
    <AdminPage
      wide
      eyebrow={<div className="skeleton" style={{ width: 120, height: 14 }} />}
      title={<div className="skeleton" style={{ width: 280, height: 28 }} />}
      description={<div className="skeleton" style={{ width: 360, height: 14 }} />}
    >
      <AdminStatGrid>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="admin-stat">
            <div className="skeleton" style={{ width: 80, height: 12 }} />
            <div className="skeleton" style={{ width: 140, height: 22 }} />
            <div className="skeleton" style={{ width: 110, height: 12 }} />
          </div>
        ))}
      </AdminStatGrid>

      <AdminSection title={<div className="skeleton" style={{ width: 100, height: 12 }} />} flush>
        <div className="admin-list">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="admin-list-row">
              <div>
                <div className="skeleton" style={{ width: "60%", height: 14, marginBottom: 6 }} />
                <div className="skeleton" style={{ width: "40%", height: 12 }} />
              </div>
              <div className="skeleton" style={{ width: 80, height: 22, borderRadius: 100 }} />
            </div>
          ))}
        </div>
      </AdminSection>
    </AdminPage>
  );
}
