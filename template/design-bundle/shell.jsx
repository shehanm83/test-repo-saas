// Studio app shell — top bar, sidebar, router

const { useState, useEffect, useRef, useMemo, createContext, useContext } = React;

// ---------- Hash router ----------
function useHashRoute() {
  const [route, setRoute] = useState(() => window.location.hash.slice(1) || "/landing");
  useEffect(() => {
    const onHash = () => setRoute(window.location.hash.slice(1) || "/landing");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const navigate = (path) => { window.location.hash = path; window.scrollTo(0, 0); };
  return [route, navigate];
}

// ---------- Toast system ----------
const ToastCtx = createContext({ push: () => {} });
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = (msg) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2800);
  };
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="toast-root">
        {toasts.map(t => (
          <div key={t.id} className="toast">
            <I.CheckCircle size={16} />{t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
const useToast = () => useContext(ToastCtx);

// ---------- App store (very small global) ----------
const StoreCtx = createContext(null);
function StoreProvider({ children }) {
  const [credits, setCredits] = useState(847);
  const [activeBrandId, setActiveBrandId] = useState("northwind");
  const [history, setHistory] = useState(HISTORY);
  const [moods] = useState(MOODS);
  const value = { credits, setCredits, activeBrandId, setActiveBrandId, history, setHistory, moods };
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
const useStore = () => useContext(StoreCtx);

// ---------- Studio logo mark ----------
function StudioMark({ size = 24 }) {
  return (
    <div className="topbar__brand-mark" style={{ width: size, height: size, fontSize: size * 0.55 }}>
      <span style={{ marginTop: -1 }}>S</span>
    </div>
  );
}

// ---------- Top bar ----------
function TopBar({ navigate, route }) {
  const { credits, activeBrandId, setActiveBrandId } = useStore();
  const [wsOpen, setWsOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const activeBrand = BRANDS.find(b => b.id === activeBrandId) || BRANDS[0];
  const wsRef = useRef(null);
  const userRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (wsRef.current && !wsRef.current.contains(e.target)) setWsOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="topbar">
      <div className="topbar__brand" onClick={() => navigate("/generate")} style={{ cursor: "pointer" }}>
        <StudioMark />
        <span>Studio</span>
      </div>
      <div className="divider-y" style={{ height: 24 }} />
      <div ref={wsRef} style={{ position: "relative" }}>
        <div className="workspace-switcher" onClick={() => setWsOpen(o => !o)}>
          <span className="workspace-switcher__dot" style={{ background: activeBrand.dot }} />
          <span style={{ fontWeight: 500, fontSize: 14 }}>{activeBrand.name}</span>
          <I.ChevronDown size={14} style={{ color: "var(--fg-3)" }} />
        </div>
        {wsOpen && (
          <div className="menu" style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, minWidth: 240 }}>
            <div style={{ padding: "6px 10px", fontSize: 11, fontWeight: 600, color: "var(--fg-4)", textTransform: "uppercase", letterSpacing: 0.4 }}>Workspaces</div>
            {BRANDS.map(b => (
              <div key={b.id} className="menu-item" onClick={() => { setActiveBrandId(b.id); setWsOpen(false); }}>
                <span style={{ width: 8, height: 8, borderRadius: 100, background: b.dot }} />
                <span>{b.name}</span>
                {b.id === activeBrandId && <I.Check size={14} style={{ marginLeft: "auto", color: "var(--fg-1)" }} />}
              </div>
            ))}
            <div className="menu-divider" />
            <div className="menu-item"><I.Plus size={14}/> Create new workspace</div>
          </div>
        )}
      </div>

      <div className="grow" />

      <button className="pill pill--ring" style={{ height: 30, paddingRight: 4 }}>
        <I.Zap size={12} style={{ color: "var(--studio-violet)" }}/>
        <span style={{ color: "var(--fg-1)", fontWeight: 600 }}>{credits.toLocaleString()}</span>
        <span style={{ color: "var(--fg-3)" }}>credits</span>
        <span style={{ width: 22, height: 22, borderRadius: 6, display: "grid", placeItems: "center", background: "var(--cal-gray-100)", marginLeft: 4 }} onClick={(e)=>{e.stopPropagation(); navigate("/billing")}}>
          <I.Plus size={12}/>
        </span>
      </button>

      <button className="btn btn--icon btn--ghost" title="Notifications"><I.Bell size={16}/></button>

      <div ref={userRef} style={{ position: "relative" }}>
        <button className="btn btn--icon btn--ghost" onClick={() => setUserOpen(o => !o)} style={{ width: 32, height: 32, borderRadius: 100, background: "var(--cal-charcoal)", color: "white" }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>SF</span>
        </button>
        {userOpen && (
          <div className="menu" style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, minWidth: 220 }}>
            <div style={{ padding: "8px 10px" }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Shehan Fernando</div>
              <div style={{ fontSize: 12, color: "var(--fg-3)" }}>shehan@studio.app</div>
            </div>
            <div className="menu-divider" />
            <div className="menu-item" onClick={()=>{setUserOpen(false); navigate("/settings")}}><I.User size={14}/> Account</div>
            <div className="menu-item" onClick={()=>{setUserOpen(false); navigate("/billing")}}><I.CreditCard size={14}/> Billing</div>
            <div className="menu-item" onClick={()=>{setUserOpen(false); navigate("/admin/moods")}}><I.Shield size={14}/> Admin</div>
            <div className="menu-divider" />
            <div className="menu-item" onClick={()=>{setUserOpen(false); navigate("/landing")}}><I.LogOut size={14}/> Sign out</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Sidebar ----------
function Sidebar({ navigate, route }) {
  const { history } = useStore();
  const [brandsOpen, setBrandsOpen] = useState(true);
  const [projectsOpen, setProjectsOpen] = useState(false);

  const isActive = (path) => route === path || route.startsWith(path + "/");

  return (
    <div className="sidebar">
      <div className={`nav-item nav-item--cta ${isActive("/generate") ? "" : ""}`} onClick={() => navigate("/generate")}>
        <I.Sparkle size={16}/>
        <span>Generate</span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
          <span className="kbd" style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.8)", boxShadow: "none" }}>G</span>
        </span>
      </div>

      <div style={{ height: 12 }}/>

      <div className={`nav-item ${isActive("/history") ? "is-active" : ""}`} onClick={() => navigate("/history")}>
        <I.History size={16} className="nav-item__icon"/>
        <span>History</span>
        <span className="nav-item__count">{history.length}</span>
      </div>

      <div className="nav-group">
        <div className="nav-group__head" onClick={() => setBrandsOpen(o => !o)}>
          <I.ChevronRight size={12} className="nav-group__chev" style={{ transform: brandsOpen ? "rotate(90deg)" : "" }}/>
          <I.Briefcase size={16} style={{ color: "var(--fg-3)" }}/>
          <span>Brands</span>
          <span className="nav-item__count" style={{ marginLeft: "auto" }}>{BRANDS.length}</span>
          <span className="nav-item__plus" onClick={(e)=>{e.stopPropagation(); navigate("/onboarding")}}><I.Plus size={12}/></span>
        </div>
        {brandsOpen && (
          <div className="nav-sub">
            {BRANDS.map(b => (
              <div key={b.id} className={`nav-sub__item ${route === `/brands/${b.id}` ? "is-active" : ""}`}
                onClick={() => navigate(`/brands/${b.id}`)}
                style={route === `/brands/${b.id}` ? { color: "var(--fg-1)", background: "var(--cal-gray-100)" } : {}}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 100, background: b.dot, flexShrink: 0 }}/>
                  {b.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="nav-group">
        <div className="nav-group__head">
          <I.ChevronRight size={12} className="nav-group__chev" style={{ transform: projectsOpen ? "rotate(90deg)" : "", cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); setProjectsOpen(o => !o); }}/>
          <I.Folder size={16} style={{ color: "var(--fg-3)" }}/>
          <span onClick={() => navigate("/projects")} style={{ cursor: "pointer" }}>Projects</span>
          <span className="nav-item__count" style={{ marginLeft: "auto" }} onClick={() => navigate("/projects")}>{PROJECTS.length}</span>
          <span className="nav-item__plus" onClick={(e)=>{e.stopPropagation(); navigate("/projects?new=1")}}><I.Plus size={12}/></span>
        </div>
        {projectsOpen && (
          <div className="nav-sub">
            {PROJECTS.map(p => {
              const brand = BRANDS.find(b => b.id === p.brand);
              const active = route === `/projects/${p.id}`;
              return (
                <div key={p.id} className={`nav-sub__item ${active ? "is-active" : ""}`} onClick={() => navigate(`/projects/${p.id}`)} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 100, background: p.accent, flexShrink: 0 }}/>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                  {brand && <span className="dot" style={{ background: brand.dot, opacity: 0.5 }}/>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className={`nav-item ${isActive("/moods") ? "is-active" : ""}`} onClick={() => navigate("/moods")}>
        <I.Library size={16} className="nav-item__icon"/>
        <span>Mood library</span>
      </div>

      <div className={`nav-item ${isActive("/stock") ? "is-active" : ""}`} onClick={() => navigate("/stock")}>
        <I.Image size={16} className="nav-item__icon"/>
        <span>Stock library</span>
      </div>

      <div className="grow"/>

      <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid var(--cal-gray-200)" }}>
        <div className={`nav-item ${isActive("/settings") ? "is-active" : ""}`} onClick={() => navigate("/settings")}>
          <I.Settings size={16} className="nav-item__icon"/>
          <span>Settings</span>
        </div>
        <div className="nav-item">
          <I.HelpCircle size={16} className="nav-item__icon"/>
          <span>Help</span>
        </div>
        <div className="nav-item" onClick={() => navigate("/billing")} style={{ marginTop: 4 }}>
          <span className="pill pill--accent" style={{ height: 22, fontSize: 11 }}>
            <I.Crown size={11}/>Pro plan
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------- Shell wrapper ----------
function Shell({ navigate, route, children }) {
  return (
    <div className="app">
      <div className="app__topbar"><TopBar navigate={navigate} route={route} /></div>
      <div className="app__sidebar"><Sidebar navigate={navigate} route={route} /></div>
      <div className="app__main">
        {children}
      </div>
    </div>
  );
}

Object.assign(window, { useHashRoute, ToastProvider, useToast, StoreProvider, useStore, Shell, StudioMark, TopBar, Sidebar });
