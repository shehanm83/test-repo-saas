// Marketing landing, sign-in/up, onboarding wizard

const { useState: useS1, useEffect: useE1 } = React;

// ============== LANDING ==============
function Landing({ navigate }) {
  return (
    <div style={{ background: "var(--cal-white)", minHeight: "100vh", overflow: "hidden" }}>
      {/* Nav */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", borderBottom: "1px solid var(--cal-gray-200)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-display)", fontSize: 20 }}>
            <StudioMark/> Studio
          </div>
          <div style={{ display: "flex", gap: 24, marginLeft: 32 }}>
            <a className="t-ui muted" style={{ cursor: "pointer" }}>Product</a>
            <a className="t-ui muted" style={{ cursor: "pointer" }}>Moods</a>
            <a className="t-ui muted" style={{ cursor: "pointer" }}>Pricing</a>
            <a className="t-ui muted" style={{ cursor: "pointer" }}>Docs</a>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button className="btn btn--ghost" onClick={() => navigate("/signin")}>Sign in</button>
            <button className="btn btn--primary" onClick={() => navigate("/signup")}>Start free</button>
          </div>
        </div>
      </header>

      {/* HERO — colorful, with floating gallery */}
      <section style={{ position: "relative", padding: "72px 24px 88px", background: "radial-gradient(ellipse 90% 70% at 50% 0%, #FBE5C2 0%, transparent 55%), radial-gradient(ellipse 60% 60% at 100% 30%, #E8E7FA 0%, transparent 60%), radial-gradient(ellipse 50% 60% at 0% 60%, #D7E5C7 0%, transparent 60%), var(--cal-white)" }}>
        {/* Decorative floating chips */}
        <div style={{ position: "absolute", top: 90, right: "8%", transform: "rotate(-6deg)", display: "flex", gap: 6, opacity: 0.85 }}>
          {["#7A0E0E","#0E5C2F","#E8C66B","#5E5CE6"].map(c => <span key={c} style={{ width: 16, height: 16, borderRadius: 4, background: c, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}/>)}
        </div>
        <div style={{ position: "absolute", top: 220, left: "6%", transform: "rotate(7deg)", padding: "8px 14px", borderRadius: 100, background: "white", boxShadow: "0 8px 24px rgba(0,0,0,0.08)", fontFamily: "var(--font-display)", fontSize: 14, color: "var(--studio-violet)", display: "flex", alignItems: "center", gap: 8 }}>
          <I.Sparkle size={14}/> 47 generations today
        </div>

        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative" }}>
          <div style={{ maxWidth: 820 }}>
            <div className="pill" style={{ marginBottom: 24, background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06), var(--shadow-ring)", height: 28 }}>
              <span className="dot" style={{background:"var(--studio-violet)"}}/>Studio v1 · live now
            </div>
            <h1 className="t-display" style={{ fontSize: 88, lineHeight: 0.96, margin: 0, letterSpacing: "-1.5px" }}>
              On-brand images,<br/>
              <span style={{
                background: "linear-gradient(110deg, #C97A3F 0%, #7A0E0E 35%, #5E5CE6 70%, #1F7A5A 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>in a sentence.</span>
            </h1>
            <p className="t-lede" style={{ fontSize: 20, marginTop: 24, maxWidth: 620, color: "var(--fg-2)" }}>
              Describe what you want. Pick your brand. Click generate. Studio produces finished marketing images with your logo, fonts, and colors — exact, every time.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
              <button className="btn btn--accent btn--lg" onClick={() => navigate("/signup")}>Start free<I.ArrowRight size={16}/></button>
              <button className="btn btn--secondary btn--lg" style={{ background: "white" }}><I.Play size={14}/>See it work · 90s</button>
            </div>
            <div className="t-small" style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 16 }}>
              <span><I.Check size={11} style={{verticalAlign:"-1px", color: "var(--studio-green)"}}/> Free for one brand</span>
              <span><I.Check size={11} style={{verticalAlign:"-1px", color: "var(--studio-green)"}}/> No card required</span>
              <span><I.Check size={11} style={{verticalAlign:"-1px", color: "var(--studio-green)"}}/> Cancel anytime</span>
            </div>
          </div>

          {/* Hero visual: input -> output */}
          <div style={{ marginTop: 64, display: "grid", gridTemplateColumns: "360px 60px 1fr", gap: 24, alignItems: "center" }}>
            <div className="card card--elevated" style={{ padding: 20, background: "white" }}>
              <div className="t-eyebrow" style={{ marginBottom: 8, color: "var(--studio-violet)" }}>Brief</div>
              <div style={{ background: "var(--cal-gray-50)", borderRadius: 8, padding: 14, fontSize: 14, color: "var(--fg-1)", boxShadow: "var(--shadow-inset)" }}>
                "Christmas sale, cozy living room with a glowing tree, 30% off"
              </div>
              <div className="t-eyebrow" style={{ marginTop: 16, marginBottom: 8 }}>Brand</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, background: "var(--cal-gray-50)", borderRadius: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: "#2A1F18", color: "#E8DCC4", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontSize: 13 }}>NW</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Northwind Coffee</div>
                  <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                    {["#2A1F18","#7C5232","#E8DCC4","#C9A86A"].map(c => <span key={c} style={{ width: 12, height: 12, borderRadius: 3, background: c, boxShadow: "var(--shadow-ring)" }}/>)}
                  </div>
                </div>
              </div>
              <div className="t-eyebrow" style={{ marginTop: 16, marginBottom: 8 }}>Mood</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, background: "linear-gradient(135deg, #FCE5C5, #F8D8D8)", borderRadius: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: "#7A0E0E", display: "grid", placeItems: "center", color: "#E8C66B" }}>
                  <I.Snowflake size={16}/>
                </div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Christmas</div>
              </div>
            </div>
            <div style={{ display: "grid", placeItems: "center", color: "var(--studio-violet)" }}>
              <div style={{ width: 48, height: 48, borderRadius: 100, background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", display: "grid", placeItems: "center" }}>
                <I.ArrowRight size={20}/>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[STOCK[0], STOCK[3], STOCK[5], STOCK[2]].map((s,i) => (
                <div key={i} className="card" style={{ padding: 0, overflow: "hidden", aspectRatio: "1 / 1", position: "relative", transform: i === 1 ? "rotate(1deg)" : i === 2 ? "rotate(-1deg)" : "none", boxShadow: "0 8px 32px rgba(0,0,0,0.08), var(--shadow-ring)" }}>
                  <img src={s} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt=""/>
                  <div style={{ position: "absolute", left: 12, top: 12, color: "white", fontFamily: "var(--font-display)", fontSize: 16, textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>30% off</div>
                  <div style={{ position: "absolute", left: 12, bottom: 12, width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,0.95)", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontSize: 11, color: "#2A1F18" }}>NW</div>
                </div>
              ))}
            </div>
          </div>

          {/* Trust strip */}
          <div style={{ marginTop: 80, padding: "20px 0", borderTop: "1px solid var(--cal-gray-200)", borderBottom: "1px solid var(--cal-gray-200)", display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap", justifyContent: "center" }}>
            <span className="t-small" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5 }}>Trusted by 1,400+ teams</span>
            {["NORTHWIND","LUMEN","ATLAS","KESTREL","PALOMA","HEMLOCK"].map(n => (
              <div key={n} style={{ fontFamily: "var(--font-display)", fontSize: 14, letterSpacing: 2, color: "var(--fg-3)" }}>{n}</div>
            ))}
          </div>
        </div>
      </section>

      {/* MOOD GALLERY — colorful new section */}
      <section style={{ background: "var(--cal-charcoal)", color: "white", padding: "96px 24px", position: "relative", overflow: "hidden" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 48, flexWrap: "wrap", gap: 24 }}>
            <div>
              <div className="t-eyebrow" style={{ color: "#FBE5C2" }}>Moods</div>
              <h2 className="t-h1" style={{ color: "white", marginTop: 8, maxWidth: 620 }}>Seasonal flavor.<br/>Without abandoning your brand.</h2>
            </div>
            <p style={{ color: "rgba(255,255,255,0.7)", maxWidth: 380, fontSize: 16 }}>Curated style packs blend with your brand on demand. Christmas, Midsummer, Bauhaus — tonally consistent, never costume-y.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {MOODS.filter(m => m.img).slice(0,4).map(m => (
              <div key={m.id} style={{ borderRadius: 12, overflow: "hidden", aspectRatio: "3/4", position: "relative", cursor: "pointer", transition: "transform 200ms" }}
                onMouseEnter={e=>e.currentTarget.style.transform="translateY(-4px)"} onMouseLeave={e=>e.currentTarget.style.transform=""}>
                <img src={m.img} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.7) 100%)" }}/>
                <div style={{ position: "absolute", left: 16, top: 16, display: "flex", gap: 4 }}>
                  {(m.colors || []).map(c => <span key={c} style={{ width: 14, height: 14, borderRadius: 100, background: c, boxShadow: "0 0 0 1.5px white" }}/>)}
                </div>
                <div style={{ position: "absolute", left: 16, right: 16, bottom: 16, color: "white" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 22 }}>{m.name}</div>
                  <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{m.kind}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 32 }}>
            <button className="btn btn--secondary" style={{ background: "rgba(255,255,255,0.1)", color: "white", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.2)" }} onClick={() => navigate("/signup")}>Browse 40+ moods<I.ArrowRight size={14}/></button>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — colored cards */}
      <section style={{ padding: "96px 24px", background: "linear-gradient(180deg, var(--cal-white) 0%, #FFFAF0 100%)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="t-eyebrow" style={{ color: "var(--studio-violet)" }}>How it works</div>
          <h2 className="t-h1" style={{ marginTop: 8, maxWidth: 720 }}>Three steps. Two minutes. A thousand finished images.</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginTop: 48 }}>
            {[
              { n: "01", t: "Set up your brand", d: "Upload a logo, paste your colors, pick fonts. About 30 seconds. Or paste your URL — we'll grab them for you.", icon: <I.Briefcase size={22}/>, bg: "linear-gradient(135deg, #FFE5C7, #FBC8A6)", iconBg: "#C97A3F" },
              { n: "02", t: "Describe what you want", d: "One or two sentences. Optionally pick a Mood — a curated style pack like Christmas or Minimalist Tech.", icon: <I.Wand size={22}/>, bg: "linear-gradient(135deg, #E8E7FA, #D4D2F5)", iconBg: "#5E5CE6" },
              { n: "03", t: "Click generate", d: "Receive 3–4 finished, brand-correct images in seconds. Download. Edit text inline. Regenerate variants you don't like.", icon: <I.Sparkle size={22}/>, bg: "linear-gradient(135deg, #D7E5C7, #B8D4A0)", iconBg: "#1F7A5A" },
            ].map(s => (
              <div key={s.n} className="card" style={{ padding: 0, overflow: "hidden", background: "white" }}>
                <div style={{ background: s.bg, padding: "32px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ width: 56, height: 56, borderRadius: 14, background: s.iconBg, color: "white", display: "grid", placeItems: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>{s.icon}</div>
                  <div className="mono" style={{ color: "rgba(0,0,0,0.4)", fontSize: 32, fontWeight: 700 }}>{s.n}</div>
                </div>
                <div style={{ padding: 24 }}>
                  <h3 className="t-h4" style={{ margin: "0 0 8px" }}>{s.t}</h3>
                  <p className="t-body-muted" style={{ margin: 0, fontSize: 15 }}>{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SHOWCASE — real work strip */}
      <section style={{ padding: "96px 24px", background: "var(--cal-white)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div className="t-eyebrow" style={{ color: "var(--studio-terracotta, #C97A3F)" }}>Real work, in seconds</div>
            <h2 className="t-h1" style={{ marginTop: 8 }}>The output, not the canvas.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gridTemplateRows: "auto auto", gap: 12 }}>
            <div style={{ gridRow: "span 2", borderRadius: 16, overflow: "hidden", aspectRatio: "1/1.2", position: "relative", background: "#7A0E0E" }}>
              <img src={STOCK[0]} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.92 }}/>
              <div style={{ position: "absolute", left: 24, top: 24, display: "flex", gap: 8 }}>
                <span className="pill" style={{ background: "rgba(255,255,255,0.95)", height: 24 }}>Northwind</span>
                <span className="pill" style={{ background: "rgba(255,255,255,0.95)", height: 24 }}>Christmas</span>
              </div>
              <div style={{ position: "absolute", left: 24, bottom: 24, color: "white" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 32, lineHeight: 1.05 }}>Holiday<br/>Sale · 30% off</div>
              </div>
            </div>
            {[STOCK[3], STOCK[7], STOCK[2], STOCK[4]].map((s, i) => (
              <div key={i} style={{ borderRadius: 12, overflow: "hidden", aspectRatio: "1/1", position: "relative" }}>
                <img src={s} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                <div style={{ position: "absolute", left: 10, top: 10 }}>
                  <span className="pill" style={{ background: "rgba(255,255,255,0.95)", height: 20, fontSize: 10 }}>{["Lumen","Atlas","Northwind","Atlas"][i]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DIFFERENTIATORS — colored bands */}
      <section style={{ padding: "96px 24px", background: "var(--cal-gray-50)", borderTop: "1px solid var(--cal-gray-200)", borderBottom: "1px solid var(--cal-gray-200)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <h2 className="t-h1" style={{ maxWidth: 720, marginBottom: 48 }}>Not a canvas. Not a chatbot. A brand-correct image generator.</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {[
              { vs: "vs. Canva", h: "You don't design. We deliver.", b: "No layers, no font picker, no manual layout. The image arrives finished — branded, sized, captioned.", color: "#C97A3F" },
              { vs: "vs. Midjourney", h: "Brand-correct by construction.", b: "Your real logo, your real fonts, your real colors. Not an approximation. Not a hallucinated lookalike.", color: "#5E5CE6" },
              { vs: "vs. AdCreative.ai", h: "Curated Mood library.", b: "Blend seasonal and aesthetic style packs with your brand under your control. Christmas without abandoning your palette.", color: "#1F7A5A" },
            ].map(d => (
              <div key={d.vs} className="card" style={{ padding: 0, overflow: "hidden", background: "white" }}>
                <div style={{ height: 4, background: d.color }}/>
                <div style={{ padding: 28 }}>
                  <div className="t-eyebrow" style={{ color: d.color, marginBottom: 12 }}>{d.vs}</div>
                  <h3 className="t-h3" style={{ margin: "0 0 12px" }}>{d.h}</h3>
                  <p className="t-body-muted" style={{ margin: 0 }}>{d.b}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING — keep dark for contrast */}
      <section style={{ background: "var(--cal-charcoal)", color: "white", padding: "96px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div className="t-eyebrow" style={{ color: "#FBE5C2" }}>Pricing</div>
            <h2 className="t-h1" style={{ color: "white", marginTop: 8 }}>Pay for what you generate.</h2>
            <p className="t-lede" style={{ color: "rgba(255,255,255,0.6)", marginTop: 8 }}>Free for individuals. Top up anytime.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
            {PLANS.map(p => (
              <div key={p.id} style={{
                background: p.popular ? "var(--studio-violet)" : "rgba(255,255,255,0.06)",
                border: p.popular ? "0" : "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12, padding: 20,
                position: "relative",
              }}>
                {p.popular && <div style={{ position: "absolute", top: -10, left: 16, background: "white", color: "var(--studio-violet-700)", fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 100 }}>Most popular</div>}
                <div style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>{p.name}</div>
                <div style={{ marginTop: 12, display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 36 }}>${p.price}</span>
                  <span style={{ fontSize: 13, opacity: 0.7 }}>/mo</span>
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: "16px 0 0", fontSize: 13, lineHeight: 1.7, opacity: 0.85 }}>
                  {p.features.map(f => <li key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}><I.Check size={12} style={{ marginTop: 5, flexShrink: 0 }}/>{f}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 32, fontSize: 13, opacity: 0.6 }}>
            What's a credit? <a className="t-link" style={{ color: "rgba(255,255,255,0.8)" }}>Read the docs →</a>
            <span style={{ margin: "0 12px" }}>·</span>
            Top up anytime · Credits never expire
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section style={{ padding: "72px 24px", background: "linear-gradient(135deg, #FFE5C7 0%, #E8E7FA 50%, #D7E5C7 100%)", position: "relative", overflow: "hidden" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", textAlign: "center" }}>
          <h2 className="t-h1" style={{ margin: 0, maxWidth: 720, marginInline: "auto" }}>Try it on your brand. It takes about 30 seconds.</h2>
          <p style={{ color: "var(--fg-2)", fontSize: 18, marginTop: 12, marginBottom: 24 }}>Free forever for one brand. No card, no commitment.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn btn--accent btn--lg" onClick={() => navigate("/signup")}>Start free<I.ArrowRight size={16}/></button>
            <button className="btn btn--secondary btn--lg" style={{ background: "white" }} onClick={() => navigate("/signin")}>Sign in</button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid var(--cal-gray-200)", padding: "48px 24px", background: "var(--cal-white)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 32 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-display)", fontSize: 20, marginBottom: 12 }}>
              <StudioMark/> Studio
            </div>
            <p className="t-small" style={{ maxWidth: 280 }}>Brand-correct image generation for SMBs, marketers, and creators. © 2026.</p>
          </div>
          {[
            { h: "Product", l: ["Generate", "Moods", "Brands", "Pricing"] },
            { h: "Company", l: ["About", "Careers", "Contact", "Press"] },
            { h: "Legal", l: ["Terms", "Privacy", "AUP", "DPA"] },
            { h: "Social", l: ["Twitter", "GitHub", "LinkedIn"] },
          ].map(c => (
            <div key={c.h}>
              <div className="t-eyebrow" style={{ marginBottom: 12 }}>{c.h}</div>
              {c.l.map(x => <div key={x} className="t-small" style={{ padding: "4px 0", cursor: "pointer" }}>{x}</div>)}
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}

// ============== AUTH ==============
function AuthPage({ mode, navigate }) {
  const [email, setEmail] = useS1("");
  const isSignup = mode === "signup";
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, var(--cal-gray-50), var(--cal-white))", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ position: "absolute", top: 24, left: 24, display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-display)", fontSize: 18, cursor: "pointer" }} onClick={() => navigate("/landing")}>
        <StudioMark/> Studio
      </div>
      <div className="card card--elevated" style={{ width: "min(420px, 100%)", padding: 32 }}>
        <h1 className="t-h2" style={{ margin: 0, textAlign: "center" }}>{isSignup ? "Create your Studio account" : "Welcome back"}</h1>
        <p className="t-small" style={{ textAlign: "center", marginTop: 8, marginBottom: 28 }}>
          {isSignup ? "Free forever for one brand. No card required." : "Sign in to continue."}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { name: "Continue with Google", logo: <span style={{display:"grid",placeItems:"center",width:18,height:18,fontFamily:"var(--font-display)",color:"#4285F4"}}>G</span> },
            { name: "Continue with Microsoft", logo: <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, width: 14, height: 14 }}>{["#F25022","#7FBA00","#00A4EF","#FFB900"].map(c=> <span key={c} style={{background:c}}/>)}</div> },
            { name: "Continue with Apple", logo: <span style={{fontSize:18,marginTop:-2}}></span> },
          ].map(p => (
            <button key={p.name} className="btn btn--secondary btn--full btn--lg" style={{ justifyContent: "flex-start", paddingLeft: 16 }}>
              <span style={{ width: 20, display:"grid", placeItems:"center" }}>{p.logo}</span>
              <span style={{ marginLeft: 4 }}>{p.name}</span>
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
          <div style={{ flex: 1, height: 1, background: "var(--cal-gray-200)" }}/>
          <span className="t-small">or</span>
          <div style={{ flex: 1, height: 1, background: "var(--cal-gray-200)" }}/>
        </div>

        <label className="label">Email</label>
        <input className="input input--lg" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)}/>
        <button className="btn btn--accent btn--full btn--lg" style={{ marginTop: 12 }} onClick={() => navigate(isSignup ? "/onboarding" : "/generate")}>
          {isSignup ? "Continue with email" : "Continue"}
        </button>

        <p className="t-small" style={{ textAlign: "center", marginTop: 24, fontSize: 12 }}>
          By continuing, you agree to our <a className="t-link">Terms</a> and <a className="t-link">Privacy Policy</a>.
        </p>
      </div>
      <div className="t-small" style={{ marginTop: 16 }}>
        {isSignup ? "Already have an account? " : "New to Studio? "}
        <a className="t-link" style={{ cursor: "pointer" }} onClick={() => navigate(isSignup ? "/signin" : "/signup")}>
          {isSignup ? "Sign in" : "Create one"}
        </a>
      </div>
    </div>
  );
}

window.Landing = Landing;
window.AuthPage = AuthPage;
