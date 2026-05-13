/* Shared primitives: Button, Badge, RiskPill, IconTile, Avatar, Card, etc. */

function Button({ variant = "primary", size, className = "", children, ...rest }) {
  const cls = `btn btn-${variant}${size === "sm" ? " btn-sm" : ""}${size === "lg" ? " btn-lg" : ""} ${className}`.trim();
  return <button className={cls} {...rest}>{children}</button>;
}

function Badge({ tone = "neutral", className = "", children, dot, ...rest }) {
  return (
    <span className={`badge tone-${tone} ${className}`.trim()} {...rest}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}

const RISK_LABEL = { high: "High Risk", medium: "Medium Risk", low: "Low Risk", finance: "Finance" };
function RiskPill({ level, label }) {
  return (
    <span className={`risk-pill risk-${level}`}>
      <span className="dot" />
      {label || RISK_LABEL[level] || level}
    </span>
  );
}

const ICON_BY_KEY = {
  layout:    IconLayout,
  message:   IconMessageCircle,
  inbox:     IconInbox,
  terminal:  IconTerminal,
  check:     IconCheckSquare,
  settings:  IconSettings,
  bot:       IconBot,
  shield:    IconShieldCheck,
  userCheck: IconUserCheck,
  alert:     IconAlert,
  eye:       IconEye,
  pill:      IconPill,
  calendar:  IconCalendar,
  dollar:    IconDollar,
  file:      IconFile,
  building:  IconBuilding,
  users:     IconUsers,
  book:      IconBook,
  lock:      IconLock,
  route:     IconRoute,
  clock:     IconClock,
  clipboard: IconClipboard,
  checkCircle: IconCheckCircle,
  stethoscope: IconStethoscope,
  edit:      IconEdit,
  user:      IconUser,
  flag:      IconFlag,
  bulb:      IconLightbulb,
  activity:  IconActivity,
  send:      IconSend,
  sparkles:  IconSparkles,
  layers:    IconLayers,
};

function IconTile({ tone = "sage", size = "md", iconKey, children }) {
  const sz = size === "sm" ? "tile-sm" : size === "lg" ? "tile-lg" : "";
  const Ico = iconKey ? ICON_BY_KEY[iconKey] : null;
  const iconSize = size === "sm" ? 16 : size === "lg" ? 22 : 18;
  return (
    <div className={`icon-tile tile-${tone} ${sz}`.trim()}>
      {Ico ? <Ico size={iconSize} /> : children}
    </div>
  );
}

function Avatar({ initials, tone = "sage", size = 32 }) {
  const palette = {
    sage:    { bg: "#E4F3F3", fg: "#346669" },
    amber:   { bg: "#FAF0D8", fg: "#8A6519" },
    green:   { bg: "#E3F1E8", fg: "#2E7D5E" },
    red:     { bg: "#FBE3DF", fg: "#A03A2D" },
    cream:   { bg: "#F4EFE5", fg: "#5C4423" },
    forest:  { bg: "#1C3739", fg: "#fff" },
  }[tone] || { bg: "#E4F3F3", fg: "#346669" };
  return (
    <div style={{
      width: size, height: size, borderRadius: 999,
      background: palette.bg, color: palette.fg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: Math.round(size * 0.36), fontWeight: 700, flexShrink: 0,
    }}>{initials}</div>
  );
}

function ConfidenceMini({ value }) {
  const pct = Math.max(4, Math.min(100, value));
  const tone = value >= 85 ? "var(--success)" : value >= 70 ? "var(--review)" : "var(--danger)";
  return (
    <div className="confidence-mini">
      <span style={{ color: tone }}>{value}%</span>
      <div className="bar"><div className="fill" style={{ width: `${pct}%`, background: tone }} /></div>
    </div>
  );
}

function Toggle({ on, onChange, locked }) {
  return (
    <div
      className={`tg-switch${on ? " on" : ""}${locked ? " locked" : ""}`}
      role="switch" aria-checked={on}
      onClick={() => !locked && onChange && onChange(!on)}
    >
      <div className="knob" />
    </div>
  );
}

function PrincipleBanner() {
  return (
    <div className="principle-banner">
      <span className="pb-icon"><IconLightbulb size={18} /></span>
      <div><b>ClinicOps drafts and routes.</b> Humans approve sensitive actions.</div>
    </div>
  );
}

function ReviewDisclaimer() {
  return (
    <div className="callout-warn">
      <span style={{ marginTop: 1 }}><IconShieldCheck size={14} /></span>
      <div>Clinical-risk responses require staff or clinician review before sending.</div>
    </div>
  );
}

Object.assign(window, {
  Button, Badge, RiskPill, IconTile, Avatar, ConfidenceMini, Toggle,
  PrincipleBanner, ReviewDisclaimer, ICON_BY_KEY, RISK_LABEL,
});
