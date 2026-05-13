'use client';

import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
  className?: string;
}

const Icon = ({ children, size = 18, color, style, className }: IconProps & { children: React.ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color || 'currentColor'}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={style}
    className={className}
  >
    {children}
  </svg>
);

export const IconBot = (p: IconProps) => (<Icon {...p}><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" /></Icon>);
export const IconLayout = (p: IconProps) => (<Icon {...p}><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></Icon>);
export const IconMessageCircle = (p: IconProps) => (<Icon {...p}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></Icon>);
export const IconInbox = (p: IconProps) => (<Icon {...p}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></Icon>);
export const IconTerminal = (p: IconProps) => (<Icon {...p}><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></Icon>);
export const IconCheckSquare = (p: IconProps) => (<Icon {...p}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></Icon>);
export const IconSettings = (p: IconProps) => (<Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></Icon>);
export const IconShieldCheck = (p: IconProps) => (<Icon {...p}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></Icon>);
export const IconUserCheck = (p: IconProps) => (<Icon {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></Icon>);
export const IconAlert = (p: IconProps) => (<Icon {...p}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></Icon>);
export const IconCheckCircle = (p: IconProps) => (<Icon {...p}><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></Icon>);
export const IconClose = (p: IconProps) => (<Icon {...p}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></Icon>);
export const IconSearch = (p: IconProps) => (<Icon {...p}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></Icon>);
export const IconBell = (p: IconProps) => (<Icon {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></Icon>);
export const IconArrowRight = (p: IconProps) => (<Icon {...p}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></Icon>);
export const IconSend = (p: IconProps) => (<Icon {...p}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></Icon>);
export const IconSparkles = (p: IconProps) => (<Icon {...p}><path d="M12 3l1.7 4.5L18 9l-4.3 1.5L12 15l-1.7-4.5L6 9l4.3-1.5z"/><path d="M19 14l.9 2.4L22 17l-2.1.6L19 20l-.9-2.4L16 17l2.1-.6z"/></Icon>);
export const IconEye = (p: IconProps) => (<Icon {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></Icon>);
export const IconPill = (p: IconProps) => (<Icon {...p}><path d="M10.5 20.5a4.95 4.95 0 1 1-7-7l7-7a4.95 4.95 0 1 1 7 7l-7 7z"/><path d="m8.5 8.5 7 7"/></Icon>);
export const IconCalendar = (p: IconProps) => (<Icon {...p}><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></Icon>);
export const IconDollar = (p: IconProps) => (<Icon {...p}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></Icon>);
export const IconFile = (p: IconProps) => (<Icon {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></Icon>);
export const IconBuilding = (p: IconProps) => (<Icon {...p}><rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/></Icon>);
export const IconUsers = (p: IconProps) => (<Icon {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Icon>);
export const IconBook = (p: IconProps) => (<Icon {...p}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></Icon>);
export const IconLock = (p: IconProps) => (<Icon {...p}><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></Icon>);
export const IconRoute = (p: IconProps) => (<Icon {...p}><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></Icon>);
export const IconClock = (p: IconProps) => (<Icon {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></Icon>);
export const IconClipboard = (p: IconProps) => (<Icon {...p}><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></Icon>);
export const IconRefresh = (p: IconProps) => (<Icon {...p}><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></Icon>);
export const IconChevronDown = (p: IconProps) => (<Icon {...p}><polyline points="6 9 12 15 18 9"/></Icon>);
export const IconPlus = (p: IconProps) => (<Icon {...p}><path d="M12 5v14"/><path d="M5 12h14"/></Icon>);
export const IconFilter = (p: IconProps) => (<Icon {...p}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></Icon>);
export const IconEdit = (p: IconProps) => (<Icon {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></Icon>);
export const IconArrowUp = (p: IconProps) => (<Icon {...p}><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></Icon>);
export const IconStethoscope = (p: IconProps) => (<Icon {...p}><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></Icon>);
export const IconUser = (p: IconProps) => (<Icon {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></Icon>);
export const IconFlag = (p: IconProps) => (<Icon {...p}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></Icon>);
export const IconLightbulb = (p: IconProps) => (<Icon {...p}><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.4 1 1 1 1.7v.6h6v-.6c0-.7.4-1.3 1-1.7A7 7 0 0 0 12 2z"/></Icon>);
export const IconActivity = (p: IconProps) => (<Icon {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></Icon>);
export const IconChevronRight = (p: IconProps) => (<Icon {...p}><polyline points="9 18 15 12 9 6"/></Icon>);
export const IconMoreH = (p: IconProps) => (<Icon {...p}><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></Icon>);
export const IconLayers = (p: IconProps) => (<Icon {...p}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></Icon>);

export type IconKey =
  | 'layout' | 'message' | 'inbox' | 'terminal' | 'check' | 'settings'
  | 'bot' | 'shield' | 'userCheck' | 'alert' | 'eye' | 'pill'
  | 'calendar' | 'dollar' | 'file' | 'building' | 'users' | 'book'
  | 'lock' | 'route' | 'clock' | 'clipboard' | 'checkCircle' | 'stethoscope'
  | 'edit' | 'user' | 'flag' | 'bulb' | 'activity' | 'send'
  | 'sparkles' | 'layers' | 'refresh' | 'filter' | 'plus' | 'arrowRight';

export const ICON_BY_KEY: Record<string, React.ComponentType<IconProps>> = {
  layout:      IconLayout,
  message:     IconMessageCircle,
  inbox:       IconInbox,
  terminal:    IconTerminal,
  check:       IconCheckSquare,
  settings:    IconSettings,
  bot:         IconBot,
  shield:      IconShieldCheck,
  userCheck:   IconUserCheck,
  alert:       IconAlert,
  eye:         IconEye,
  pill:        IconPill,
  calendar:    IconCalendar,
  dollar:      IconDollar,
  file:        IconFile,
  building:    IconBuilding,
  users:       IconUsers,
  book:        IconBook,
  lock:        IconLock,
  route:       IconRoute,
  clock:       IconClock,
  clipboard:   IconClipboard,
  checkCircle: IconCheckCircle,
  stethoscope: IconStethoscope,
  edit:        IconEdit,
  user:        IconUser,
  flag:        IconFlag,
  bulb:        IconLightbulb,
  activity:    IconActivity,
  send:        IconSend,
  sparkles:    IconSparkles,
  layers:      IconLayers,
};
