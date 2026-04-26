"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const mainItems = [
  { href: "/generate", label: "Generate", cta: true },
  { href: "/history", label: "History" },
  { href: "/brands", label: "Brands" },
  { href: "/moods", label: "Mood library" },
  { href: "/stock", label: "Stock library" },
];

const footerItems = [
  { href: "/settings", label: "Settings" },
  { href: "/help", label: "Help" },
  { href: "/billing", label: "Billing" },
];

export function Sidebar(props: {
  brands: Array<{ id: string; name: string }>;
  workspaceName: string;
  planCode: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="studio-sidebar-panel">
      <Link className="studio-sidebar-cta" href="/generate">
        Generate
      </Link>

      <nav className="studio-nav-list" aria-label="Main navigation">
        {mainItems.map((item) => (
          <Link
            key={item.href}
            className={`studio-nav-link${pathname === item.href ? " is-active" : ""}${
              item.cta ? " is-cta" : ""
            }`}
            href={item.href}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <section className="studio-sidebar-section">
        <div className="studio-sidebar-label">Brands</div>
        <div className="studio-sidebar-brand-list">
          {props.brands.slice(0, 5).map((brand) => (
            <Link
              key={brand.id}
              className={`studio-brand-mini${pathname === `/brands/${brand.id}` ? " is-active" : ""}`}
              href={`/brands/${brand.id}`}
            >
              <span>{brand.name.slice(0, 2).toUpperCase()}</span>
              <strong>{brand.name}</strong>
            </Link>
          ))}
          <Link className="studio-brand-mini studio-brand-mini--ghost" href="/brands">
            <span>+</span>
            <strong>All brands</strong>
          </Link>
        </div>
      </section>

      <section className="studio-sidebar-section studio-sidebar-footer">
        <div className="studio-plan-spotlight">
          <span className="studio-sidebar-label">Workspace</span>
          <strong>{props.workspaceName}</strong>
          <p>{props.planCode.toUpperCase()} plan with the template-led Studio workflow.</p>
        </div>

        <nav className="studio-nav-list" aria-label="Secondary navigation">
          {footerItems.map((item) => (
            <Link
              key={item.href}
              className={`studio-nav-link${pathname === item.href ? " is-active" : ""}`}
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </section>
    </aside>
  );
}

