// Generation form (Screen 5) and Generation results (Screen 6)

const { useState: gUS, useEffect: gUE, useRef: gUR, useMemo: gUM } = React;

// =============== GENERATION FORM ===============
function GeneratePage({ navigate }) {
  const { activeBrandId, credits, setCredits, history, setHistory } = useStore();
  const brand = BRANDS.find(b => b.id === activeBrandId) || BRANDS[0];
  const [brief, setBrief] = gUS("");
  const [moodId, setMoodId] = gUS("none");
  const [ar, setAr] = gUS("1:1");
  const [premium, setPremium] = gUS(false);
  const [toggles, setToggles] = gUS({
    colors: true, logo: true, fonts: true, strict: false,
    moodPrompt: true, moodMotif: true, moodAccent: true,
  });
  const tog = (k) => setToggles(t => ({ ...t, [k]: !t[k] }));

  const cost = premium ? 60 : 20;
  const variants = 4;

  const submit = () => {
    const id = "g_" + Math.random().toString(36).slice(2, 6);
    const newGen = {
      id, brief, brand: brand.id, mood: moodId, ar, status: "running",
      credits: cost, when: "Just now", images: [null, null, null, null],
    };
    setHistory(h => [newGen, ...h]);
    setCredits(c => c - cost);
    navigate(`/results/${id}`);
  };

  const ARS = [
    { id: "1:1", label: "Square", w: 16, h: 16 },
    { id: "4:5", label: "Portrait", w: 14, h: 18 },
    { id: "9:16", label: "Story", w: 12, h: 22 },
    { id: "16:9", label: "Landscape", w: 22, h: 12 },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", height: "100%", minHeight: "calc(100vh - 56px)" }}>
      <div style={{ overflowY: "auto", padding: "32px 40px 120px" }}>
        <div style={{ maxWidth: 720 }}>
          <div className="page__head" style={{ marginBottom: 28 }}>
            <div>
              <h1 className="page__title">New generation</h1>
              <p className="page__sub">Describe what you want. Studio handles the rest.</p>
            </div>
          </div>

          <label className="label">Brief</label>
          <div style={{ position: "relative" }}>
            <textarea
              className="textarea"
              rows={4}
              maxLength={500}
              autoFocus
              placeholder="Describe what you want. e.g. 'Christmas sale, cozy living room with a glowing tree, 30% off'"
              value={brief}
              onChange={e => setBrief(e.target.value)}
              style={{ fontSize: 16, padding: "14px 16px", paddingBottom: 28 }}
            />
            <div style={{ position: "absolute", bottom: 8, right: 12, fontSize: 11, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>
              {brief.length} / 500
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <label className="label">Brand</label>
            <button className="pill pill--ring" style={{ height: 36, padding: "0 8px 0 6px" }}>
              <span style={{ width: 24, height: 24, borderRadius: 4, background: brand.dot, color: "white", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontSize: 11 }}>{brand.logoText}</span>
              <span style={{ fontWeight: 500, fontSize: 14, color: "var(--fg-1)" }}>{brand.name}</span>
              <I.ChevronDown size={12}/>
            </button>
          </div>

          <div style={{ marginTop: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <label className="label" style={{ marginBottom: 0 }}>Mood</label>
              <a className="t-small" style={{ cursor: "pointer", color: "var(--fg-2)" }} onClick={() => navigate("/moods")}>Browse all moods →</a>
            </div>
            <MoodStrip moodId={moodId} setMoodId={setMoodId}/>
          </div>

          <div style={{ marginTop: 24 }}>
            <label className="label">Aspect ratio</label>
            <div style={{ display: "flex", gap: 8 }}>
              {ARS.map(a => (
                <button key={a.id} className="btn btn--secondary" onClick={() => setAr(a.id)}
                  style={{
                    height: 48, padding: "0 14px",
                    background: ar === a.id ? "var(--cal-charcoal)" : "white",
                    color: ar === a.id ? "white" : "var(--fg-1)",
                    boxShadow: ar === a.id ? "var(--shadow-button-highlight)" : "var(--shadow-ring)",
                  }}>
                  <div style={{ width: a.w, height: a.h, borderRadius: 2, background: "currentColor", opacity: 0.7 }}/>
                  <span style={{ fontWeight: 500 }}>{a.id}</span>
                  <span style={{ opacity: 0.6, fontSize: 12 }}>{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 32, display: "flex", gap: 12, alignItems: "center" }}>
            <button className="btn btn--accent btn--lg" onClick={submit} disabled={!brief.trim()}>
              <I.Sparkle size={16}/>Generate ({cost} credits)
            </button>
            <span className="t-small">{cost} credits for {variants} variants</span>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ borderLeft: "1px solid var(--cal-gray-200)", background: "var(--cal-gray-50)", overflowY: "auto", padding: "32px 24px 64px" }}>
        <div className="t-eyebrow" style={{ marginBottom: 16 }}>Brand grounding</div>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <ToggleRow label="Use brand colors" on={toggles.colors} onChange={() => tog("colors")} />
          <ToggleRow label="Use brand logo" on={toggles.logo} onChange={() => tog("logo")} />
          <ToggleRow label="Use brand fonts" on={toggles.fonts} onChange={() => tog("fonts")} />
          <ToggleRow label="Brand-strict mode" on={toggles.strict} onChange={() => tog("strict")}
            sub="Mood only influences AI background — no decorative motifs or accent overlays." last/>
        </div>

        {moodId !== "none" && (
          <>
            <div className="t-eyebrow" style={{ marginTop: 24, marginBottom: 16 }}>Mood layer</div>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <ToggleRow label="Apply mood prompt modifiers" on={toggles.moodPrompt} onChange={() => tog("moodPrompt")}/>
              <ToggleRow label="Apply mood decorative motifs" on={toggles.moodMotif} onChange={() => tog("moodMotif")}/>
              <ToggleRow label="Apply mood accent colors" on={toggles.moodAccent} onChange={() => tog("moodAccent")} last/>
            </div>
          </>
        )}

        <div className="t-eyebrow" style={{ marginTop: 24, marginBottom: 16 }}>Quality<span className="pill pill--accent" style={{ marginLeft: 8, height: 18, fontSize: 10 }}>Pro</span></div>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <ToggleRow label="Premium model (gpt-image-1)" on={premium} onChange={() => setPremium(p => !p)} sub="15 credits per variant instead of 5" last/>
        </div>

        <div style={{ marginTop: 24, padding: "12px 16px", background: "white", borderRadius: 10, boxShadow: "var(--shadow-ring)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="t-small">Estimated cost</span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 16 }}>{cost} credits</span>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, on, onChange, sub, last }) {
  return (
    <div onClick={onChange} style={{
      display: "flex", alignItems: "center", padding: "12px 14px",
      borderBottom: last ? "0" : "1px solid var(--cal-gray-200)",
      cursor: "pointer", gap: 10,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
        {sub && <div className="t-small" style={{ marginTop: 2, fontSize: 11 }}>{sub}</div>}
      </div>
      <span className={`switch ${on ? "is-on" : ""}`}/>
    </div>
  );
}

function MoodStrip({ moodId, setMoodId }) {
  const groups = [
    { id: "default", label: null, items: MOODS.filter(m => m.group === "default") },
    { id: "now", label: "Right now", items: MOODS.filter(m => m.group === "now") },
    { id: "always", label: "Always available", items: MOODS.filter(m => m.group === "always") },
    { id: "soon", label: "Coming soon", items: MOODS.filter(m => m.group === "soon") },
  ];
  return (
    <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8 }}>
      {groups.map((g, gi) => (
        <div key={g.id} style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "flex-start" }}>
          {gi > 0 && <div style={{ width: 1, height: 96, background: "var(--cal-gray-200)", marginRight: 8 }}/>}
          <div>
            {g.label && <div className="t-eyebrow" style={{ fontSize: 10, marginBottom: 6 }}>{g.label}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              {g.items.map(m => (
                <MoodCard key={m.id} mood={m} active={m.id === moodId} disabled={g.id === "soon"} onClick={() => g.id !== "soon" && setMoodId(m.id)}/>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MoodCard({ mood, active, disabled, onClick }) {
  return (
    <div onClick={onClick} style={{
      width: 100, flexShrink: 0,
      borderRadius: 10,
      overflow: "hidden",
      cursor: disabled ? "not-allowed" : "pointer",
      boxShadow: active ? "0 0 0 2px var(--studio-violet), 0 0 0 4px var(--studio-violet-50)" : "var(--shadow-ring)",
      opacity: disabled ? 0.55 : 1,
      background: "white",
      transition: "box-shadow 120ms",
    }}>
      <div style={{ height: 64, position: "relative", background: mood.id === "none" ? "var(--cal-gray-100)" : "#888" }}>
        {mood.img ? (
          <img src={mood.img} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
        ) : (
          <div style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--fg-3)" }}>
            <I.Square size={20}/>
          </div>
        )}
        {disabled && <div style={{ position: "absolute", top: 6, left: 6, background: "rgba(0,0,0,0.7)", color: "white", fontSize: 9, padding: "2px 6px", borderRadius: 100 }}>Soon</div>}
      </div>
      <div style={{ padding: "6px 8px" }}>
        <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{mood.name}</div>
        {mood.until && <div style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 2 }}>Until {mood.until}</div>}
        {mood.from && <div style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 2 }}>From {mood.from}</div>}
      </div>
    </div>
  );
}

// =============== RESULTS ===============
function ResultsPage({ navigate, genId }) {
  const { history, setHistory } = useStore();
  const gen = history.find(g => g.id === genId);
  const [progress, setProgress] = gUS([0,0,0,0]); // 0=queued, 1=painting, 2=done, -1=failed
  const [editing, setEditing] = gUS(null); // index of variant being edited
  const [captionOpen, setCaptionOpen] = gUS(false);
  const [imgs, setImgs] = gUS([null, null, null, null]);
  const isRunning = gen?.status === "running";

  // Run the variant pipeline animation
  gUE(() => {
    if (!gen || !isRunning) {
      // historical generation — just show
      if (gen && gen.images) {
        setProgress([2,2,2,2]);
        setImgs(gen.images);
      }
      return;
    }
    const finalImgs = [STOCK[0], STOCK[3], STOCK[5], STOCK[2]];
    const timers = [];
    [0,1,2,3].forEach((i) => {
      timers.push(setTimeout(() => setProgress(p => p.map((v,j) => j===i?1:v)), 400 + i*350));
      timers.push(setTimeout(() => {
        setProgress(p => p.map((v,j) => j===i?2:v));
        setImgs(im => { const n=[...im]; n[i]=finalImgs[i]; return n; });
        if (i === 3) {
          setHistory(h => h.map(g => g.id===genId ? {...g, status:"complete", images:finalImgs} : g));
        }
      }, 1800 + i*500));
    });
    return () => timers.forEach(t => clearTimeout(t));
  }, [genId]);

  if (!gen) return (
    <div className="page">
      <div className="empty">
        <div className="empty__art"><I.AlertCircle size={28}/></div>
        <div className="empty__title">Generation not found</div>
        <button className="btn btn--secondary" style={{ marginTop: 12 }} onClick={() => navigate("/history")}>Go to history</button>
      </div>
    </div>
  );

  const allDone = progress.every(p => p === 2);
  const doneCount = progress.filter(p => p === 2).length;

  return (
    <div className="page page--wide">
      <div className="breadcrumb">
        <a onClick={() => navigate("/history")} style={{ cursor: "pointer" }}>Generations</a>
        <I.ChevronRight size={12}/>
        <span className="mono">{gen.id}</span>
      </div>
      <div className="page__head">
        <div>
          <h1 className="page__title">{gen.brief.length > 80 ? gen.brief.slice(0, 80) + "…" : gen.brief}</h1>
          <p className="page__sub">
            {BRANDS.find(b=>b.id===gen.brand)?.name}
            {gen.mood !== "none" && <> · {MOODS.find(m=>m.id===gen.mood)?.name} mood</>}
            {" · "}{gen.ar}
          </p>
        </div>
        <div className="row">
          {!allDone ? (
            <span className="pill pill--accent"><I.Loader size={12} className="spin"/>Generating · {doneCount} of 4 ready</span>
          ) : (
            <span className="pill pill--green"><I.Check size={12}/>4 of 4 ready</span>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {[0,1,2,3].map(i => <VariantCard key={i} state={progress[i]} img={imgs[i]} ar={gen.ar} brand={BRANDS.find(b=>b.id===gen.brand)} onEdit={() => setEditing(i)}/>)}
      </div>

      {/* Sticky footer */}
      <div style={{ position: "fixed", bottom: 0, left: "var(--sidebar-w)", right: 0, padding: 16, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", borderTop: "1px solid var(--cal-gray-200)", display: "flex", justifyContent: "center", gap: 12, zIndex: 100 }}>
        <button className="btn btn--secondary" onClick={() => navigate("/generate")}><I.Refresh size={14}/>Generate variations</button>
        <button className="btn btn--accent" onClick={() => setCaptionOpen(true)}><I.FileText size={14}/>Add caption · 1–5 credits</button>
      </div>

      {editing !== null && <EditTextDrawer onClose={() => setEditing(null)} variant={editing}/>}
      {captionOpen && <CaptionModal onClose={() => setCaptionOpen(false)}/>}
    </div>
  );
}

function VariantCard({ state, img, ar, brand, onEdit }) {
  const arPad = { "1:1": "100%", "4:5": "125%", "9:16": "177%", "16:9": "56.25%" }[ar] || "100%";
  const { push } = useToast();
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ position: "relative", paddingBottom: arPad, background: "var(--cal-gray-100)" }}>
        {state === 0 && <div className="skeleton" style={{ position: "absolute", inset: 0 }}/>}
        {state === 1 && (
          <div className="painting" style={{ position: "absolute", inset: 0 }}>
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "white", fontFamily: "var(--font-display)", fontSize: 18 }}>
              Painting your background…
            </div>
          </div>
        )}
        {state === 2 && img && (
          <>
            <img src={img} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", animation: "fade-in 400ms" }}/>
            <div style={{ position: "absolute", left: 16, top: 16, color: "white", fontFamily: "var(--font-display)", fontSize: 22, textShadow: "0 2px 8px rgba(0,0,0,0.4)", maxWidth: "60%", lineHeight: 1.1 }}>30% off</div>
            <div style={{ position: "absolute", right: 16, bottom: 16, padding: "6px 12px", borderRadius: 100, background: "rgba(255,255,255,0.95)", fontSize: 11, fontWeight: 600, fontFamily: "var(--font-display)", color: brand?.palette[0] || "#222" }}>{brand?.logoText || "—"}</div>
          </>
        )}
        {state === -1 && (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "var(--studio-red)" }}>
            <div style={{ textAlign: "center" }}>
              <I.AlertCircle size={28}/>
              <div style={{ marginTop: 8, fontSize: 13 }}>Failed</div>
              <button className="btn btn--secondary btn--sm" style={{ marginTop: 8 }}>Try again</button>
            </div>
          </div>
        )}

        {state === 2 && (
          <div style={{ position: "absolute", right: 12, top: 12, display: "flex", gap: 4, padding: 4, borderRadius: 8, background: "rgba(17,17,17,0.6)", backdropFilter: "blur(6px)", opacity: 0, transition: "opacity 160ms" }}
            onMouseEnter={(e)=>e.currentTarget.style.opacity=1} className="hover-actions">
            <button className="btn btn--icon" style={{ color: "white" }} onClick={()=>push("Image downloaded")}><I.Download size={14}/></button>
            <button className="btn btn--icon" style={{ color: "white" }} title="Regenerate · 5 credits"><I.Refresh size={14}/></button>
            <button className="btn btn--icon" style={{ color: "white" }} onClick={onEdit}><I.Type size={14}/></button>
            <button className="btn btn--icon" style={{ color: "white" }} onClick={()=>push("Link copied")}><I.Link size={14}/></button>
          </div>
        )}
      </div>
      <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--fg-3)", borderTop: "1px solid var(--cal-gray-200)" }}>
        <span>{ar} · Flux 1.1 Pro</span>
        <span className="mono">tpl_holiday-3</span>
      </div>
    </div>
  );
}

function EditTextDrawer({ onClose, variant }) {
  const [vals, setVals] = gUS({ headline: "30% off", sub: "This week only", cta: "Shop the sale" });
  return (
    <>
      <div className="scrim" onClick={onClose}/>
      <div className="drawer">
        <div className="drawer__head">
          <div className="drawer__title">Edit text · variant {variant + 1}</div>
          <button className="btn btn--icon btn--ghost" onClick={onClose}><I.X size={16}/></button>
        </div>
        <div className="drawer__body">
          <div className="card" style={{ padding: 12, background: "var(--studio-violet-50)", boxShadow: "none", border: "1px solid var(--studio-violet-100)", marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <I.Info size={14} style={{ color: "var(--studio-violet)", marginTop: 2 }}/>
              <div className="t-small" style={{ color: "var(--studio-violet-700)" }}>Editing text doesn't use credits — only regenerating the background does.</div>
            </div>
          </div>
          {[
            { k: "headline", l: "Headline" },
            { k: "sub", l: "Subhead" },
            { k: "cta", l: "Call to action" },
          ].map(f => (
            <div key={f.k} style={{ marginBottom: 16 }}>
              <label className="label">{f.l}</label>
              <input className="input" value={vals[f.k]} onChange={e => setVals(v => ({...v, [f.k]: e.target.value}))}/>
            </div>
          ))}
        </div>
        <div className="drawer__foot">
          <button className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn--accent" onClick={onClose}><I.Refresh size={14}/>Re-render</button>
        </div>
      </div>
    </>
  );
}

function CaptionModal({ onClose }) {
  const [tier, setTier] = gUS("medium");
  return (
    <>
      <div className="scrim" onClick={onClose}/>
      <div className="modal">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <h2 className="t-h3" style={{ margin: 0 }}>Add caption</h2>
          <button className="btn btn--icon btn--ghost" onClick={onClose}><I.X size={16}/></button>
        </div>
        <p className="t-small" style={{ margin: "0 0 20px" }}>We'll write a caption tuned to your brand voice.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {[
            { id: "short", l: "Short", c: 1, d: "1 line" },
            { id: "medium", l: "Medium", c: 3, d: "1 paragraph" },
            { id: "long", l: "Long", c: 5, d: "Full post" },
          ].map(t => (
            <div key={t.id} onClick={() => setTier(t.id)} className="card" style={{
              padding: 14, cursor: "pointer",
              boxShadow: tier === t.id ? "0 0 0 2px var(--studio-violet), 0 0 0 4px var(--studio-violet-50)" : "var(--shadow-ring)",
            }}>
              <div style={{ fontWeight: 500 }}>{t.l}</div>
              <div className="t-small">{t.d}</div>
              <div className="pill pill--accent" style={{ marginTop: 8 }}>{t.c} credits</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn--accent" onClick={onClose}>Generate caption</button>
        </div>
      </div>
    </>
  );
}

window.GeneratePage = GeneratePage;
window.ResultsPage = ResultsPage;
