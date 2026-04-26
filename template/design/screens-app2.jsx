// Billing (10), Admin Mood Studio (11), Admin Generation Inspector (12)

const { useState: aUS } = React;

// =============== BILLING ===============
function BillingPage({ navigate }) {
  const { credits } = useStore();
  const { push } = useToast();
  const [compareOpen, setCompareOpen] = aUS(false);
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Billing & plan</h1>
          <p className="page__sub">Manage your subscription, credits, and payment method.</p>
        </div>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 16, display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "center" }}>
        <div>
          <div className="t-eyebrow">Current plan</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 6 }}>
            <h2 className="t-h2" style={{ margin: 0 }}>Pro</h2>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--fg-3)" }}>$49<span style={{fontSize: 13, marginLeft: 2, color: "var(--fg-3)"}}>/mo</span></span>
          </div>
          <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
            <Stat label="Brands included" value="10"/>
            <Stat label="Seats included" value="3"/>
            <Stat label="Monthly credits" value="1,000"/>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn--secondary" onClick={()=>setCompareOpen(o=>!o)}>Compare plans</button>
          <button className="btn btn--primary">Change plan</button>
        </div>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div className="t-eyebrow">Credits</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 48, marginTop: 4 }}>{credits.toLocaleString()} <span style={{fontSize: 16, color: "var(--fg-3)", fontFamily: "var(--font-body)", fontWeight: 400}}>credits remaining</span></div>
            <div className="t-small" style={{ marginTop: 4 }}>Resets to 1,000 on the 15th of each month.</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn--ghost">View ledger</button>
            <button className="btn btn--accent"><I.Plus size={14}/>Buy top-up credits</button>
          </div>
        </div>
        <div style={{ marginTop: 24, height: 80, background: "var(--cal-gray-50)", borderRadius: 10, padding: 16, position: "relative", overflow: "hidden" }}>
          <svg width="100%" height="100%" viewBox="0 0 600 60" preserveAspectRatio="none">
            <polyline points="0,40 60,38 120,30 180,32 240,22 300,18 360,28 420,12 480,16 540,8 600,14"
              fill="none" stroke="var(--studio-violet)" strokeWidth="2"/>
            <polygon points="0,40 60,38 120,30 180,32 240,22 300,18 360,28 420,12 480,16 540,8 600,14 600,60 0,60"
              fill="var(--studio-violet)" opacity="0.08"/>
          </svg>
          <div style={{ position: "absolute", left: 16, top: 12, fontSize: 11, color: "var(--fg-3)" }}>Last 30 days · 153 credits used</div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div className="t-eyebrow" style={{ marginBottom: 12 }}>Top-up packs</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {TOPUPS.map(t => (
            <div key={t.credits} className="card" style={{ padding: 20, position: "relative" }}>
              {t.best && <div className="pill pill--accent" style={{ position: "absolute", top: -10, left: 16 }}>Best value</div>}
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28 }}>{t.credits.toLocaleString()} credits</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22 }}>${t.price}</div>
                <button className="btn btn--secondary btn--sm" onClick={()=>push("Redirecting to Stripe…")}>Buy</button>
              </div>
            </div>
          ))}
        </div>
        <div className="t-small" style={{ marginTop: 12 }}><I.Info size={11} style={{verticalAlign:"-1px"}}/> Top-up credits never expire.</div>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div className="t-eyebrow" style={{ marginBottom: 12 }}>Billing details</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 24, alignItems: "center" }}>
          <div>
            <div className="t-small">Payment method</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <I.CreditCard size={16}/>
              <span style={{ fontWeight: 500 }}>•••• 4242</span>
              <span className="t-small">exp 09/29</span>
            </div>
          </div>
          <div>
            <div className="t-small">Billing email</div>
            <div style={{ marginTop: 4 }}>shehan@studio.app</div>
          </div>
          <div>
            <div className="t-small">Tax ID</div>
            <div style={{ marginTop: 4 }}>SE556XXXXXXX01</div>
          </div>
          <button className="btn btn--secondary"><I.ExternalLink size={14}/>Manage in Stripe</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--cal-gray-200)" }} className="t-eyebrow">Invoices</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--cal-gray-50)" }}>
              {["Invoice","Date","Amount","Status",""].map((h,i)=> <th key={i} style={{ textAlign:"left", padding:"10px 24px", fontSize:11, fontWeight:600, color:"var(--fg-3)", textTransform:"uppercase", letterSpacing: 0.4 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {INVOICES.map((iv,i) => (
              <tr key={i} style={{ borderTop: "1px solid var(--cal-gray-200)" }}>
                <td style={{ padding: "12px 24px", fontFamily: "var(--font-mono)", fontSize: 13 }}>{iv.number}</td>
                <td style={{ padding: "12px 24px", fontSize: 14 }}>{iv.date}</td>
                <td style={{ padding: "12px 24px", fontSize: 14 }}>{iv.amount}</td>
                <td style={{ padding: "12px 24px" }}><span className="pill pill--green"><I.Check size={11}/>Paid</span></td>
                <td style={{ padding: "12px 24px", textAlign: "right" }}><button className="btn btn--ghost btn--sm"><I.Download size={12}/>PDF</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div onClick={()=>setCompareOpen(o=>!o)} style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
          <div className="t-eyebrow" style={{ margin: 0 }}>Plan comparison</div>
          <I.ChevronDown size={14} style={{ transform: compareOpen ? "rotate(180deg)" : "" }}/>
        </div>
        {compareOpen && (
          <div style={{ padding: "0 24px 24px", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr><th></th>{PLANS.map(p => <th key={p.id} style={{ textAlign:"left", padding: "12px 16px", fontFamily: "var(--font-display)", fontSize: 16 }}>{p.name}</th>)}</tr>
              </thead>
              <tbody>
                <tr><td style={{padding:"8px 0", color:"var(--fg-3)"}}>Price</td>{PLANS.map(p=> <td key={p.id} style={{padding:"8px 16px"}}>${p.price}/mo</td>)}</tr>
                <tr><td style={{padding:"8px 0", color:"var(--fg-3)"}}>Brands</td>{PLANS.map(p=> <td key={p.id} style={{padding:"8px 16px"}}>{p.brands}</td>)}</tr>
                <tr><td style={{padding:"8px 0", color:"var(--fg-3)"}}>Seats</td>{PLANS.map(p=> <td key={p.id} style={{padding:"8px 16px"}}>{p.seats}</td>)}</tr>
                <tr><td style={{padding:"8px 0", color:"var(--fg-3)"}}>Credits/mo</td>{PLANS.map(p=> <td key={p.id} style={{padding:"8px 16px"}}>{p.credits.toLocaleString()}</td>)}</tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
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

// =============== ADMIN MOOD STUDIO ===============
function AdminMoodsPage({ navigate }) {
  const [selected, setSelected] = aUS("christmas");
  const mood = MOODS.find(m => m.id === selected) || MOODS[1];
  const { push } = useToast();
  const [previewing, setPreviewing] = aUS(false);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", height: "calc(100vh - 56px)" }}>
      <div style={{ borderRight: "1px solid var(--cal-gray-200)", background: "var(--cal-gray-50)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: 16, borderBottom: "1px solid var(--cal-gray-200)" }}>
          <div className="t-eyebrow" style={{ marginBottom: 8 }}><I.Shield size={11} style={{verticalAlign:"-1px"}}/> Admin · Mood Studio</div>
          <div style={{ position: "relative" }}>
            <I.Search size={14} style={{ position: "absolute", left: 10, top: 9, color: "var(--fg-3)" }}/>
            <input className="input" placeholder="Search moods…" style={{ paddingLeft: 32, fontSize: 13 }}/>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <select className="select" style={{ fontSize: 12, padding: "6px 8px" }}><option>All kinds</option><option>Seasonal</option><option>Evergreen</option></select>
            <select className="select" style={{ fontSize: 12, padding: "6px 8px" }}><option>All statuses</option><option>Draft</option><option>Published</option></select>
          </div>
          <button className="btn btn--accent btn--full btn--sm" style={{ marginTop: 8 }}><I.Plus size={12}/>New mood</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          {MOODS.filter(m => m.id !== "none").map(m => (
            <div key={m.id} onClick={() => setSelected(m.id)} style={{
              display: "grid", gridTemplateColumns: "32px 1fr auto", gap: 10, padding: 8, alignItems: "center",
              borderRadius: 6, cursor: "pointer",
              background: selected === m.id ? "white" : "transparent",
              boxShadow: selected === m.id ? "var(--shadow-ring)" : "none",
              marginBottom: 2,
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 6, overflow: "hidden", background: "var(--cal-gray-200)" }}>
                {m.img && <img src={m.img} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</div>
                <div style={{ fontSize: 11, color: "var(--fg-3)" }}>{m.kind}</div>
              </div>
              <span style={{ width: 8, height: 8, borderRadius: 100, background: m.group === "soon" ? "var(--cal-gray-400)" : "var(--studio-green)" }}/>
            </div>
          ))}
        </div>
      </div>

      <div style={{ overflowY: "auto", paddingBottom: 80, position: "relative" }}>
        <div style={{ padding: "20px 32px", borderBottom: "1px solid var(--cal-gray-200)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 className="t-h3" style={{ margin: 0 }}>{mood.name}</h2>
            <div className="t-small mono">moods/{mood.id}</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <span className="pill pill--green"><I.CheckCircle size={11}/>Published</span>
          </div>
        </div>

        <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: 24 }}>
          <Section letter="A" title="Identity">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div><label className="label">Name</label><input className="input" defaultValue={mood.name}/></div>
              <div><label className="label">Slug</label><input className="input mono" defaultValue={mood.id}/></div>
              <div>
                <label className="label">Kind</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["Seasonal","Evergreen"].map(k => (
                    <label key={k} style={{ flex:1, display:"flex", alignItems:"center", gap:8, padding:10, borderRadius:8, boxShadow:"var(--shadow-ring)", cursor:"pointer", background: mood.kind===k?"var(--studio-violet-50)":"white" }}>
                      <input type="radio" name="kind" defaultChecked={mood.kind===k}/>
                      <span style={{ fontSize: 13 }}>{k}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div><label className="label">Status</label><select className="select"><option>Published</option><option>Draft</option><option>Archived</option></select></div>
              {mood.kind === "Seasonal" && <>
                <div><label className="label">Valid from</label><input className="input" defaultValue="Nov 15, 2026"/></div>
                <div><label className="label">Valid to</label><input className="input" defaultValue="Dec 30, 2026"/></div>
              </>}
            </div>
          </Section>

          <Section letter="B" title="Prompt layer">
            <label className="label">Prompt modifiers</label>
            <textarea className="textarea mono" rows={3} style={{ fontSize: 12 }} defaultValue="cozy holiday lighting, warm soft glow, pine garlands, subtle bokeh"/>
            <div className="hint">142 / 500 tokens</div>
            <label className="label" style={{ marginTop: 16 }}>Negative prompts</label>
            <textarea className="textarea mono" rows={2} style={{ fontSize: 12 }} defaultValue="stark, fluorescent, harsh shadows, pastel"/>
            <div className="hint">38 / 200 tokens</div>
          </Section>

          <Section letter="C" title="Visual layer">
            <label className="label">Accent palette</label>
            <div style={{ display: "flex", gap: 8 }}>
              {(mood.colors || ["#7A0E0E","#0E5C2F","#E8C66B"]).map(c => (
                <div key={c} style={{ width: 56, height: 56, borderRadius: 8, background: c, boxShadow: "var(--shadow-ring)", cursor: "pointer" }}/>
              ))}
              <div style={{ width: 56, height: 56, borderRadius: 8, border: "2px dashed var(--cal-gray-300)", display: "grid", placeItems: "center", color: "var(--fg-3)" }}><I.Plus size={14}/></div>
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <span className="pill pill--green"><I.Check size={11}/>AA on light</span>
              <span className="pill pill--green"><I.Check size={11}/>AA on dark</span>
            </div>
          </Section>

          <Section letter="D" title="Decoration motifs">
            <label className="label">Tags</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: 8, boxShadow: "var(--shadow-ring)", borderRadius: 8, minHeight: 40 }}>
              {(mood.motifs || []).map(t => <span key={t} className="pill pill--ring" style={{ height: 22 }}>{t}<I.X size={10}/></span>)}
              <input style={{ border: 0, outline: 0, flex: 1, fontSize: 13 }} placeholder="Add a tag…"/>
            </div>
            <div className="t-small" style={{ marginTop: 12, marginBottom: 8 }}>Matching stock assets · 18 found</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 6 }}>
              {STOCK.slice(0, 8).map((s,i) => <div key={i} style={{ aspectRatio: "1/1", borderRadius: 6, overflow: "hidden", boxShadow: "var(--shadow-ring)" }}><img src={s} style={{ width: "100%", height: "100%", objectFit: "cover" }}/></div>)}
            </div>
          </Section>

          <Section letter="E" title="Template binding">
            <button className="btn btn--secondary btn--sm" style={{ marginBottom: 12 }}><I.Plus size={12}/>Add template</button>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              {[
                { name: "tpl_holiday-3", weight: 40, model: "flux-1.1-pro" },
                { name: "tpl_card-warm", weight: 35, model: "flux-1.1-pro" },
                { name: "tpl_lockup-serif", weight: 25, model: "gpt-image-1" },
              ].map((t,i,a) => (
                <div key={t.name} style={{ display: "grid", gridTemplateColumns: "16px 56px 1fr 100px 100px 32px", gap: 12, padding: 12, alignItems: "center", borderBottom: i<a.length-1?"1px solid var(--cal-gray-200)":"0" }}>
                  <I.Drag size={14} style={{ color: "var(--fg-4)" }}/>
                  <div style={{ aspectRatio: "1/1", borderRadius: 4, background: "var(--cal-gray-200)" }}/>
                  <div className="mono" style={{ fontSize: 13 }}>{t.name}</div>
                  <input className="input" defaultValue={t.weight} style={{ padding: "6px 10px", fontSize: 13 }}/>
                  <span className="pill" style={{ fontSize: 11 }}>{t.model}</span>
                  <button className="btn btn--icon btn--ghost"><I.Trash size={12}/></button>
                </div>
              ))}
            </div>
          </Section>

          <Section letter="F" title="Typography hint">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div><label className="label">Heading weight</label><select className="select"><option>Display</option><option>Bold</option><option>Black</option></select></div>
              <div><label className="label">Justification</label><select className="select"><option>Left</option><option>Center</option></select></div>
            </div>
          </Section>

          <Section letter="G" title="Aspect ratio support">
            <div style={{ display: "flex", gap: 8 }}>
              {["1:1","4:5","9:16","16:9"].map(a => (
                <label key={a} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", boxShadow: "var(--shadow-ring)", borderRadius: 8, cursor: "pointer" }}>
                  <input type="checkbox" defaultChecked={a !== "9:16"}/>
                  <span style={{ fontSize: 13 }}>{a}</span>
                </label>
              ))}
            </div>
          </Section>

          <Section letter="H" title="Test render">
            <button className="btn btn--primary" onClick={() => { setPreviewing(true); push("Rendering against synthetic brand…"); setTimeout(()=>setPreviewing(false), 2000); }}>
              <I.Play size={14}/>Render preview against synthetic brand
            </button>
            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {[STOCK[0], STOCK[3], STOCK[5], STOCK[2]].map((s,i)=> (
                <div key={i} style={{ aspectRatio: "1/1", borderRadius: 8, overflow: "hidden", boxShadow: "var(--shadow-ring)", position: "relative", background: "var(--cal-gray-100)" }}>
                  {previewing ? <div className="painting" style={{position:"absolute", inset:0}}/> : <img src={s} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>}
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div style={{ position: "sticky", bottom: 0, padding: 16, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", borderTop: "1px solid var(--cal-gray-200)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn btn--ghost btn--danger"><I.Trash size={14}/>Archive</button>
          <button className="btn btn--secondary">Save draft</button>
          <button className="btn btn--primary" onClick={()=>push("Mood published")}><I.CheckCircle size={14}/>Publish</button>
        </div>
      </div>
    </div>
  );
}

function Section({ letter, title, children }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span style={{ width: 22, height: 22, borderRadius: 6, background: "var(--cal-gray-100)", display: "grid", placeItems: "center", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-2)" }}>{letter}</span>
        <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 16 }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

// =============== ADMIN GENERATION INSPECTOR ===============
function AdminInspectorPage({ navigate }) {
  const gen = HISTORY[0];
  const brand = BRANDS.find(b => b.id === gen.brand);
  return (
    <div className="page page--wide" style={{ paddingTop: 24 }}>
      <div className="t-eyebrow" style={{ marginBottom: 8 }}><I.Shield size={11} style={{verticalAlign:"-1px"}}/> Admin · Generation inspector</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 540 }}>
          <I.Search size={14} style={{ position: "absolute", left: 12, top: 11, color: "var(--fg-3)" }}/>
          <input className="input mono" placeholder="generation_id or workspace_id + brief snippet" defaultValue={gen.id} style={{ paddingLeft: 36, fontSize: 13 }}/>
        </div>
        <button className="btn btn--primary">Load</button>
      </div>

      <InspectorSection title="Summary">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          <KV k="Generation ID" v={gen.id} mono/>
          <KV k="Workspace" v="ws_8f0z2"  mono/>
          <KV k="User" v="shehan@studio.app"/>
          <KV k="Brand" v={brand.name}/>
          <KV k="Mood" v="Christmas"/>
          <KV k="Aspect ratio" v={gen.ar}/>
          <KV k="Status" v={<span className="pill pill--green"><I.Check size={11}/>Complete</span>}/>
          <KV k="Total credits" v={gen.credits}/>
          <KV k="Requested" v="2026-04-25 14:21:08 UTC"/>
          <KV k="Completed" v="2026-04-25 14:21:42 UTC"/>
          <KV k="Duration" v="34.2s"/>
          <KV k="Upstream cost" v="$0.082"/>
        </div>
      </InspectorSection>

      <InspectorSection title="The brief">
        <div style={{ background: "var(--cal-gray-50)", padding: 14, borderRadius: 8, fontFamily: "var(--font-body)", fontSize: 14, boxShadow: "var(--shadow-inset)" }}>{gen.brief}</div>
      </InspectorSection>

      <InspectorSection title="Composed prompts">
        {[1,2,3,4].map(i => (
          <details key={i} style={{ marginBottom: 8 }}>
            <summary style={{ cursor: "pointer", padding: 10, background: "var(--cal-gray-50)", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 12 }}>variant_{i} · tpl_holiday-3 · flux-1.1-pro</summary>
            <pre style={{ margin: "8px 0 0", padding: 14, background: "var(--cal-charcoal)", color: "#E8DCC4", borderRadius: 8, fontSize: 12, lineHeight: 1.6, overflow: "auto" }}>{`{
  "model": "flux-1.1-pro",
  "prompt": "Christmas sale, cozy living room with a glowing tree, 30% off, [BRAND:northwind], cozy holiday lighting, warm soft glow, pine garlands",
  "negative": "stark, fluorescent, harsh shadows, pastel",
  "brand_grounding": { "logo": true, "colors": ["#2A1F18","#7C5232","#E8DCC4"], "fonts": ["Fraunces","Inter"] },
  "text_safe_zone": { "headline": "30% off", "sub": "this week only" },
  "aspect": "1:1"
}`}</pre>
          </details>
        ))}
      </InspectorSection>

      <InspectorSection title="Variants">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {gen.images.map((s,i) => (
            <div key={i} className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ aspectRatio: "1/1", background: "var(--cal-gray-100)" }}>{s && <img src={s} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>}</div>
              <details style={{ borderTop: "1px solid var(--cal-gray-200)" }}>
                <summary style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13 }}>Variant {i+1} · details</summary>
                <div style={{ padding: 14, fontSize: 12, color: "var(--fg-3)" }}>
                  <KV k="Model" v="flux-1.1-pro" mono small/>
                  <KV k="Fallback" v="No" small/>
                  <KV k="Cost" v="2.1¢" small/>
                  <KV k="Duration" v="8.4s" small/>
                  <KV k="S3 key" v={`s3://studio-output/2026/04/25/${gen.id}_v${i+1}.png`} mono small/>
                </div>
              </details>
            </div>
          ))}
        </div>
      </InspectorSection>

      <InspectorSection title="Ledger entries">
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--cal-gray-50)" }}>
              {["Time","Type","Amount","Note","Audit ID"].map(h=> <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, fontWeight: 600, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: 0.4 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {[
              { t: "14:21:08", k: "reservation", a: "−20", n: "Reserved at submit" },
              { t: "14:21:18", k: "commit", a: "−5", n: "Variant 1 complete" },
              { t: "14:21:25", k: "commit", a: "−5", n: "Variant 2 complete" },
              { t: "14:21:33", k: "commit", a: "−5", n: "Variant 3 complete" },
              { t: "14:21:42", k: "commit", a: "−5", n: "Variant 4 complete" },
              { t: "14:21:42", k: "release", a: "+0", n: "All committed; reservation closed" },
            ].map((e,i) => (
              <tr key={i} style={{ borderTop: "1px solid var(--cal-gray-200)" }}>
                <td style={{ padding: "8px 14px", fontFamily: "var(--font-mono)", fontSize: 12 }}>{e.t}</td>
                <td style={{ padding: "8px 14px" }}><span className="pill" style={{ fontSize: 11 }}>{e.k}</span></td>
                <td style={{ padding: "8px 14px", fontFamily: "var(--font-mono)" }}>{e.a}</td>
                <td style={{ padding: "8px 14px" }}>{e.n}</td>
                <td style={{ padding: "8px 14px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}>aud_{i.toString(16).padStart(6,'0')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </InspectorSection>

      <InspectorSection title="Operator actions">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn--secondary"><I.Refresh size={14}/>Resume failed variants</button>
          <button className="btn btn--secondary"><I.Sliders size={14}/>Override model and re-run</button>
          <button className="btn btn--secondary btn--danger"><I.Receipt size={14}/>Refund this generation</button>
          <button className="btn btn--secondary btn--danger"><I.AlertTriangle size={14}/>Flag for AUP review</button>
        </div>
      </InspectorSection>
    </div>
  );
}

function InspectorSection({ title, children }) {
  return (
    <div className="card" style={{ padding: 20, marginBottom: 16 }}>
      <h3 style={{ margin: "0 0 16px", fontFamily: "var(--font-display)", fontSize: 16 }}>{title}</h3>
      {children}
    </div>
  );
}

function KV({ k, v, mono, small }) {
  return (
    <div style={{ marginBottom: small ? 6 : 0 }}>
      <div style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 600 }}>{k}</div>
      <div style={{ marginTop: 2, fontSize: small?12:14, fontFamily: mono?"var(--font-mono)":"var(--font-body)", wordBreak: "break-all" }}>{v}</div>
    </div>
  );
}

window.BillingPage = BillingPage;
window.AdminMoodsPage = AdminMoodsPage;
window.AdminInspectorPage = AdminInspectorPage;
