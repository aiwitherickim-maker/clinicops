/* App — top-level: sidebar nav, top bar, screen routing. */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentColor": "#4F979A",
  "ctaColor": "#EA8324",
  "sidebarTone": "Forest",
  "density": "Comfortable",
  "showPrincipleBanner": true,
  "showReasoning": true
}/*EDITMODE-END*/;

function App() {
  const [section, setSection] = React.useState("dashboard");
  const [inbox, setInbox]     = React.useState(INBOX);
  const [tasks, setTasks]     = React.useState(TASKS);
  const [t, setTweak] = (typeof useTweaks === "function")
    ? useTweaks(TWEAK_DEFAULTS)
    : [TWEAK_DEFAULTS, () => {}];

  // Live theme variables driven by tweaks.
  React.useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--sage", t.accentColor || "#4F979A");
    root.style.setProperty("--sage-deep", darken(t.accentColor || "#4F979A", 0.18));
    root.style.setProperty("--sage-soft", lighten(t.accentColor || "#4F979A", 0.78));
    root.style.setProperty("--info", t.accentColor || "#4F979A");
    root.style.setProperty("--info-soft", lighten(t.accentColor || "#4F979A", 0.78));
    root.style.setProperty("--orange", t.ctaColor || "#EA8324");
    root.style.setProperty("--orange-dark", darken(t.ctaColor || "#EA8324", 0.16));
    root.style.setProperty("--orange-soft", lighten(t.ctaColor || "#EA8324", 0.7));

    if (t.sidebarTone === "Ink") {
      root.style.setProperty("--forest", "#0F2627");
    } else if (t.sidebarTone === "Slate") {
      root.style.setProperty("--forest", "#1E2A33");
    } else {
      root.style.setProperty("--forest", "#1C3739");
    }

    if (t.density === "Compact") {
      root.style.setProperty("--space-6", "16px");
      root.style.setProperty("--space-5", "14px");
    } else {
      root.style.setProperty("--space-6", "24px");
      root.style.setProperty("--space-5", "20px");
    }
  }, [t.accentColor, t.ctaColor, t.sidebarTone, t.density]);

  const reviewCount = inbox.filter((m) => m.risk === "high" || m.status?.toLowerCase().includes("review")).length;
  const taskCount   = tasks.filter((tk) => tk.status !== "Resolved").length;

  const screenLabels = {
    dashboard: "01 Dashboard",
    chat:      "02 Patient Chat Simulator",
    inbox:     "03 Staff Review Inbox",
    command:   "04 Back-Office Command Center",
    tasks:     "05 Tasks",
    setup:     "06 Clinic Setup",
  };

  return (
    <div className="app">
      <Sidebar active={section} onSelect={setSection} reviewCount={reviewCount} taskCount={taskCount} />
      <div className="main">
        <TopBar section={section} />
        <div className="main-inner" data-screen-label={screenLabels[section]}>
          {section === "dashboard" && <Dashboard onNavigate={setSection} />}
          {section === "chat"      && <ChatSimulator />}
          {section === "inbox"     && <ReviewInbox inbox={inbox} />}
          {section === "command"   && <CommandCenter />}
          {section === "tasks"     && <Tasks />}
          {section === "setup"     && <ClinicSetup />}
        </div>
      </div>

      {typeof TweaksPanel === "function" && (
        <TweaksPanel title="Tweaks">
          <TweakSection label="Theme">
            <TweakColor
              label="Accent (sage)"
              value={t.accentColor}
              onChange={(v) => setTweak("accentColor", v)}
              options={["#4F979A", "#2E7D5E", "#3F6FB5", "#7A6BD5"]}
            />
            <TweakColor
              label="Primary CTA"
              value={t.ctaColor}
              onChange={(v) => setTweak("ctaColor", v)}
              options={["#EA8324", "#1C3739", "#2E7D5E", "#A03A2D"]}
            />
            <TweakRadio
              label="Sidebar tone"
              value={t.sidebarTone}
              onChange={(v) => setTweak("sidebarTone", v)}
              options={["Forest", "Ink", "Slate"]}
            />
            <TweakRadio
              label="Density"
              value={t.density}
              onChange={(v) => setTweak("density", v)}
              options={["Comfortable", "Compact"]}
            />
          </TweakSection>
          <TweakSection label="Content">
            <TweakToggle
              label="Show principle banner"
              value={t.showPrincipleBanner}
              onChange={(v) => setTweak("showPrincipleBanner", v)}
            />
            <TweakToggle
              label="Show AI reasoning summaries"
              value={t.showReasoning}
              onChange={(v) => setTweak("showReasoning", v)}
            />
          </TweakSection>
          <TweakSection label="Demo">
            <TweakButton label="Jump to highest-risk inbox item" onClick={() => setSection("inbox")} />
            <TweakButton label="Run a patient simulation" onClick={() => setSection("chat")} />
          </TweakSection>
        </TweaksPanel>
      )}
    </div>
  );
}

/* Tiny color utils — hex → rgb mix with white/black. */
function clamp(v) { return Math.max(0, Math.min(255, v|0)); }
function hexToRgb(h) {
  const s = h.replace("#","");
  return [parseInt(s.slice(0,2),16), parseInt(s.slice(2,4),16), parseInt(s.slice(4,6),16)];
}
function rgbToHex([r,g,b]) {
  return "#" + [r,g,b].map(x => clamp(x).toString(16).padStart(2,"0")).join("");
}
function lighten(hex, amt) {
  const [r,g,b] = hexToRgb(hex);
  return rgbToHex([r + (255-r)*amt, g + (255-g)*amt, b + (255-b)*amt]);
}
function darken(hex, amt) {
  const [r,g,b] = hexToRgb(hex);
  return rgbToHex([r*(1-amt), g*(1-amt), b*(1-amt)]);
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

Object.assign(window, { App });
