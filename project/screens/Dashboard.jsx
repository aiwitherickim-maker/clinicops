/* Dashboard — morning operational overview. */

function Dashboard({ onNavigate, onSelectWorklist }) {
  const [activeChip, setActiveChip] = React.useState(null);
  const [inputVal, setInputVal] = React.useState("");

  const chipClick = (chip) => {
    setActiveChip(chip);
    setInputVal(chip);
  };

  return (
    <div className="screen-enter" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="page-header">
        <div>
          <h1>Good morning, Ann Arbor Retina Clinic</h1>
          <p className="lede">Here's what needs attention before the day starts. ArborCare has already drafted responses and routed work — review what's flagged.</p>
        </div>
        <div className="actions">
          <Button variant="secondary" size="sm"><IconActivity size={14} /> Live status</Button>
          <Button variant="primary" size="sm"><IconPlus size={14} /> New task</Button>
        </div>
      </div>

      {/* Conversational command */}
      <div className="command-bar">
        <div className="cb-row">
          <div className="glyph"><IconSparkles size={16} /></div>
          <input
            placeholder="Ask ClinicOps what to handle next…"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
          />
          <Button variant="primary" size="sm" onClick={() => onNavigate("command")}>
            Ask <IconArrowRight size={13} />
          </Button>
        </div>
        <div className="cb-chips">
          {COMMAND_CHIPS.map((c) => (
            <button key={c} className={`chip${activeChip === c ? " is-active" : ""}`} onClick={() => chipClick(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Metric strip */}
      <div className="metric-strip">
        {DASH_METRICS.map((m, i) => (
          <div key={i} className={`metric-card${m.attention ? " attention" : ""}`}>
            <div className="label-row">
              <span className="ey">{m.label}</span>
              {i === 1 && <Badge tone="red" dot>Action</Badge>}
              {i === 0 && <span style={{ color: "var(--sage-deep)", fontSize: 11, fontWeight: 600 }}>last 14h</span>}
            </div>
            <div className="value">{m.value}</div>
            <div className="note">{m.note}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-cols">
        {/* Worklist */}
        <div className="card">
          <div className="card-head">
            <div>
              <h2>What needs attention first</h2>
              <div className="sub">Prioritized for you · ArborCare ranks by clinical risk, deadline, and patient context.</div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("inbox")}>View all messages <IconChevronRight size={13} /></Button>
          </div>
          <div className="card-body tight">
            {WORKLIST.map((item) => (
              <WorklistRow key={item.id} item={item} onAction={() => {
                if (item.risk === "high")    onNavigate("inbox");
                else if (item.risk === "medium") onNavigate("inbox");
                else if (item.risk === "low") onNavigate("tasks");
                else onNavigate("command");
              }} />
            ))}
          </div>
        </div>

        {/* Side rail */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <PrincipleBanner />

          <div className="card">
            <div className="card-head">
              <div>
                <h2>Today at a glance</h2>
                <div className="sub">Tuesday · May 13</div>
              </div>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <GlanceRow iconKey="calendar" tone="sage" title="14 appointments scheduled" sub="2 new patients · 1 procedure" />
              <GlanceRow iconKey="pill"     tone="amber" title="6 injections planned" sub="All consents on file" />
              <GlanceRow iconKey="dollar"   tone="cream" title="$1,240 in unreconciled charges" sub="3 of 5 categorized" />
              <GlanceRow iconKey="user"     tone="sage" title="3 staff online" sub="Dr. Lee · Maria · Sam" />
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <h2>ArborCare today</h2>
                <div className="sub">Live agent activity</div>
              </div>
              <Badge tone="green" dot>Active</Badge>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="muted" style={{ fontSize: 12.5 }}>Drafts created</span>
                <span style={{ fontWeight: 700 }}>9</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="muted" style={{ fontSize: 12.5 }}>Auto-routed</span>
                <span style={{ fontWeight: 700 }}>7</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="muted" style={{ fontSize: 12.5 }}>Awaiting approval</span>
                <span style={{ fontWeight: 700, color: "#8A6519" }}>5</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="muted" style={{ fontSize: 12.5 }}>Sent autonomously</span>
                <span style={{ fontWeight: 700, color: "#2E7D5E" }}>2 (low-risk only)</span>
              </div>
              <hr className="divider" />
              <Button variant="secondary" size="sm" onClick={() => onNavigate("chat")} style={{ alignSelf: "flex-start" }}>
                <IconBot size={14} /> Open chat simulator
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorklistRow({ item, onAction }) {
  const Ico = ICON_BY_KEY[item.iconKey] || IconAlert;
  return (
    <div className="worklist-row" onClick={onAction}>
      <div className={`priority-stripe ${item.risk}`} />
      <IconTile tone={item.tone} iconKey={item.iconKey} />
      <div className="body">
        <div className="row1">
          <span className="title">{item.title}</span>
          <RiskPill level={item.risk} />
          <Badge tone="neutral">Route → {item.route}</Badge>
        </div>
        <div className="desc">{item.desc}</div>
        <div className="meta">
          {item.meta.map((m, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="sep" />}
              <span>{m}</span>
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className="right-action">
        <Button variant={item.risk === "high" ? "sage" : "secondary"} size="sm" onClick={(e) => { e.stopPropagation(); onAction(); }}>
          {item.action} <IconArrowRight size={13} />
        </Button>
      </div>
    </div>
  );
}

function GlanceRow({ iconKey, tone, title, sub }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <IconTile tone={tone} iconKey={iconKey} size="sm" />
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--fg1)" }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--fg3)", marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

Object.assign(window, { Dashboard });
