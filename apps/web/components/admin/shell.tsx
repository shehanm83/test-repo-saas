"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin/moods", label: "Moods" },
  { href: "/admin/templates", label: "Templates" },
  { href: "/admin/stock", label: "Stock" },
  { href: "/admin/pricebook", label: "Pricebook" },
  { href: "/admin/generations", label: "Generations" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/aup", label: "AUP" },
];

export function AdminShell(props: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="studio-admin-shell">
      <aside className="studio-admin-rail">
        <div className="studio-admin-badge">ADMIN</div>
        <nav className="studio-admin-nav">
          {items.map((item) => (
            <Link
              key={item.href}
              className={`studio-admin-link${pathname === item.href ? " is-active" : ""}`}
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="studio-admin-main">{props.children}</main>
    </div>
  );
}

