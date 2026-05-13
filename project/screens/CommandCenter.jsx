/* Back-Office Command Center — chat-style left, generated actions right. */

function CommandCenter() {
  const [chat, setChat] = React.useState(COMMAND_CHAT_SEED);
  const [actions, setActions] = React.useState(COMMAND_ACTIONS);
  const [input, setInput] = React.useState("");
  const [thinking, setThinking] = React.useState(false);
  const [flashIds, setFlashIds] = React.useState([]);
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chat, thinking]);

  const flash = (ids) => {
    setFlashIds(ids);
    setTimeout(() => setFlashIds([]), 1400);
  };

  const respondTo = (text) => {
    const t = "Now";
    setChat((c) => [...c, { who: "staff", text, t }]);
    setThinking(true);
    setTimeout(() => {
      let resp = "Got it. I'll draft and route the relevant work, and add it to the actions list on the right.";
      let newAction = null;
      const lc = text.toLowerCase();
      if (lc.includes("morning") || lc.includes("worklist")) {
        resp = "Here's the morning worklist: 1 urgent clinical review, 1 billing follow-up, 1 reschedule, and 1 finance item needing categorization. All 4 are on the right.";
        flash(["ac-1", "ac-2", "ac-3", "ac-4"]);
      } else if (lc.includes("billing")) {
        resp = "I drafted billing follow-ups for the 1 patient with an open cost question. Maria is assigned, pending your approval.";
        flash(["ac-2", "ac-3"]);
      } else if (lc.includes("clinic")) {
        resp = "1 item is in the clinician review queue — Patient A's post-injection eye pain message. Routed to Dr. Lee, urgent.";
        flash(["ac-1"]);
      } else if (lc.includes("finance")) {
        resp = "1 finance item is open: a $482.90 charge from Medical Supply Co. needs a category. Routed to the office manager.";
        flash(["ac-4"]);
      } else if (lc.includes("draft")) {
        resp = "Drafted. Added to actions, marked needs review.";
        newAction = {
          id: `ac-${Date.now()}`, iconKey: "edit", tone: "sage",
          title: "New patient draft",
          badges: [{label: "Custom", tone: "sage"}, {label: "Needs review", tone: "amber"}],
          rows: [
            { k: "Topic", v: text.slice(0, 60) },
            { k: "Length", v: "1 paragraph" },
            { k: "Author", v: "ArborCare" },
          ],
        };
      }
      setChat((c) => [...c, { who: "bot", text: resp, t }]);
      if (newAction) setActions((a) => [newAction, ...a]);
      setThinking(false);
    }, 900);
  };

  const send = () => {
    if (!input.trim()) return;
    respondTo(input.trim());
    setInput("");
  };

  return (
    <div className="screen-enter" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="page-header">
        <div>
          <h1>Back-Office Command Center</h1>
          <p className="lede">Ask in plain English. ClinicOps will turn requests into tasks, drafts, and worklists — non-technical staff stay in control.</p>
        </div>
        <div className="actions">
          <Button variant="secondary" size="sm"><IconBook size={14} /> Prompt library</Button>
          <Button variant="secondary" size="sm"><IconClock size={14} /> Activity log</Button>
        </div>
      </div>

      <div className="split-2col">
        {/* Chat */}
        <div className="chat-shell">
          <div className="ch-head">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <IconTile tone="forest" iconKey="terminal" />
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>ClinicOps</h2>
                <div className="sub" style={{ marginTop: 2 }}>Plain-English back-office operations · audited</div>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                <Badge tone="sage" dot>Live</Badge>
                <Badge tone="neutral">Tue 8:14 AM</Badge>
              </div>
            </div>
          </div>
          <div className="ch-body" ref={scrollRef}>
            {chat.map((m, i) => (
              <CmdMsg key={i} m={m} />
            ))}
            {thinking && (
              <div className="chat-msg bot">
                <div className="av"><IconBot size={14} /></div>
                <div className="bub" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <Dot delay={0} /><Dot delay={120} /><Dot delay={240} />
                </div>
              </div>
            )}
          </div>
          <div className="ch-foot">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "var(--shell)", border: "1px solid var(--border)", borderRadius: 12 }}>
                <IconSparkles size={15} style={{ color: "var(--sage-deep)" }} />
                <input
                  style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 14 }}
                  placeholder="Ask ClinicOps to draft, assign, summarize, or prioritize…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                />
              </div>
              <Button variant="primary" onClick={send}><IconSend size={14} /> Send</Button>
            </div>
            <div className="cb-chips">
              {COMMAND_QUICKS.map((q) => (
                <button key={q} className="chip" onClick={() => respondTo(q)}>{q}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Generated actions */}
        <div className="card">
          <div className="card-head">
            <div>
              <h2>Generated actions</h2>
              <div className="sub">{actions.length} items · created by ClinicOps · awaiting human approval where required</div>
            </div>
            <Button variant="ghost" size="sm"><IconPlus size={13} /> Add manually</Button>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {actions.map((a) => (
              <ActionCard key={a.id} a={a} flash={flashIds.includes(a.id)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CmdMsg({ m }) {
  const isStaff = m.who === "staff";
  return (
    <div className={`chat-msg ${isStaff ? "staff" : "bot"}`}>
      <div className="av">
        {isStaff ? "JK" : <IconBot size={14} />}
      </div>
      <div className="bub">
        <div className="who">{isStaff ? "Jordan · Office manager" : "ClinicOps"}</div>
        {m.text}
        {!isStaff && m.actionRefs && (
          <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--sage-deep)", fontWeight: 600, display: "flex", gap: 6, flexWrap: "wrap" }}>
            <IconLayers size={11} style={{ verticalAlign: "-1px"}} />
            Created {m.actionRefs.length} action{m.actionRefs.length === 1 ? "" : "s"} →
          </div>
        )}
      </div>
    </div>
  );
}

function ActionCard({ a, flash }) {
  return (
    <div className={`action-card${flash ? " flash" : ""}`}>
      <IconTile tone={a.tone} iconKey={a.iconKey} />
      <div className="body">
        <div className="ac-head">
          <span className="ac-title">{a.title}</span>
          {a.badges.map((b, i) => (
            <Badge key={i} tone={b.tone} dot={b.tone === "red" || b.tone === "amber"}>{b.label}</Badge>
          ))}
        </div>
        <div className="ac-row">
          {a.rows.map((r, i) => (
            <span key={i}><span className="muted">{r.k}:</span> <span className="v">{r.v}</span></span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          <Button variant="ghost" size="sm">View</Button>
          <Button variant="ghost" size="sm">Reassign</Button>
          {a.badges.some(b => b.label.toLowerCase().includes("pending") || b.label.toLowerCase().includes("needs")) && (
            <Button variant="sage" size="sm"><IconCheckCircle size={13} /> Approve</Button>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CommandCenter });
