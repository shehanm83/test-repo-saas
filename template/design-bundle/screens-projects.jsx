// Projects index + Project detail (prompts → outputs → assets)

const { useState: pUS, useMemo: pUM } = React;

// =============== PROJECTS INDEX ===============
function ProjectsPage({ navigate }) {
  const [view, setView] = pUS("grid");
  const [search, setSearch] = pUS("");
  const [brandFilter, setBrandFilter] = pUS("all");

  const filtered = PROJECTS.filter(p => {
    if (brandFilter !== "all" && p.brand !== brandFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="page page--wide">
      <div className="page__head">
        <div>
          <div className="t-eyebrow" style={{ color: "var(--studio-violet)" }}>Workspace</div>
          <h1 className="page__title">Projects</h1>
          <p className="page__sub">Group prompts, outputs, and assets around a campaign or release. {PROJECTS.length} projects across {BRANDS.length} brands.</p>
        </div>
        <button className="btn btn--accent"><I.Plus size={14}/>New project</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
          <I.Search size={14} style={{ position: "absolute", left: 12, top: 11, color: "var(--fg-3)" }}/>
          <input className="input" placeholder="Search projects…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36 }}/>
        </div>
        <select className="select" style={{ width: 180 }} value={brandFilter} onChange={e => setBrandFilter(e.target.value)}>
          <option value="all">All brands</option>
          {BRANDS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select className="select" style={{ width: 160 }}><option>All statuses</option><option>Active</option><option>Draft</option><option>Archived</option></select>
        <div style={{ marginLeft: "auto", display: "flex", boxShadow: "var(--shadow-ring)", borderRadius: 8, overflow: "hidden" }}>
          <button className={`btn btn--sm ${view==="grid"?"btn--primary":"btn--ghost"}`} style={{ borderRadius: 0 }} onClick={() => setView("grid")}><I.Grid size={12}/>Grid</button>
          <button className={`btn btn--sm ${view==="list"?"btn--primary":"btn--ghost"}`} style={{ borderRadius: 0 }} onClick={() => setView("list")}><I.List size={12}/>List</button>
        </div>
      </div>

      {view === "grid" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {filtered.map(p => {
            const brand = BRANDS.find(b => b.id === p.brand);
            return (
              <div key={p.id} className="card" style={{ padding: 0, overflow: "hidden", cursor: "pointer", transition: "transform 160ms, box-shadow 160ms" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "var(--shadow-elevated)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                onClick={() => navigate(`/projects/${p.id}`)}>
                <div style={{ aspectRatio: "16/10", position: "relative", background: p.accent }}>
                  <img src={p.cover} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.78 }}/>
                  <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${p.accent}40, ${p.accent}D0)` }}/>
                  <div style={{ position: "absolute", left: 16, top: 16, display: "flex", gap: 6 }}>
                    <span className="pill" style={{ background: "rgba(255,255,255,0.92)", boxShadow: "none", height: 22, fontSize: 11 }}>
                      <span className="dot" style={{ background: brand?.dot }}/>{brand?.name}
                    </span>
                    {p.status === "draft" && <span className="pill pill--amber" style={{ height: 22, fontSize: 11 }}>Draft</span>}
                  </div>
                  <div style={{ position: "absolute", left: 16, right: 16, bottom: 16, color: "white" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 22, lineHeight: 1.15, textShadow: "0 1px 8px rgba(0,0,0,0.3)" }}>{p.name}</div>
                  </div>
                </div>
                <div style={{ padding: 16 }}>
                  <p className="t-small" style={{ margin: 0, marginBottom: 12, fontSize: 13, color: "var(--fg-2)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.description}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 14 }}>
                      <MiniStat icon={<I.Sparkle size={11}/>} value={p.stats.generations} label="prompts"/>
                      <MiniStat icon={<I.Image size={11}/>} value={p.stats.assets} label="assets"/>
                    </div>
                    <AvatarStack ids={p.collaborators}/>
                  </div>
                  <div className="t-small" style={{ marginTop: 12, fontSize: 11, color: "var(--fg-3)", display: "flex", justifyContent: "space-between" }}>
                    <span>Updated {p.updated}</span>
                    <span>{p.stats.credits} credits used</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* New project tile */}
          <div className="card" style={{ padding: 0, overflow: "hidden", cursor: "pointer", border: "2px dashed var(--cal-gray-300)", boxShadow: "none", display: "grid", placeItems: "center", minHeight: 280 }}>
            <div style={{ textAlign: "center", color: "var(--fg-3)" }}>
              <div style={{ width: 44, height: 44, borderRadius: 100, background: "var(--cal-gray-100)", display: "grid", placeItems: "center", margin: "0 auto 12px" }}><I.Plus size={20}/></div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--fg-2)" }}>New project</div>
              <div className="t-small" style={{ marginTop: 4, fontSize: 12 }}>Group a campaign's prompts and assets</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {filtered.map((p, i) => {
            const brand = BRANDS.find(b => b.id === p.brand);
            return (
              <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)} style={{
                display: "grid", gridTemplateColumns: "60px 1fr auto auto auto", gap: 16,
                padding: 14, alignItems: "center", cursor: "pointer",
                borderBottom: i < filtered.length - 1 ? "1px solid var(--cal-gray-200)" : "0",
              }} onMouseEnter={e => e.currentTarget.style.background = "var(--cal-gray-50)"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                <div style={{ width: 60, height: 60, borderRadius: 8, background: p.accent, overflow: "hidden", position: "relative" }}>
                  <img src={p.cover} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }}/>
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 16 }}>{p.name}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}>
                    <span className="pill"><span className="dot" style={{ background: brand?.dot }}/>{brand?.name}</span>
                    <span className="t-small" style={{ fontSize: 11 }}>· Updated {p.updated}</span>
                  </div>
                </div>
                <MiniStat icon={<I.Sparkle size={11}/>} value={p.stats.generations} label="prompts"/>
                <MiniStat icon={<I.Image size={11}/>} value={p.stats.assets} label="assets"/>
                <AvatarStack ids={p.collaborators}/>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MiniStat({ icon, value, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--fg-2)" }}>
      <span style={{ color: "var(--fg-3)" }}>{icon}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
      <span style={{ color: "var(--fg-3)" }}>{label}</span>
    </div>
  );
}

const AVATAR_COLORS = {
  SK: "#7C5232", RM: "#5E5CE6", JT: "#1F7A5A", AB: "#C97A3F",
};
function AvatarStack({ ids }) {
  return (
    <div style={{ display: "flex" }}>
      {ids.slice(0, 3).map((id, i) => (
        <div key={id} style={{
          width: 22, height: 22, borderRadius: 100, background: AVATAR_COLORS[id] || "#888",
          color: "white", fontSize: 10, fontWeight: 600, display: "grid", placeItems: "center",
          marginLeft: i ? -6 : 0, boxShadow: "0 0 0 2px white",
        }}>{id}</div>
      ))}
      {ids.length > 3 && <div style={{
        width: 22, height: 22, borderRadius: 100, background: "var(--cal-gray-200)",
        color: "var(--fg-2)", fontSize: 10, fontWeight: 600, display: "grid", placeItems: "center",
        marginLeft: -6, boxShadow: "0 0 0 2px white",
      }}>+{ids.length - 3}</div>}
    </div>
  );
}

// =============== PROJECT DETAIL ===============
function ProjectDetailPage({ navigate, projectId }) {
  const project = PROJECTS.find(p => p.id === projectId) || PROJECTS[0];
  const brand = BRANDS.find(b => b.id === project.brand);
  const [tab, setTab] = pUS("prompts");
  const [expandedPrompt, setExpandedPrompt] = pUS(project.prompts[0].id);

  const totalOutputs = project.prompts.reduce((s, p) => s + p.used, 0);
  const totalCredits = project.prompts.reduce((s, p) => s + p.credits, 0);

  return (
    <div className="page page--wide" style={{ paddingTop: 0 }}>
      {/* Hero band — colorful */}
      <div style={{
        marginLeft: -32, marginRight: -32, marginTop: -32,
        position: "relative", overflow: "hidden", padding: "32px 32px 28px",
        background: `linear-gradient(135deg, ${project.accent} 0%, ${project.accent}E0 60%, ${project.accent}A0 100%)`,
        color: "white", marginBottom: 24,
      }}>
        <img src={project.cover} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.18, mixBlendMode: "overlay" }}/>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="t-small" style={{ color: "rgba(255,255,255,0.85)", display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ cursor: "pointer" }} onClick={() => navigate("/projects")}>Projects</span>
            <I.ChevronRight size={11}/>
            <span>{project.name}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "flex-end" }}>
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <span className="pill" style={{ background: "rgba(255,255,255,0.95)", color: "var(--fg-1)", boxShadow: "none", height: 24 }}>
                  <span className="dot" style={{ background: brand?.dot }}/>{brand?.name}
                </span>
                {project.status === "draft" && <span className="pill" style={{ background: "rgba(255,255,255,0.2)", color: "white", boxShadow: "none", height: 24 }}>Draft</span>}
                {project.status === "active" && <span className="pill" style={{ background: "rgba(255,255,255,0.2)", color: "white", boxShadow: "none", height: 24 }}><span style={{width:6,height:6,borderRadius:100,background:"#7BE49A"}}/>Active</span>}
              </div>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 44, lineHeight: 1, margin: 0, color: "white" }}>{project.name}</h1>
              <p style={{ marginTop: 12, maxWidth: 640, fontSize: 16, color: "rgba(255,255,255,0.9)", lineHeight: 1.5 }}>{project.description}</p>
              <div style={{ display: "flex", gap: 24, marginTop: 20 }}>
                <HeroStat label="Prompts" value={project.stats.generations}/>
                <HeroStat label="Outputs" value={totalOutputs}/>
                <HeroStat label="Assets" value={project.stats.assets}/>
                <HeroStat label="Credits used" value={totalCredits}/>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
              <AvatarStack ids={project.collaborators}/>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button className="btn btn--secondary" style={{ background: "rgba(255,255,255,0.95)", boxShadow: "none" }}><I.Share size={14}/>Share</button>
                <button className="btn btn--secondary" style={{ background: "rgba(255,255,255,0.95)", boxShadow: "none" }}><I.Download size={14}/>Export</button>
                <button className="btn btn--accent" onClick={() => navigate("/generate")}><I.Sparkle size={14}/>New prompt</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 24 }}>
        <div className={`tab ${tab==="prompts"?"is-active":""}`} onClick={()=>setTab("prompts")}>
          Prompts <span className="pill" style={{height:18, fontSize:10, marginLeft:4, padding:"0 6px"}}>{project.prompts.length}</span>
        </div>
        <div className={`tab ${tab==="outputs"?"is-active":""}`} onClick={()=>setTab("outputs")}>
          All outputs <span className="pill" style={{height:18, fontSize:10, marginLeft:4, padding:"0 6px"}}>{totalOutputs}</span>
        </div>
        <div className={`tab ${tab==="assets"?"is-active":""}`} onClick={()=>setTab("assets")}>
          Assets used <span className="pill" style={{height:18, fontSize:10, marginLeft:4, padding:"0 6px"}}>{project.assetLibrary.length}</span>
        </div>
        <div className={`tab ${tab==="activity"?"is-active":""}`} onClick={()=>setTab("activity")}>Activity</div>
        <div className={`tab ${tab==="settings"?"is-active":""}`} onClick={()=>setTab("settings")}>Settings</div>
      </div>

      {tab === "prompts" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24, alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {project.prompts.map(prompt => (
              <PromptCard key={prompt.id}
                prompt={prompt}
                project={project}
                expanded={expandedPrompt === prompt.id}
                onToggle={() => setExpandedPrompt(expandedPrompt === prompt.id ? null : prompt.id)}
                navigate={navigate}/>
            ))}
            <button className="btn btn--secondary btn--lg" style={{ justifyContent: "center", marginTop: 8 }} onClick={() => navigate("/generate")}>
              <I.Plus size={14}/>Add a new prompt to this project
            </button>
          </div>

          <aside style={{ position: "sticky", top: 80 }}>
            <div className="card" style={{ padding: 16 }}>
              <div className="t-eyebrow">Project assets</div>
              <div className="t-small" style={{ marginTop: 4, marginBottom: 12, fontSize: 12 }}>Reference materials available to every prompt in this project.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {project.assetLibrary.slice(0, 5).map(a => <AssetMini key={a.id} asset={a} brand={brand}/>)}
              </div>
              <button className="btn btn--ghost btn--full btn--sm" style={{ marginTop: 12 }} onClick={() => setTab("assets")}>View all {project.assetLibrary.length}</button>
            </div>

            <div className="card" style={{ padding: 16, marginTop: 12, background: "linear-gradient(135deg, var(--studio-violet-50) 0%, white 100%)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <I.Wand size={14} style={{ color: "var(--studio-violet)" }}/>
                <div className="t-eyebrow" style={{ color: "var(--studio-violet)", margin: 0 }}>Project tip</div>
              </div>
              <div style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.5 }}>
                Pin reference images and brand assets to a project — every prompt inherits them automatically. Saves time and keeps the visual language tight.
              </div>
            </div>
          </aside>
        </div>
      )}

      {tab === "outputs" && (
        <div>
          <div className="t-small" style={{ marginBottom: 16 }}>{totalOutputs} generated images across {project.prompts.length} prompts. Click any to open it.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {project.prompts.flatMap(p => p.outputs.filter(o => o).map((img, i) => ({ img, prompt: p, idx: i }))).map((o, i) => (
              <div key={i} className="card" style={{ padding: 0, overflow: "hidden", cursor: "pointer", aspectRatio: o.prompt.ar.replace(":","/"), position: "relative" }}>
                <img src={o.img} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.6) 100%)", opacity: 0, transition: "opacity 160ms" }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                  <div style={{ position: "absolute", left: 12, right: 12, bottom: 12, color: "white", fontSize: 12 }}>
                    <div className="pill" style={{ background: "rgba(255,255,255,0.95)", color: "var(--fg-1)", height: 20, fontSize: 11, marginBottom: 6 }}>{o.prompt.ar}</div>
                    <div style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{o.prompt.text}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "assets" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div className="t-small">Reference materials this project draws from. Each is tagged with how often it appeared in a generated output.</div>
            <button className="btn btn--secondary"><I.Plus size={14}/>Add asset</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {project.assetLibrary.map(a => <AssetCard key={a.id} asset={a} brand={brand} accent={project.accent}/>)}
          </div>
        </div>
      )}

      {tab === "activity" && (
        <div className="card" style={{ padding: 0, overflow: "hidden", maxWidth: 720 }}>
          {[
            { who: "SK", what: "generated 4 outputs from", target: project.prompts[0].text, when: "2 hours ago" },
            { who: "RM", what: "added a reference image", target: "ref_mug_warm.png", when: "Yesterday" },
            { who: "SK", what: "regenerated 1 variant for", target: project.prompts[1].text, when: "Yesterday" },
            { who: "AB", what: "joined the project", target: "", when: "2 days ago" },
            { who: "SK", what: "created the project", target: project.name, when: project.created },
          ].map((a, i, arr) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "32px 1fr auto", gap: 12, padding: 14, alignItems: "center",
              borderBottom: i < arr.length - 1 ? "1px solid var(--cal-gray-200)" : "0",
            }}>
              <div style={{ width: 28, height: 28, borderRadius: 100, background: AVATAR_COLORS[a.who] || "#888", color: "white", fontSize: 11, fontWeight: 600, display: "grid", placeItems: "center" }}>{a.who}</div>
              <div style={{ fontSize: 13 }}>
                <span style={{ fontWeight: 500 }}>{a.who}</span> <span style={{ color: "var(--fg-2)" }}>{a.what}</span> {a.target && <span style={{ color: "var(--fg-1)", fontStyle: a.target.includes(".") ? "normal" : "italic" }}>"{a.target}"</span>}
              </div>
              <span className="t-small" style={{ fontSize: 11 }}>{a.when}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "settings" && (
        <div style={{ maxWidth: 640 }}>
          <div className="card" style={{ padding: 24, marginBottom: 16 }}>
            <div className="t-eyebrow">Project settings</div>
            <label className="label" style={{ marginTop: 16 }}>Name</label>
            <input className="input" defaultValue={project.name}/>
            <label className="label" style={{ marginTop: 16 }}>Description</label>
            <textarea className="textarea" rows={3} defaultValue={project.description}/>
            <label className="label" style={{ marginTop: 16 }}>Accent color</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["#7A0E0E","#7BAE7F","#5E5CE6","#C97A3F","#2A1F18","#E63946"].map(c => (
                <div key={c} style={{ width: 36, height: 36, borderRadius: 8, background: c, boxShadow: c === project.accent ? "0 0 0 2px white, 0 0 0 4px var(--studio-violet)" : "var(--shadow-ring)", cursor: "pointer" }}/>
              ))}
            </div>
          </div>
          <div className="card" style={{ padding: 24, borderTop: "3px solid var(--studio-red)" }}>
            <h3 style={{ margin: 0, color: "var(--studio-red)", fontFamily: "var(--font-display)", fontSize: 18 }}>Archive project</h3>
            <p className="t-small" style={{ marginTop: 6 }}>Archived projects are hidden but can be restored. Outputs and assets are preserved.</p>
            <button className="btn btn--secondary btn--danger" style={{ marginTop: 12 }}><I.Archive size={14}/>Archive {project.name}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function HeroStat({ label, value }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "white", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function PromptCard({ prompt, project, expanded, onToggle, navigate }) {
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div onClick={onToggle} style={{ padding: 18, display: "grid", gridTemplateColumns: "1fr auto", gap: 16, cursor: "pointer", alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}>{prompt.id}</span>
            <span className="t-small" style={{ fontSize: 11 }}>· {prompt.when}</span>
            {prompt.status === "complete" ? <span className="pill pill--green" style={{ height: 18, fontSize: 10, marginLeft: 4 }}><I.Check size={10}/>Complete</span> : <span className="pill pill--amber" style={{ height: 18, fontSize: 10, marginLeft: 4 }}><I.AlertCircle size={10}/>Partial</span>}
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--fg-1)", lineHeight: 1.35 }}>"{prompt.text}"</div>
          <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
            {prompt.mood !== "none" && <span className="pill"><I.Snowflake size={11}/>{MOODS.find(m => m.id === prompt.mood)?.name}</span>}
            <span className="pill">{prompt.ar}</span>
            <span className="pill">{prompt.used}/{prompt.total} variants</span>
            <span className="pill"><I.Coin size={11}/>{prompt.credits} credits</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn btn--icon btn--ghost" onClick={(e) => { e.stopPropagation(); }}><I.Refresh size={14}/></button>
          <button className="btn btn--icon btn--ghost" onClick={(e) => { e.stopPropagation(); }}><I.More size={14}/></button>
          <I.ChevronDown size={14} style={{ transform: expanded ? "rotate(180deg)" : "", transition: "transform 160ms", color: "var(--fg-3)" }}/>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: "1px solid var(--cal-gray-200)", background: "var(--cal-gray-50)", padding: 18 }}>
          <div className="t-eyebrow" style={{ marginBottom: 8 }}>Generated outputs · {prompt.used} of {prompt.total}</div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${prompt.total}, 1fr)`, gap: 8 }}>
            {prompt.outputs.map((img, i) => (
              <div key={i} className="card" style={{ padding: 0, overflow: "hidden", aspectRatio: prompt.ar.replace(":","/"), background: "var(--cal-gray-200)", position: "relative" }}>
                {img ? (
                  <>
                    <img src={img} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                    <div style={{ position: "absolute", left: 8, top: 8 }}>
                      <span style={{ width: 20, height: 20, borderRadius: 4, background: "rgba(255,255,255,0.95)", display: "grid", placeItems: "center", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600 }}>{i+1}</span>
                    </div>
                    <div className="hover-actions" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "opacity 160ms" }}>
                      <button className="btn btn--icon btn--secondary" style={{ background: "white" }}><I.Download size={12}/></button>
                      <button className="btn btn--icon btn--secondary" style={{ background: "white" }}><I.Refresh size={12}/></button>
                      <button className="btn btn--icon btn--secondary" style={{ background: "white" }}><I.Heart size={12}/></button>
                    </div>
                  </>
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "var(--fg-3)", fontSize: 11, textAlign: "center", padding: 8 }}>
                    <div>
                      <I.AlertCircle size={16} style={{ marginBottom: 6 }}/>
                      <div>Failed</div>
                      <button className="btn btn--ghost btn--sm" style={{ marginTop: 6, fontSize: 11 }}>Retry</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="t-eyebrow" style={{ marginTop: 20, marginBottom: 8 }}>Assets used in this prompt</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {prompt.assetsUsed.map(aid => {
              const asset = project.assetLibrary.find(a => a.id === aid);
              if (!asset) return null;
              return (
                <div key={aid} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", boxShadow: "var(--shadow-ring)", borderRadius: 100, background: "white", fontSize: 12 }}>
                  <AssetThumb asset={asset} size={20}/>
                  <span style={{ fontWeight: 500 }}>{asset.name}</span>
                  <span className="pill" style={{ height: 16, fontSize: 10, padding: "0 5px" }}>{asset.kind}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function AssetThumb({ asset, size = 32 }) {
  const brand = BRANDS.find(b => b.palette);
  if (asset.thumb === "logo" || asset.thumb === "logo-mono") {
    return <div style={{ width: size, height: size, borderRadius: 4, background: asset.thumb === "logo-mono" ? "var(--cal-charcoal)" : "#2A1F18", color: "#E8DCC4", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontSize: size*0.4 }}>NW</div>;
  }
  if (asset.thumb === "palette") {
    return <div style={{ width: size, height: size, borderRadius: 4, display: "grid", gridTemplateColumns: "1fr 1fr", overflow: "hidden", boxShadow: "var(--shadow-ring)" }}>
      <span style={{background:"#7A0E0E"}}/><span style={{background:"#0E5C2F"}}/><span style={{background:"#E8C66B"}}/><span style={{background:"#2A1F18"}}/>
    </div>;
  }
  if (asset.thumb === "font") {
    return <div style={{ width: size, height: size, borderRadius: 4, background: "var(--cal-gray-100)", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontSize: size*0.55, color: "var(--fg-1)" }}>Aa</div>;
  }
  return <div style={{ width: size, height: size, borderRadius: 4, overflow: "hidden", background: "var(--cal-gray-200)" }}>
    <img src={asset.thumb} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
  </div>;
}

function AssetMini({ asset, brand }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "32px 1fr auto", gap: 10, alignItems: "center" }}>
      <AssetThumb asset={asset} size={32}/>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asset.name}</div>
        <div style={{ fontSize: 10, color: "var(--fg-3)" }}>{asset.kind}</div>
      </div>
      <span className="pill" style={{ height: 18, fontSize: 10 }}>{asset.count}×</span>
    </div>
  );
}

function AssetCard({ asset, brand, accent }) {
  return (
    <div className="card" style={{ padding: 16, display: "grid", gridTemplateColumns: "56px 1fr", gap: 14, alignItems: "center" }}>
      <AssetThumb asset={asset} size={56}/>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{asset.name}</div>
        <div className="t-small" style={{ fontSize: 11, marginTop: 2 }}>{asset.kind}</div>
        <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center" }}>
          <span className="pill" style={{ height: 18, fontSize: 10 }}>Used {asset.count}×</span>
          <I.ExternalLink size={11} style={{ color: "var(--fg-3)", cursor: "pointer", marginLeft: "auto" }}/>
        </div>
      </div>
    </div>
  );
}

window.ProjectsPage = ProjectsPage;
window.ProjectDetailPage = ProjectDetailPage;
