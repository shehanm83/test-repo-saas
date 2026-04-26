// Onboarding wizard — 6 steps

const { useState: oUS } = React;

function StepDot({ n, current, label }) {
  const state = n < current ? "done" : n === current ? "current" : "todo";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 100,
        display: "grid", placeItems: "center",
        background: state === "current" ? "var(--cal-charcoal)" : state === "done" ? "var(--studio-violet)" : "var(--cal-gray-100)",
        color: state === "todo" ? "var(--fg-3)" : "white",
        fontSize: 12, fontWeight: 600,
        boxShadow: state === "todo" ? "var(--shadow-ring)" : "none",
      }}>
        {state === "done" ? <I.Check size={14}/> : n}
      </div>
      <div style={{ fontSize: 11, marginTop: 6, color: state === "current" ? "var(--fg-1)" : "var(--fg-3)", fontWeight: state === "current" ? 600 : 400 }}>{label}</div>
    </div>
  );
}

function StepConnector({ filled }) {
  return <div style={{ flex: 1, height: 1, background: filled ? "var(--studio-violet)" : "var(--cal-gray-200)", marginTop: -22, alignSelf: "flex-start" }}/>;
}

function Onboarding({ navigate }) {
  const [step, setStep] = oUS(1);
  const [data, setData] = oUS({
    name: "", url: "", logo: null,
    palette: ["#2A1F18", "#7C5232", "#E8DCC4", "#C9A86A", "#F5EFE3"],
    paletteLabels: ["Primary","Secondary","Accent","Extra 1","Extra 2"],
    heading: "Cal Sans", body: "Inter",
    voice: "", refs: [],
  });
  const update = (k, v) => setData(d => ({ ...d, [k]: v }));
  const stepLabels = ["Brand", "Logo", "Colors", "Fonts", "Voice", "References"];

  return (
    <div style={{ minHeight: "100vh", background: "var(--cal-gray-50)", padding: "32px 24px 64px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-display)", fontSize: 18, marginBottom: 32, cursor: "pointer" }} onClick={() => navigate("/landing")}>
          <StudioMark/> Studio
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "stretch", marginBottom: 32 }}>
          {stepLabels.map((l, i) => (
            <React.Fragment key={l}>
              <StepDot n={i+1} current={step} label={l}/>
              {i < stepLabels.length - 1 && <StepConnector filled={step > i+1}/>}
            </React.Fragment>
          ))}
        </div>

        <div className="card card--elevated" style={{ padding: 40 }}>
          {step === 1 && (
            <div>
              <h2 className="t-h2" style={{ margin: 0 }}>Tell us about your brand</h2>
              <p className="t-small" style={{ marginTop: 6, marginBottom: 28 }}>This is the brand we'll use for every generation. You can add more later.</p>
              <label className="label">Brand name</label>
              <input className="input input--lg" placeholder="e.g. Northwind Coffee" value={data.name} onChange={e => update("name", e.target.value)}/>
              <div style={{ height: 20 }}/>
              <label className="label">Your website URL <span className="muted" style={{fontWeight: 400}}>· optional</span></label>
              <input className="input input--lg" placeholder="northwindcoffee.com" value={data.url} onChange={e => update("url", e.target.value)}/>
              <div className="hint" style={{ display: "flex", alignItems: "center", gap: 6 }}><I.Wand size={12}/>We'll grab your colors and logo automatically.</div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="t-h2" style={{ margin: 0 }}>Upload your logo</h2>
              <p className="t-small" style={{ marginTop: 6, marginBottom: 28 }}>SVG works best — it scales perfectly to any size.</p>
              <div style={{ border: "2px dashed var(--cal-gray-300)", borderRadius: 12, padding: 48, textAlign: "center", background: "var(--cal-white)" }}>
                <div style={{ width: 56, height: 56, margin: "0 auto 16px", borderRadius: 12, background: "var(--cal-gray-100)", display: "grid", placeItems: "center", color: "var(--fg-3)" }}>
                  <I.Upload size={22}/>
                </div>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>Drop your logo here</div>
                <div className="t-small">SVG or PNG · max 10MB</div>
                <button className="btn btn--secondary" style={{ marginTop: 16 }} onClick={() => update("logo", "demo")}>Browse files</button>
              </div>
              {data.logo && (
                <div style={{ marginTop: 16 }}>
                  <div className="t-eyebrow" style={{ marginBottom: 8 }}>Preview</div>
                  <div className="checker" style={{ height: 120, borderRadius: 8, display: "grid", placeItems: "center", boxShadow: "var(--shadow-ring)" }}>
                    <div style={{ width: 60, height: 60, borderRadius: 12, background: "#2A1F18", color: "#E8DCC4", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontSize: 24 }}>NW</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="t-h2" style={{ margin: 0 }}>Your brand colors</h2>
              <p className="t-small" style={{ marginTop: 6, marginBottom: 28 }}>3–5 colors. We'll use these as the foundation for every image.</p>
              <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                {data.palette.map((c, i) => (
                  <div key={i} style={{ flex: 1 }}>
                    <div style={{ height: 96, borderRadius: 10, background: c, boxShadow: "var(--shadow-ring)", cursor: "pointer", position: "relative" }}>
                      <div style={{ position: "absolute", bottom: 8, left: 8, right: 8, fontFamily: "var(--font-mono)", fontSize: 10, color: i < 2 ? "white" : "rgba(0,0,0,0.7)", textTransform: "uppercase" }}>{c}</div>
                    </div>
                    <div className="t-small" style={{ marginTop: 6, textAlign: "center" }}>{data.paletteLabels[i]}</div>
                  </div>
                ))}
              </div>
              <button className="btn btn--secondary btn--sm"><I.Wand size={12}/>Suggest from logo</button>

              <div className="t-eyebrow" style={{ marginTop: 28, marginBottom: 8 }}>Preview on a sample design</div>
              <div className="card" style={{ padding: 24, background: data.palette[0], color: data.palette[2] }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: data.palette[2] }}>Holiday Sale</div>
                <div style={{ fontSize: 13, color: data.palette[3], marginTop: 4 }}>30% off everything · this week only</div>
                <div style={{ marginTop: 16, display: "inline-flex", padding: "8px 14px", borderRadius: 100, background: data.palette[1], color: data.palette[4], fontSize: 12, fontWeight: 600 }}>Shop the sale →</div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="t-h2" style={{ margin: 0 }}>Your typography</h2>
              <p className="t-small" style={{ marginTop: 6, marginBottom: 28 }}>Choose a heading font and a body font. We'll render every image with these.</p>
              {[
                { k: "heading", label: "Heading font", val: data.heading, sample: "The quick brown fox" },
                { k: "body", label: "Body font", val: data.body, sample: "Cozy living room scenes with soft glowing light." },
              ].map(f => (
                <div key={f.k} style={{ marginBottom: 20 }}>
                  <label className="label">{f.label}</label>
                  <div style={{ position: "relative" }}>
                    <button className="btn btn--secondary btn--lg btn--full" style={{ justifyContent: "space-between" }}>
                      <span>{f.val}</span>
                      <I.ChevronDown size={14}/>
                    </button>
                  </div>
                  <div className="card" style={{ padding: 20, marginTop: 12, background: "var(--cal-gray-50)", boxShadow: "var(--shadow-ring)" }}>
                    <div style={{ fontFamily: f.k === "heading" ? "var(--font-display)" : "var(--font-body)", fontSize: f.k === "heading" ? 28 : 16 }}>{f.sample}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 5 && (
            <div>
              <h2 className="t-h2" style={{ margin: 0 }}>Anything else?</h2>
              <p className="t-small" style={{ marginTop: 6, marginBottom: 28 }}>Notes about how your brand sounds. We'll use this when generating captions.</p>
              <textarea className="textarea" rows={6} placeholder='Friendly but professional. Avoid jargon. We say "team" not "users".' value={data.voice} onChange={e => update("voice", e.target.value)} maxLength={500}/>
              <div className="hint" style={{ textAlign: "right" }}>{data.voice.length} / 500</div>
            </div>
          )}

          {step === 6 && (
            <div>
              <h2 className="t-h2" style={{ margin: 0 }}>Show us what your brand looks like</h2>
              <p className="t-small" style={{ marginTop: 6, marginBottom: 28 }}>Optional. Up to 10 example images — past campaigns, product shots, anything visual we should learn from.</p>
              <div style={{ border: "2px dashed var(--cal-gray-300)", borderRadius: 12, padding: 32, textAlign: "center", background: "var(--cal-white)" }}>
                <I.Image size={28} style={{ color: "var(--fg-3)", margin: "0 auto" }}/>
                <div style={{ fontWeight: 500, marginTop: 12 }}>Drop reference images</div>
                <div className="t-small">JPG or PNG · up to 10</div>
                <button className="btn btn--secondary" style={{ marginTop: 16 }} onClick={() => update("refs", [STOCK[0], STOCK[1], STOCK[2]])}>Browse files</button>
              </div>
              {data.refs.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginTop: 16 }}>
                  {data.refs.map((s, i) => (
                    <div key={i} style={{ aspectRatio: "1/1", borderRadius: 8, overflow: "hidden", boxShadow: "var(--shadow-ring)" }}>
                      <img src={s} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            {step > 1 && <button className="btn btn--ghost" onClick={() => setStep(s => s - 1)}><I.ArrowLeft size={14}/>Back</button>}
          </div>
          <div className="t-small">Step {step} of 6</div>
          <div style={{ display: "flex", gap: 8 }}>
            {(step === 5 || step === 6) && <button className="btn btn--ghost" onClick={() => step < 6 ? setStep(s => s + 1) : navigate("/generate")}>Skip</button>}
            <button className="btn btn--accent" disabled={step === 1 && !data.name} onClick={() => step < 6 ? setStep(s => s + 1) : navigate("/generate")}>
              {step === 6 ? "Finish" : "Next"}<I.ArrowRight size={14}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

window.Onboarding = Onboarding;
