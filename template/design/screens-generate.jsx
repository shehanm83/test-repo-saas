// Generation form (Screen 5) and Generation results (Screen 6)

const { useState: gUS, useEffect: gUE, useRef: gUR, useMemo: gUM } = React;


// =============== GENERATION FORM ===============

const SOCIAL_PLATFORMS = [
  { id: "ig", name: "Instagram", color: "#E4405F", icon: "ig", formats: [
    { id: "ig-post", label: "Post", ar: "1:1", w: 1080, h: 1080 },
    { id: "ig-portrait", label: "Portrait", ar: "4:5", w: 1080, h: 1350 },
    { id: "ig-story", label: "Story / Reel", ar: "9:16", w: 1080, h: 1920 },
  ]},
  { id: "fb", name: "Facebook", color: "#1877F2", icon: "fb", formats: [
    { id: "fb-post", label: "Post", ar: "1.91:1", w: 1200, h: 630 },
    { id: "fb-story", label: "Story", ar: "9:16", w: 1080, h: 1920 },
  ]},
  { id: "li", name: "LinkedIn", color: "#0A66C2", icon: "li", formats: [
    { id: "li-post", label: "Post", ar: "1.91:1", w: 1200, h: 627 },
    { id: "li-square", label: "Square", ar: "1:1", w: 1200, h: 1200 },
  ]},
  { id: "tt", name: "TikTok", color: "#0E0E10", icon: "tt", formats: [
    { id: "tt-photo", label: "Photo / Story", ar: "9:16", w: 1080, h: 1920 },
  ]},
  { id: "pn", name: "Pinterest", color: "#E60023", icon: "pn", formats: [
    { id: "pn-pin", label: "Pin", ar: "2:3", w: 1000, h: 1500 },
    { id: "pn-story", label: "Story", ar: "9:16", w: 1080, h: 1920 },
  ]},
  { id: "yt", name: "YouTube", color: "#FF0000", icon: "yt", formats: [
    { id: "yt-thumb", label: "Thumbnail", ar: "16:9", w: 1280, h: 720 },
  ]},
  { id: "tw", name: "X / Twitter", color: "#0E0E10", icon: "tw", formats: [
    { id: "tw-image", label: "Image", ar: "16:9", w: 1600, h: 900 },
  ]},
];

// Brand logo marks — simplified but recognizable. All on 24×24 viewBox, filled.
function PlatformGlyph({ id, size = 14, color = "currentColor" }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: color };
  if (id === "ig") return (
    <svg {...common}>
      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23a3.7 3.7 0 0 1-.9 1.38c-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 2.16c-3.14 0-3.51.01-4.75.07-1.07.05-1.65.23-2.04.38-.51.2-.88.44-1.27.83-.39.39-.63.76-.83 1.27-.15.39-.33.97-.38 2.04-.06 1.24-.07 1.61-.07 4.75s.01 3.51.07 4.75c.05 1.07.23 1.65.38 2.04.2.51.44.88.83 1.27.39.39.76.63 1.27.83.39.15.97.33 2.04.38 1.24.06 1.61.07 4.75.07s3.51-.01 4.75-.07c1.07-.05 1.65-.23 2.04-.38.51-.2.88-.44 1.27-.83.39-.39.63-.76.83-1.27.15-.39.33-.97.38-2.04.06-1.24.07-1.61.07-4.75s-.01-3.51-.07-4.75c-.05-1.07-.23-1.65-.38-2.04a3.4 3.4 0 0 0-.83-1.27 3.4 3.4 0 0 0-1.27-.83c-.39-.15-.97-.33-2.04-.38-1.24-.06-1.61-.07-4.75-.07zm0 3.68a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 6.6a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2zm5.1-6.76a.94.94 0 1 1 0-1.87.94.94 0 0 1 0 1.87z"/>
    </svg>
  );
  if (id === "fb") return (
    <svg {...common}>
      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/>
    </svg>
  );
  if (id === "li") return (
    <svg {...common}>
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14zM8.34 18.34V10H5.67v8.34h2.67zM7 8.84a1.55 1.55 0 1 0 0-3.1 1.55 1.55 0 0 0 0 3.1zm11.34 9.5v-4.57c0-2.39-1.27-3.5-2.97-3.5-1.37 0-1.99.75-2.33 1.28V10h-2.67c.04.75 0 8.34 0 8.34h2.67v-4.66c0-.24.02-.48.09-.65.19-.48.62-.97 1.36-.97.96 0 1.34.73 1.34 1.8v4.48h2.51z"/>
    </svg>
  );
  if (id === "tt") return (
    <svg {...common}>
      <path d="M19.6 6.7a5.7 5.7 0 0 1-3.5-1.2 5.7 5.7 0 0 1-2.2-3.6h-3.4v13.6a3 3 0 0 1-5.4 1.8 3 3 0 0 1 4-4.4V9.4a6.5 6.5 0 1 0 5.4 6.4V9.4a9.1 9.1 0 0 0 5.1 1.6V7.6a5.4 5.4 0 0 1-1-.9z"/>
    </svg>
  );
  if (id === "pn") return (
    <svg {...common}>
      <path d="M12 2C6.48 2 2 6.48 2 12c0 4.24 2.64 7.85 6.36 9.3-.09-.79-.17-2 .03-2.86.18-.78 1.18-4.97 1.18-4.97s-.3-.6-.3-1.49c0-1.4.81-2.44 1.82-2.44.86 0 1.27.64 1.27 1.42 0 .87-.55 2.16-.84 3.36-.24 1 .5 1.82 1.49 1.82 1.79 0 3.16-1.89 3.16-4.61 0-2.41-1.73-4.1-4.21-4.1-2.86 0-4.54 2.15-4.54 4.37 0 .87.33 1.79.75 2.3.08.1.1.19.07.29-.08.32-.25 1-.28 1.14-.04.18-.15.22-.34.13-1.24-.58-2.02-2.4-2.02-3.85 0-3.14 2.28-6.02 6.57-6.02 3.45 0 6.13 2.46 6.13 5.74 0 3.43-2.16 6.18-5.16 6.18-1.01 0-1.95-.52-2.27-1.14l-.62 2.36c-.22.86-.83 1.94-1.24 2.6.93.29 1.92.44 2.94.44 5.52 0 10-4.48 10-10S17.52 2 12 2z"/>
    </svg>
  );
  if (id === "yt") return (
    <svg {...common}>
      <path d="M21.6 7.2a2.5 2.5 0 0 0-1.78-1.78C18.25 5 12 5 12 5s-6.25 0-7.82.42A2.5 2.5 0 0 0 2.4 7.2C2 8.78 2 12 2 12s0 3.22.4 4.8a2.5 2.5 0 0 0 1.78 1.78C5.75 19 12 19 12 19s6.25 0 7.82-.42a2.5 2.5 0 0 0 1.78-1.78C22 15.22 22 12 22 12s0-3.22-.4-4.8zM10 15V9l5.2 3-5.2 3z"/>
    </svg>
  );
  if (id === "tw") return (
    <svg {...common}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z"/>
    </svg>
  );
  return null;
}

function GeneratePage({ navigate }) {
  const { activeBrandId, setActiveBrandId, credits, setCredits, history, setHistory } = useStore();
  const brand = BRANDS.find(b => b.id === activeBrandId) || BRANDS[0];
  const [brief, setBrief] = gUS("");
  const [moodId, setMoodId] = gUS("none");
  const [target, setTarget] = gUS("social"); // "social" | "image"
  const [formatId, setFormatId] = gUS("ig-post"); // when social
  const [ar, setAr] = gUS("1:1"); // when "image"
  const [premium, setPremium] = gUS(false);
  const [inspiration, setInspiration] = gUS(null);
  const [brandOpen, setBrandOpen] = gUS(false);
  const [toggles, setToggles] = gUS({
    colors: true, logo: true, fonts: true, strict: false,
    moodPrompt: true, moodMotif: true, moodAccent: true,
  });
  const tog = (k) => setToggles(t => ({ ...t, [k]: !t[k] }));

  const fileRef = gUR(null);

  // Resolve current format details
  const allFormats = SOCIAL_PLATFORMS.flatMap(p => p.formats.map(f => ({ ...f, platformId: p.id, platformName: p.name, platformColor: p.color })));
  const fmt = allFormats.find(f => f.id === formatId);
  const activeAr = target === "social" ? (fmt?.ar || "1:1") : ar;

  const cost = (premium ? 60 : 20) + (inspiration ? 4 : 0);
  const variants = 4;

  const briefValid = brief.trim().length > 0;
  const targetValid = target === "social" ? !!fmt : true;
  const canSubmit = briefValid && targetValid;

  const submit = () => {
    if (!canSubmit) return;
    const id = "g_" + Math.random().toString(36).slice(2, 6);
    const newGen = {
      id, brief, brand: brand.id, mood: moodId, ar: activeAr, status: "running",
      credits: cost, when: "Just now", images: [null, null, null, null],
    };
    setHistory(h => [newGen, ...h]);
    setCredits(c => c - cost);
    navigate(`/results/${id}`);
  };

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setInspiration({ name: f.name, url });
  };

  const ARS = [
    { id: "1:1", label: "Square", w: 18, h: 18 },
    { id: "4:5", label: "Portrait", w: 16, h: 20 },
    { id: "9:16", label: "Story", w: 12, h: 22 },
    { id: "16:9", label: "Landscape", w: 24, h: 14 },
  ];

  return (
    <div className="gen-grid" style={{ height: "100%", minHeight: "calc(100vh - 56px)" }}>
      <div style={{ overflowY: "auto", padding: "32px 32px 80px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div className="page__head" style={{ marginBottom: 24 }}>
            <div>
              <h1 className="page__title">New generation</h1>
              <p className="page__sub">Describe what you want. Studio handles the rest.</p>
            </div>
          </div>

          {/* 1. OUTPUT TARGET */}
          <SectionLabel n="1" label="What's it for?"/>
          <div style={{ display: "inline-flex", padding: 4, background: "var(--cal-gray-100)", borderRadius: 10, gap: 2 }}>
            {[
              { id: "social", label: "For social", icon: <I.Share size={14}/> },
              { id: "image", label: "Just an image", icon: <I.Image size={14}/> },
            ].map(o => (
              <button key={o.id} onClick={() => setTarget(o.id)} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 14px", border: 0, cursor: "pointer", borderRadius: 8,
                background: target === o.id ? "white" : "transparent",
                color: target === o.id ? "var(--fg-1)" : "var(--fg-3)",
                fontWeight: target === o.id ? 600 : 500, fontSize: 13,
                boxShadow: target === o.id ? "var(--shadow-ring), 0 1px 2px rgba(0,0,0,0.04)" : "none",
                transition: "all 120ms",
              }}>{o.icon}{o.label}</button>
            ))}
          </div>

          {/* Platform format strip — visible only in social */}
          {target === "social" && (
            <div style={{ marginTop: 14 }}>
              {/* Platform tabs */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {SOCIAL_PLATFORMS.map(p => {
                  const active = fmt?.platformId === p.id;
                  return (
                    <button key={p.id} onClick={() => setFormatId(p.formats[0].id)} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "8px 14px 8px 10px", borderRadius: 100,
                      background: active ? p.color : "white",
                      color: active ? "white" : "var(--fg-1)",
                      border: 0, cursor: "pointer", fontSize: 13, fontWeight: 500,
                      boxShadow: active ? "var(--shadow-button-highlight)" : "var(--shadow-ring)",
                      height: 36, whiteSpace: "nowrap",
                      transition: "all var(--duration-fast) var(--ease-standard)",
                    }}>
                      <span style={{ width: 22, height: 22, borderRadius: 6, background: active ? "rgba(255,255,255,0.18)" : p.color + "12", color: active ? "white" : p.color, display: "grid", placeItems: "center" }}>
                        <PlatformGlyph id={p.icon} size={14} color="currentColor"/>
                      </span>
                      <span>{p.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Format pills for selected platform */}
              {fmt && (() => {
                const platform = SOCIAL_PLATFORMS.find(p => p.id === fmt.platformId);
                if (!platform || platform.formats.length < 2) return (
                  <div className="t-small" style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 100, background: fmt.platformColor }}/>
                    <span><strong style={{ color: "var(--fg-1)" }}>{fmt.platformName} {fmt.label}</strong> · {fmt.ar} · <span className="mono">{fmt.w}×{fmt.h}</span></span>
                  </div>
                );
                return (
                  <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {platform.formats.map(f => {
                      const active = formatId === f.id;
                      return (
                        <button key={f.id} onClick={() => setFormatId(f.id)} style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "5px 10px", borderRadius: 100,
                          background: active ? "var(--cal-charcoal)" : "transparent",
                          color: active ? "white" : "var(--fg-2)",
                          border: active ? 0 : "1px solid var(--cal-gray-300)",
                          cursor: "pointer", fontSize: 12, fontWeight: 500, height: 28,
                        }}>
                          <span>{f.label}</span>
                          <span style={{ opacity: 0.6, fontFamily: "var(--font-mono)", fontSize: 10 }}>{f.ar}</span>
                        </button>
                      );
                    })}
                    <span className="t-small" style={{ marginLeft: 4, fontFamily: "var(--font-mono)" }}>{fmt.w}×{fmt.h}</span>
                  </div>
                );
              })()}
            </div>
          )}

          {/* 2. BRIEF */}
          <div style={{ marginTop: 32 }}>
            <SectionLabel n="2" label="Brief"/>
            <div style={{ position: "relative" }}>
              <textarea
                rows={4} maxLength={500} autoFocus
                placeholder="Describe what you want. e.g. 'Christmas sale, cozy living room with a glowing tree, 30% off'"
                value={brief}
                onChange={e => setBrief(e.target.value)}
                style={{
                  width: "100%", boxSizing: "border-box", resize: "vertical",
                  fontSize: 18, lineHeight: 1.45, padding: "18px 20px 36px",
                  fontFamily: "inherit", color: "var(--fg-1)",
                  background: "white", border: 0, borderRadius: 14,
                  boxShadow: brief ? "0 0 0 2px var(--studio-violet-100), var(--shadow-ring)" : "var(--shadow-ring)",
                  outline: "none", minHeight: 120,
                  transition: "box-shadow 120ms",
                }}
                onFocus={e => e.target.style.boxShadow = "0 0 0 2px var(--studio-violet), var(--shadow-ring)"}
                onBlur={e => e.target.style.boxShadow = brief ? "0 0 0 2px var(--studio-violet-100), var(--shadow-ring)" : "var(--shadow-ring)"}
              />
              <div style={{ position: "absolute", bottom: 12, right: 16, fontSize: 11, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>
                {brief.length} / 500
              </div>
            </div>
          </div>

          {/* 3. INSPIRATION IMAGE */}
          <div style={{ marginTop: 28 }}>
            <SectionLabel n="3" label="Inspiration image" optional/>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile} style={{ display: "none" }}/>
            {inspiration ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: "white", borderRadius: 12, boxShadow: "var(--shadow-ring)" }}>
                <div style={{ width: 56, height: 56, borderRadius: 8, overflow: "hidden", background: "var(--cal-gray-100)" }}>
                  <img src={inspiration.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inspiration.name}</div>
                  <div className="t-small" style={{ fontSize: 11, marginTop: 2 }}>Used for this generation only · +4 credits</div>
                </div>
                <button className="btn btn--icon btn--ghost" onClick={() => setInspiration(null)}><I.X size={14}/></button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} style={{
                display: "flex", alignItems: "center", gap: 12, width: "100%",
                padding: "14px 16px", background: "white",
                border: "1.5px dashed var(--cal-gray-300)", borderRadius: 12,
                cursor: "pointer", textAlign: "left", color: "var(--fg-2)",
                transition: "border-color 120ms, background 120ms",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--studio-violet)"; e.currentTarget.style.background = "var(--studio-violet-50)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--cal-gray-300)"; e.currentTarget.style.background = "white"; }}>
                <span style={{ width: 36, height: 36, borderRadius: 8, background: "var(--cal-gray-100)", display: "grid", placeItems: "center", color: "var(--fg-3)" }}>
                  <I.Upload size={16}/>
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-1)" }}>Drop a reference image</div>
                  <div className="t-small" style={{ fontSize: 11, marginTop: 2 }}>JPG, PNG, WebP · max 10 MB · this generation only</div>
                </div>
              </button>
            )}
          </div>

          {/* 4. BRAND — full-width card */}
          <div style={{ marginTop: 28 }}>
            <SectionLabel n="4" label="Brand"/>
            <BrandCard brand={brand} open={brandOpen} setOpen={setBrandOpen} setActiveBrandId={setActiveBrandId}/>
          </div>

          {/* 5. ASPECT RATIO — only when "image" */}
          {target === "image" && (
            <div style={{ marginTop: 28 }}>
              <SectionLabel n="5" label="Aspect ratio"/>
              <div style={{ display: "flex", gap: 8 }}>
                {ARS.map(a => {
                  const active = ar === a.id;
                  return (
                    <button key={a.id} onClick={() => setAr(a.id)} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      height: 56, padding: "0 16px", borderRadius: 12,
                      background: active ? "var(--cal-charcoal)" : "white",
                      color: active ? "white" : "var(--fg-1)",
                      border: 0, cursor: "pointer",
                      boxShadow: active ? "var(--shadow-button-highlight)" : "var(--shadow-ring)",
                    }}>
                      <div style={{ width: a.w, height: a.h, borderRadius: 2, background: "currentColor", opacity: 0.7 }}/>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{a.id}</span>
                        <span style={{ opacity: 0.6, fontSize: 11 }}>{a.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 6. MOOD — single horizontal strip */}
          <div style={{ marginTop: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <SectionLabel n={target === "image" ? "6" : "5"} label="Mood"/>
              <a className="t-small" style={{ cursor: "pointer", color: "var(--fg-2)", fontSize: 12 }} onClick={() => navigate("/moods")}>Browse all moods →</a>
            </div>
            <MoodRow moodId={moodId} setMoodId={setMoodId}/>
          </div>

          {/* CTA */}
          <div style={{ marginTop: 36, display: "flex", gap: 12, alignItems: "center" }}>
            <button className="btn btn--accent btn--lg" onClick={submit} disabled={!canSubmit} style={{ height: 52, padding: "0 24px", fontSize: 15 }}>
              <I.Sparkle size={16}/>Generate · {cost} credits
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
            sub="Mood only influences the AI background — no decorative motifs or accent overlays." last/>
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

        <div style={{ marginTop: 24, padding: "14px 16px", background: "white", borderRadius: 12, boxShadow: "var(--shadow-ring)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="t-small">Estimated cost</span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>{cost}<span style={{ fontSize: 12, color: "var(--fg-3)", marginLeft: 4 }}>credits</span></span>
          </div>
          <div className="t-small" style={{ marginTop: 4, fontSize: 11 }}>
            {premium ? "15 × 4 variants" : "5 × 4 variants"}{inspiration && " · +4 inspiration"}
          </div>
          <div style={{ marginTop: 10, height: 4, borderRadius: 100, background: "var(--cal-gray-100)", overflow: "hidden" }}>
            <div style={{ width: `${Math.min(100, (cost / Math.max(credits, 1)) * 100)}%`, height: "100%", background: "var(--studio-violet)" }}/>
          </div>
          <div className="t-small" style={{ marginTop: 6, fontSize: 11, display: "flex", justifyContent: "space-between" }}>
            <span>After this run</span>
            <span className="mono">{Math.max(0, credits - cost)} left</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ n, label, optional }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <span style={{
        width: 22, height: 22, borderRadius: 100,
        background: "var(--cal-charcoal)", color: "white",
        display: "grid", placeItems: "center",
        fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600,
      }}>{n}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-1)", letterSpacing: 0.1 }}>{label}</span>
      {optional && <span className="pill" style={{ height: 18, fontSize: 10, color: "var(--fg-3)", background: "var(--cal-gray-100)", boxShadow: "none" }}>optional</span>}
    </div>
  );
}

function BrandCard({ brand, open, setOpen, setActiveBrandId }) {
  const palette = brand.palette || [];
  const fonts = [brand.fontHeading, brand.fontBody].filter(Boolean);
  return (
    <div className="card" style={{ padding: 0, overflow: "visible", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: 18 }}>
        {/* Logo */}
        <div style={{
          width: 56, height: 56, borderRadius: 12, flexShrink: 0,
          background: brand.dot, color: "white",
          display: "grid", placeItems: "center",
          fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600,
          boxShadow: "var(--shadow-ring)",
        }}>{brand.logoText}</div>

        {/* Name + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, fontFamily: "var(--font-display)" }}>{brand.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
            {/* Palette */}
            <div style={{ display: "flex", gap: 4 }}>
              {palette.slice(0, 5).map((c, i) => (
                <span key={i} title={c} style={{ width: 18, height: 18, borderRadius: 5, background: c, boxShadow: "var(--shadow-ring)" }}/>
              ))}
            </div>
            {/* Fonts */}
            {fonts.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--fg-3)" }}>
                <I.Type size={11}/>
                {fonts.map((f, i) => (
                  <span key={f} style={{ fontFamily: f, fontSize: 13, color: "var(--fg-2)" }}>
                    {f}{i < fonts.length - 1 && <span style={{ marginLeft: 6, color: "var(--fg-4)" }}>·</span>}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {BRANDS.length > 1 && (
          <button onClick={() => setOpen(o => !o)} className="btn btn--secondary btn--sm" style={{ flexShrink: 0 }}>
            Switch<I.ChevronDown size={12} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 120ms" }}/>
          </button>
        )}
      </div>

      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 50 }} onClick={() => setOpen(false)}/>
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", right: 12, zIndex: 60,
            background: "white", borderRadius: 10, boxShadow: "0 10px 32px rgba(0,0,0,0.12), var(--shadow-ring)",
            minWidth: 240, padding: 6,
          }}>
            {BRANDS.map(b => (
              <div key={b.id} onClick={() => { setActiveBrandId(b.id); setOpen(false); }} style={{
                display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 8,
                cursor: "pointer", background: b.id === brand.id ? "var(--cal-gray-50)" : "transparent",
              }} onMouseEnter={e => e.currentTarget.style.background = "var(--cal-gray-50)"} onMouseLeave={e => e.currentTarget.style.background = b.id === brand.id ? "var(--cal-gray-50)" : "transparent"}>
                <span style={{ width: 28, height: 28, borderRadius: 6, background: b.dot, color: "white", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontSize: 11, flexShrink: 0 }}>{b.logoText}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{b.name}</span>
                {b.id === brand.id && <I.Check size={14} style={{ color: "var(--studio-violet)" }}/>}
              </div>
            ))}
          </div>
        </>
      )}
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

function MoodRow({ moodId, setMoodId }) {
  const scrollRef = gUR(null);
  const groups = [
    { id: "default", label: null, items: MOODS.filter(m => m.group === "default") },
    { id: "now", label: "Right now", items: MOODS.filter(m => m.group === "now") },
    { id: "always", label: "Always", items: MOODS.filter(m => m.group === "always") },
    { id: "soon", label: "Coming soon", items: MOODS.filter(m => m.group === "soon") },
  ];

  const scrollBy = (dx) => {
    scrollRef.current?.scrollBy({ left: dx, behavior: "smooth" });
  };

  return (
    <div style={{ position: "relative" }}>
      <div ref={scrollRef} className="no-scrollbar" style={{
        display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4,
        scrollbarWidth: "none",
        maskImage: "linear-gradient(90deg, transparent 0, black 24px, black calc(100% - 48px), transparent 100%)",
        WebkitMaskImage: "linear-gradient(90deg, transparent 0, black 24px, black calc(100% - 48px), transparent 100%)",
      }}>
        {groups.map((g, gi) => (
          g.items.length === 0 ? null : (
            <div key={g.id} style={{ display: "flex", gap: 10, flexShrink: 0, alignItems: "stretch" }}>
              {gi > 0 && <div style={{ width: 1, background: "var(--cal-gray-200)", margin: "8px 4px" }}/>}
              {g.items.map(m => (
                <MoodPill key={m.id} mood={m} active={m.id === moodId} disabled={g.id === "soon"} groupLabel={g.label} onClick={() => g.id !== "soon" && setMoodId(m.id)}/>
              ))}
            </div>
          )
        ))}
      </div>

      {/* Scroll arrows */}
      <button onClick={() => scrollBy(-280)} aria-label="Scroll left" style={{
        position: "absolute", left: -4, top: "50%", transform: "translateY(-50%)",
        width: 32, height: 32, borderRadius: 100, background: "white",
        border: 0, cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.12), var(--shadow-ring)",
        display: "grid", placeItems: "center",
      }}><I.ChevronLeft size={14}/></button>
      <button onClick={() => scrollBy(280)} aria-label="Scroll right" style={{
        position: "absolute", right: -4, top: "50%", transform: "translateY(-50%)",
        width: 32, height: 32, borderRadius: 100, background: "white",
        border: 0, cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.12), var(--shadow-ring)",
        display: "grid", placeItems: "center",
      }}><I.ChevronRight size={14}/></button>
    </div>
  );
}

function MoodPill({ mood, active, disabled, groupLabel, onClick }) {
  const isNone = mood.id === "none";
  return (
    <div onClick={onClick} style={{
      width: 124, flexShrink: 0,
      borderRadius: 12, overflow: "hidden",
      cursor: disabled ? "not-allowed" : "pointer",
      background: "white",
      boxShadow: active ? "0 0 0 2px var(--studio-violet), 0 4px 16px rgba(94,92,230,0.15)" : "var(--shadow-ring)",
      opacity: disabled ? 0.65 : 1,
      transition: "transform 120ms, box-shadow 120ms",
      transform: active ? "translateY(-2px)" : "none",
    }}
      onMouseEnter={e => { if (!disabled && !active) e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.transform = "none"; }}>
      <div style={{ height: 80, position: "relative", background: isNone ? "linear-gradient(135deg, #FBE5C2 0%, #E8E7FA 100%)" : "var(--cal-gray-100)" }}>
        {mood.img && !isNone ? (
          <img src={mood.img} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
        ) : isNone ? (
          <div style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--studio-violet)" }}>
            <I.Sparkle size={22}/>
          </div>
        ) : null}
        {/* Color dots overlay */}
        {mood.colors && (
          <div style={{ position: "absolute", left: 6, bottom: 6, display: "flex", gap: 2 }}>
            {mood.colors.slice(0, 3).map((c, i) => (
              <span key={i} style={{ width: 10, height: 10, borderRadius: 100, background: c, boxShadow: "0 0 0 1.5px white" }}/>
            ))}
          </div>
        )}
        {disabled && <div style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.7)", color: "white", fontSize: 9, padding: "2px 6px", borderRadius: 100 }}>Soon</div>}
        {active && <div style={{ position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: 100, background: "var(--studio-violet)", color: "white", display: "grid", placeItems: "center" }}><I.Check size={10}/></div>}
      </div>
      <div style={{ padding: "8px 10px" }}>
        <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--fg-1)" }}>{mood.name}</div>
        <div style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 2 }}>
          {isNone ? "Default" : (mood.until ? `Until ${mood.until}` : mood.from ? `From ${mood.from}` : groupLabel || "Evergreen")}
        </div>
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
