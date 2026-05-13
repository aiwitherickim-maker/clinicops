/* Clinic Setup — white-label config + safety rules. */

function ClinicSetup() {
  const [safety, setSafety] = React.useState(SAFETY_SETTINGS);
  const [profile, setProfile] = React.useState({
    name: CLINIC.name,
    specialty: CLINIC.specialty,
    assistant: CLINIC.assistant,
    tone: "Warm, concise, professional",
  });

  return (
    <div className="screen-enter" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="page-header">
        <div>
          <h1>Clinic Setup</h1>
          <p className="lede">Configure ArborCare for your clinic — identity, roles, review rules, knowledge sources, and safety guardrails.</p>
        </div>
        <div className="actions">
          <Button variant="secondary" size="sm">Cancel</Button>
          <Button variant="primary" size="sm"><IconCheckCircle size={14} /> Save changes</Button>
        </div>
      </div>

      <PrincipleBanner />

      <div className="setup-grid">
        {/* Clinic Profile */}
        <div className="card">
          <div className="card-head">
            <div>
              <h2><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><IconBuilding size={16} style={{ color: "var(--sage-deep)" }} /> Clinic profile</span></h2>
              <div className="sub">Public identity shown to patients in the assistant header.</div>
            </div>
          </div>
          <div className="card-body tight">
            <div className="form-row">
              <span className="lbl">Clinic name</span>
              <input className="field" value={profile.name} onChange={(e)=>setProfile({...profile, name: e.target.value})} />
            </div>
            <div className="form-row">
              <span className="lbl">Specialty</span>
              <input className="field" value={profile.specialty} onChange={(e)=>setProfile({...profile, specialty: e.target.value})} />
            </div>
            <div className="form-row">
              <span className="lbl">Assistant name</span>
              <input className="field" value={profile.assistant} onChange={(e)=>setProfile({...profile, assistant: e.target.value})} />
            </div>
            <div className="form-row">
              <span className="lbl">Tone</span>
              <select className="field" value={profile.tone} onChange={(e)=>setProfile({...profile, tone: e.target.value})}>
                <option>Warm, concise, professional</option>
                <option>Formal, professional</option>
                <option>Friendly, conversational</option>
                <option>Clinical, neutral</option>
              </select>
            </div>
          </div>
        </div>

        {/* Staff Roles */}
        <div className="card">
          <div className="card-head">
            <div>
              <h2><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><IconUsers size={16} style={{ color: "var(--sage-deep)" }} /> Staff roles</span></h2>
              <div className="sub">Who receives routed work from ArborCare.</div>
            </div>
            <Button variant="ghost" size="sm"><IconPlus size={13} /> Invite</Button>
          </div>
          <div className="card-body tight setup-list">
            {STAFF.map((s) => (
              <div className="setup-row" key={s.id}>
                <div className="role-av">{s.initials}</div>
                <div style={{ flex: 1 }}>
                  <div className="name">{s.name}</div>
                  <div className="role">{s.role}</div>
                </div>
                <Badge tone={s.tone}>{s.role}</Badge>
                <Button variant="ghost" size="sm"><IconMoreH size={14} /></Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Review rules */}
      <div className="card">
        <div className="card-head">
          <div>
            <h2><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><IconRoute size={16} style={{ color: "var(--sage-deep)" }} /> Human review rules</span></h2>
            <div className="sub">When a message matches a trigger, ArborCare routes it for human action — never auto-sends.</div>
          </div>
          <Button variant="ghost" size="sm"><IconPlus size={13} /> Add rule</Button>
        </div>
        <div className="card-body" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {REVIEW_RULES.map((r, i) => (
            <div className="rule-card" key={i}>
              <div className="head">
                <Badge tone={r.tone} dot>{r.trigger}</Badge>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                <IconArrowRight size={13} style={{ color: "var(--fg3)" }} />
                <span className="resolution">{r.resolution}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Knowledge sources */}
      <div className="card">
        <div className="card-head">
          <div>
            <h2><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><IconBook size={16} style={{ color: "var(--sage-deep)" }} /> Approved knowledge sources</span></h2>
            <div className="sub">ArborCare only cites these. Add or remove to control what it can say.</div>
          </div>
          <Button variant="ghost" size="sm"><IconPlus size={13} /> Add source</Button>
        </div>
        <div className="card-body" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {KNOWLEDGE_SOURCES.map((k, i) => (
            <div className="source-card" key={i}>
              <IconTile tone={k.tone} iconKey={k.iconKey} size="sm" />
              <div style={{ flex: 1 }}>
                <div className="title">{k.title}</div>
                <div className="sub">{k.sub}</div>
              </div>
              <Button variant="ghost" size="sm"><IconChevronRight size={13} /></Button>
            </div>
          ))}
        </div>
      </div>

      {/* Safety settings */}
      <div className="card">
        <div className="card-head">
          <div>
            <h2><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><IconShieldCheck size={16} style={{ color: "var(--sage-deep)" }} /> Safety settings</span></h2>
            <div className="sub">Guardrails enforced at runtime. Locked items can't be disabled.</div>
          </div>
        </div>
        <div className="card-body tight">
          {safety.map((s) => (
            <div className="toggle-row" key={s.id}>
              <IconTile tone={s.locked ? "red" : "sage"} iconKey={s.locked ? "lock" : "checkCircle"} size="sm" />
              <div className="copy">
                <div className="t">{s.text}</div>
                <div className="s">{s.sub}</div>
              </div>
              <Toggle on={s.on} locked={s.locked} onChange={(v) => setSafety((list) => list.map((x) => x.id === s.id ? { ...x, on: v } : x))} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 12, color: "var(--fg3)", display: "flex", alignItems: "center", gap: 8, padding: "4px 4px 16px" }}>
        <IconShieldCheck size={13} />
        ClinicOps stores audit trails for every drafted, approved, and sent message for 7 years (HIPAA · 45 CFR 164.530(j)).
      </div>
    </div>
  );
}

Object.assign(window, { ClinicSetup });
