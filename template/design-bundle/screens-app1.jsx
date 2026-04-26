// Brand kit editor (7), History (8), Mood browser (9)

const { useState: bUS, useMemo: bUM } = React;

// =============== BRAND EDITOR ===============
function BrandPage({ navigate, brandId }) {
  const brand = BRANDS.find(b => b.id === brandId) || BRANDS[0];
  const [tab, setTab] = bUS("colors");
  const [delModal, setDelModal] = bUS(false);
  const [confirmText, setConfirmText] = bUS("");
  const { push } = useToast();

  return (
    <div className="page">
      <div className="card" style={{ padding: 24, display: "grid", gridTemplateColumns: "120px 1fr auto", gap: 24, alignItems: "center", marginBottom: 24 }}>
        <div className="checker" style={{ width: 120, height: 120, borderRadius: 12, display: "grid", placeItems: "center", boxShadow: "var(--shadow-ring)" }}>
          <div style={{ width: 80, height: 80, borderRadius: 14, background: brand.palette[0], color: brand.palette[2], display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontSize: 28 }}>{brand.logoText}</div>
        </div>
        <div>
          <h1 className="t-h2" style={{ margin: 0 }}>{brand.name}</h1>
          <div className="t-small" style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
            <I.Globe size={12}/>{brand.url}
            <span style={{ color: "var(--fg-4)" }}>·</span>
            Created {brand.created}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
            <Stat label="Generations" value={brand.generations}/>
            <Stat label="References" value={brand.refs}/>
            <Stat label="Colors" value={brand.palette.length}/>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn--secondary"><I.Edit size={14}/>Edit name</button>
          <button className="btn btn--accent" onClick={() => navigate("/generate")}><I.Sparkle size={14}/>Generate</button>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 24 }}>
        {["colors", "fonts", "voice", "references"].map(t => (
          <div key={t} className={`tab ${tab===t?"is-active":""}`} onClick={() => setTab(t)} style={{textTransform:"capitalize"}}>
            {t} {t==="references" && <span className="pill" style={{height:18, fontSize:10, marginLeft: 4, padding:"0 6px"}}>{brand.refs}</span>}
          </div>
        ))}
        <div className="grow"/>
        <div className={`tab ${tab==="danger"?"is-active":""}`} onClick={() => setTab("danger")} style={{ color: "var(--studio-red)" }}>Danger zone</div>
      </div>

      {tab === "colors" && (
        <div>
          <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
            {brand.palette.map((c, i) => (
              <div key={i} style={{ width: 140, position: "relative" }}>
                <div style={{ height: 140, borderRadius: 12, background: c, boxShadow: "var(--shadow-ring)", cursor: "pointer" }}/>
                <div style={{ marginTop: 8, fontSize: 13, fontWeight: 500 }}>{["Primary","Secondary","Accent","Extra 1","Extra 2"][i]}</div>
                <div className="mono t-small" style={{ fontSize: 11 }}>{c}</div>
              </div>
            ))}
            <div style={{ width: 140, height: 140, border: "2px dashed var(--cal-gray-300)", borderRadius: 12, display: "grid", placeItems: "center", color: "var(--fg-3)", cursor: "pointer" }}>
              <I.Plus size={20}/>
            </div>
          </div>

          <div className="t-eyebrow" style={{ marginTop: 32, marginBottom: 12 }}>Preview on a sample design</div>
          <div className="card" style={{ padding: 32, background: brand.palette[0], color: brand.palette[2], maxWidth: 480 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 32, color: brand.palette[2] }}>Holiday Sale</div>
            <div style={{ fontSize: 14, color: brand.palette[3], marginTop: 6 }}>30% off everything · this week only</div>
            <div style={{ marginTop: 20, display: "inline-flex", padding: "10px 16px", borderRadius: 100, background: brand.palette[1], color: brand.palette[4] || "white", fontSize: 13, fontWeight: 600 }}>Shop the sale →</div>
          </div>
        </div>
      )}

      {tab === "fonts" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {[
            { l: "Heading font", v: brand.fontHeading, sample: "Cozy living room scenes" },
            { l: "Body font", v: brand.fontBody, sample: "We craft a soft, generous register where the product feels warm to hold." },
          ].map((f, i) => (
            <div key={i} className="card" style={{ padding: 24 }}>
              <div className="t-eyebrow">{f.l}</div>
              <div style={{ marginTop: 8, fontFamily: "var(--font-display)", fontSize: 22 }}>{f.v}</div>
              <div style={{ marginTop: 24, fontFamily: i===0?"var(--font-display)":"var(--font-body)", fontSize: i===0?28:16, color: "var(--fg-2)", lineHeight: 1.4 }}>{f.sample}</div>
              <button className="btn btn--secondary btn--sm" style={{ marginTop: 24 }}>Change font</button>
            </div>
          ))}
        </div>
      )}

      {tab === "voice" && (
        <div style={{ maxWidth: 720 }}>
          <label className="label">Voice notes</label>
          <textarea className="textarea" rows={8} defaultValue={brand.voice} onBlur={() => push("Saved")}/>
          <div className="hint">Saved automatically when you click away.</div>
        </div>
      )}

      {tab === "references" && (
        <div>
          <button className="btn btn--accent" style={{ marginBottom: 16 }}><I.Plus size={14}/>Add reference images</button>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
            {STOCK.slice(0, brand.refs).map((s, i) => (
              <div key={i} style={{ aspectRatio: "1/1", borderRadius: 10, overflow: "hidden", boxShadow: "var(--shadow-ring)", cursor: "pointer", position: "relative" }}>
                <img src={s} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "danger" && (
        <div className="card" style={{ padding: 24, maxWidth: 640, borderTop: "3px solid var(--studio-red)" }}>
          <h3 className="t-h4" style={{ margin: 0, color: "var(--studio-red)" }}>Delete this brand</h3>
          <p className="t-small" style={{ marginTop: 6 }}>Cascade-deletes all generations, references, and ledger entries (the last is recorded as audit).</p>
          <button className="btn btn--secondary btn--danger" style={{ marginTop: 16 }} onClick={() => setDelModal(true)}><I.Trash size={14}/>Delete {brand.name}</button>
        </div>
      )}

      {delModal && (
        <>
          <div className="scrim" onClick={() => setDelModal(false)}/>
          <div className="modal">
            <h2 className="t-h3" style={{ margin: 0 }}>Delete {brand.name}?</h2>
            <p className="t-small" style={{ marginTop: 8 }}>This cannot be undone. {brand.generations} generations and {brand.refs} reference images will be deleted.</p>
            <label className="label" style={{ marginTop: 20 }}>Type "{brand.name}" to confirm</label>
            <input className="input" value={confirmText} onChange={e => setConfirmText(e.target.value)}/>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24 }}>
              <button className="btn btn--ghost" onClick={() => setDelModal(false)}>Cancel</button>
              <button className="btn btn--accent" disabled={confirmText !== brand.name} style={{ background: "var(--studio-red)" }} onClick={() => { setDelModal(false); push("Brand deleted"); navigate("/generate"); }}>Delete brand</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 22 }}>{value}</div>
      <div className="t-small" style={{ fontSize: 11 }}>{label}</div>
    </div>
  );
}

// =============== HISTORY ===============
function HistoryPage({ navigate }) {
  const { history } = useStore();
  const [brandFilter, setBrandFilter] = bUS("all");
  const [search, setSearch] = bUS("");
  const filtered = history.filter(g => {
    if (brandFilter !== "all" && g.brand !== brandFilter) return false;
    if (search && !g.brief.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">History</h1>
          <p className="page__sub">{history.length} generations across all brands.</p>
        </div>
        <button className="btn btn--accent" onClick={() => navigate("/generate")}><I.Sparkle size={14}/>New generation</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
          <I.Search size={14} style={{ position: "absolute", left: 12, top: 11, color: "var(--fg-3)" }}/>
          <input className="input" placeholder="Search briefs…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36 }}/>
        </div>
        <select className="select" style={{ width: 160 }} value={brandFilter} onChange={e => setBrandFilter(e.target.value)}>
          <option value="all">All brands</option>
          {BRANDS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select className="select" style={{ width: 160 }}><option>All moods</option></select>
        <select className="select" style={{ width: 140 }}><option>All statuses</option></select>
        <select className="select" style={{ width: 160 }}><option>Last 30 days</option></select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty card" style={{ marginTop: 24 }}>
          <div className="empty__art"><I.Inbox size={32}/></div>
          <div className="empty__title">No generations yet</div>
          <div className="empty__sub">Try one — it's quick.</div>
          <button className="btn btn--accent" onClick={() => navigate("/generate")}><I.Sparkle size={14}/>New generation</button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {filtered.map((g, i) => {
            const brand = BRANDS.find(b => b.id === g.brand);
            const mood = MOODS.find(m => m.id === g.mood);
            return (
              <div key={g.id} onClick={() => navigate(`/results/${g.id}`)} style={{
                display: "grid", gridTemplateColumns: "72px 1fr auto", gap: 16,
                padding: 16, alignItems: "center", cursor: "pointer",
                borderBottom: i < filtered.length - 1 ? "1px solid var(--cal-gray-200)" : "0",
              }} onMouseEnter={e=>e.currentTarget.style.background="var(--cal-gray-50)"} onMouseLeave={e=>e.currentTarget.style.background=""}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, width: 72, height: 72, borderRadius: 8, overflow: "hidden", boxShadow: "var(--shadow-ring)" }}>
                  {g.images.slice(0,4).map((im, j) => (
                    <div key={j} style={{ background: "var(--cal-gray-200)" }}>
                      {im && <img src={im} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>}
                    </div>
                  ))}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: "var(--fg-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.brief}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
                    <span className="pill"><span className="dot" style={{background:brand?.dot}}/>{brand?.name}</span>
                    {g.mood !== "none" && mood && <span className="pill">{mood.name}</span>}
                    <span className="pill">{g.ar}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {g.status === "complete" ? <span className="pill pill--green"><I.Check size={11}/>Complete</span> : <span className="pill pill--amber"><I.AlertCircle size={11}/>Partial</span>}
                  <div className="t-small" style={{ marginTop: 6, fontSize: 11 }}>{g.credits} credits · {g.when}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============== MOOD BROWSER ===============
function MoodsPage({ navigate }) {
  const [tab, setTab] = bUS("all");
  const [search, setSearch] = bUS("");
  const filtered = MOODS.filter(m => {
    if (m.id === "none") return false;
    if (tab === "now" && m.group !== "now") return false;
    if (tab === "always" && m.group !== "always") return false;
    if (tab === "soon" && m.group !== "soon") return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="page page--wide">
      <div className="page__head">
        <div>
          <h1 className="page__title">Moods</h1>
          <p className="page__sub">Curated style packs — seasonal flavor without abandoning your brand.</p>
        </div>
        <div style={{ position: "relative" }}>
          <I.Search size={14} style={{ position: "absolute", left: 12, top: 11, color: "var(--fg-3)" }}/>
          <input className="input" placeholder="Search moods…" value={search} onChange={e=>setSearch(e.target.value)} style={{ paddingLeft: 36, width: 280 }}/>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 24 }}>
        {[["all","All"],["now","Right now"],["always","Always"],["soon","Coming soon"]].map(([k,l]) => (
          <div key={k} className={`tab ${tab===k?"is-active":""}`} onClick={() => setTab(k)}>{l}</div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {filtered.map(m => (
          <div key={m.id} className="card" style={{ padding: 0, overflow: "hidden", cursor: "pointer", transition: "transform 160ms, box-shadow 160ms" }}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="var(--shadow-elevated)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="";}}
            onClick={() => navigate("/generate")}>
            <div style={{ aspectRatio: "1/1", position: "relative", background: "var(--cal-gray-100)" }}>
              {m.img && <img src={m.img} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>}
              {m.group === "soon" && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }}/>}
              <div style={{ position: "absolute", left: 12, top: 12, display: "flex", gap: 6 }}>
                <span className="pill pill--ring" style={{ height: 22, fontSize: 11 }}>{m.kind}</span>
              </div>
              {m.colors && (
                <div style={{ position: "absolute", left: 12, bottom: 12, display: "flex", gap: 4 }}>
                  {m.colors.map(c => <span key={c} style={{ width: 14, height: 14, borderRadius: 100, background: c, boxShadow: "0 0 0 1.5px white" }}/>)}
                </div>
              )}
            </div>
            <div style={{ padding: 14 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>{m.name}</div>
              <div className="t-small" style={{ marginTop: 4, fontSize: 12 }}>
                {m.until && <>Available until {m.until}</>}
                {m.from && <>Available from {m.from}</>}
                {!m.until && !m.from && m.motifs && m.motifs.slice(0,3).join(" · ")}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

window.BrandPage = BrandPage;
window.HistoryPage = HistoryPage;
window.MoodsPage = MoodsPage;
