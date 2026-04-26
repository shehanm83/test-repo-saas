import Link from "next/link";
import React from "react";

const brands = [
  { name: "Northwind Coffee", mark: "NW" },
  { name: "Lumen Studio", mark: "LU" },
  { name: "Atlas Outdoors", mark: "AT" },
];

const sidebarItems = [
  { href: "/generate", label: "Generate", active: true },
  { href: "#", label: "History" },
  { href: "#", label: "Brands" },
  { href: "#", label: "Projects" },
  { href: "#", label: "Mood library" },
  { href: "#", label: "Stock library" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="studio-app-shell">
      <header className="studio-topbar">
        <div className="studio-wordmark">
          <div className="studio-wordmark__mark">S</div>
          <span>Studio</span>
        </div>
        <div className="studio-workspace-pill">
          <span className="studio-workspace-pill__dot" />
          <span>Northwind Coffee</span>
        </div>
        <div className="studio-topbar__spacer" />
        <div className="studio-credit-pill">847 credits</div>
        <div className="studio-avatar">SF</div>
      </header>

      <div className="studio-frame">
        <aside className="studio-sidebar">
          <Link className="studio-cta-link" href="/generate">
            Generate
          </Link>

          <nav className="studio-nav">
            {sidebarItems.map((item) => (
              <Link
                key={item.label}
                className={`studio-nav__item${item.active ? " is-active" : ""}`}
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <section className="studio-sidebar__section">
            <div className="studio-sidebar__label">Brands</div>
            <div className="studio-brand-list">
              {brands.map((brand) => (
                <div key={brand.name} className="studio-brand-chip">
                  <span>{brand.mark}</span>
                  <strong>{brand.name}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="studio-sidebar__section studio-sidebar__footer">
            <div className="studio-plan-card">
              <span className="studio-plan-card__eyebrow">Plan</span>
              <strong>Pro workspace</strong>
              <p>Template-led generation flow aligned with the approved Studio UI direction.</p>
            </div>
          </section>
        </aside>

        <section className="studio-main">{children}</section>
      </div>
    </main>
  );
}
