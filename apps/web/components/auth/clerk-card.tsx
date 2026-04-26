import type { ReactNode } from "react";

export function ClerkCard(props: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="studio-auth-shell">
      <div className="studio-auth-card">
        <div className="studio-auth-brand">
          <div className="studio-wordmark__mark">S</div>
          <span>Studio</span>
        </div>
        <header className="studio-auth-head">
          <h1>{props.title}</h1>
          <p>{props.subtitle}</p>
        </header>
        {props.children}
      </div>
    </main>
  );
}

