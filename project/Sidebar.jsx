/* Sidebar — forest nav, clinic identity, urgent counts. */

function Sidebar({ active, onSelect, reviewCount, taskCount }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-tile"><IconStethoscope size={20} /></div>
        <div>
          <div className="brand-name">ClinicOps</div>
          <div className="brand-sub">Chat Agent · v1.4</div>
        </div>
      </div>

      <div className="clinic-pill">
        <div className="dot" />
        <div>
          <div className="clinic-name">{CLINIC.name}</div>
          <div className="clinic-spec">{CLINIC.specialty}</div>
        </div>
      </div>

      <div className="nav-label">Workspace</div>
      <nav>
        {NAV.map((item) => {
          const NavIcon = ICON_BY_KEY[item.iconKey] || IconBot;
          const isActive = item.key === active;
          let cnt = item.count;
          if (item.key === "inbox")  cnt = reviewCount;
          if (item.key === "tasks")  cnt = taskCount;
          const urgent = item.urgent;
          const cls = `nav-item${isActive ? " active" : ""}${urgent && !isActive ? " urgent" : ""}${isActive && urgent ? " active urgent" : ""}`;
          return (
            <button key={item.key} className={cls} onClick={() => onSelect(item.key)}>
              <NavIcon size={17} />
              <span>{item.label}</span>
              {cnt != null && <span className="count">{cnt}</span>}
            </button>
          );
        })}
      </nav>

      <div className="nav-footer">
        <div className="avatar">JK</div>
        <div>
          <div className="who-name">Jordan Kim</div>
          <div className="who-role">Office manager</div>
        </div>
      </div>
    </aside>
  );
}

function TopBar({ section }) {
  const sectionMap = {
    dashboard: "Dashboard",
    chat: "Patient Chat Simulator",
    inbox: "Staff Review Inbox",
    command: "Back-Office Command Center",
    tasks: "Tasks",
    setup: "Clinic Setup",
  };
  return (
    <div className="topbar">
      <div className="crumb">
        {CLINIC.name} <span style={{ color: "var(--border-strong)", margin: "0 8px" }}>/</span>
        <b>{sectionMap[section]}</b>
      </div>
      <div className="right">
        <div className="search">
          <IconSearch size={15} />
          <input placeholder="Search patients, tasks, messages…" />
          <span className="mono" style={{ fontSize: 11, color: "var(--fg3)", background: "var(--paper)", border: "1px solid var(--border)", padding: "1px 6px", borderRadius: 6 }}>⌘K</span>
        </div>
        <button className="icon-btn" title="Notifications">
          <IconBell size={17} />
          <span className="ping" />
        </button>
        <button className="icon-btn" title="Refresh"><IconRefresh size={16} /></button>
      </div>
    </div>
  );
}

Object.assign(window, { Sidebar, TopBar });
