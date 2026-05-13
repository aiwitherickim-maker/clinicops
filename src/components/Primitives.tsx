'use client';

import React from 'react';
import type { Tone, Risk } from '@/types';
import { ICON_BY_KEY, IconLightbulb, IconShieldCheck } from './Icons';

// ── Button ──────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'sage' | 'forest' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ variant = 'primary', size, className = '', children, ...rest }: ButtonProps) {
  const cls = [
    'btn',
    `btn-${variant}`,
    size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '',
    className,
  ].filter(Boolean).join(' ');
  return <button className={cls} {...rest}>{children}</button>;
}

// ── Badge ───────────────────────────────────────────────────────────────────

interface BadgeProps {
  tone?: Tone;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ tone = 'neutral', dot, children, className = '' }: BadgeProps) {
  return (
    <span className={`badge tone-${tone} ${className}`.trim()}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}

// ── RiskPill ─────────────────────────────────────────────────────────────────

const RISK_LABEL: Record<string, string> = {
  high: 'High Risk', medium: 'Medium Risk', low: 'Low Risk', finance: 'Finance',
};

interface RiskPillProps {
  level: Risk;
  label?: string;
}

export function RiskPill({ level, label }: RiskPillProps) {
  return (
    <span className={`risk-pill risk-${level}`}>
      <span className="dot" />
      {label || RISK_LABEL[level] || level}
    </span>
  );
}

// ── IconTile ─────────────────────────────────────────────────────────────────

interface IconTileProps {
  tone?: Tone | 'orange';
  size?: 'sm' | 'md' | 'lg';
  iconKey?: string;
  children?: React.ReactNode;
}

export function IconTile({ tone = 'sage', size = 'md', iconKey, children }: IconTileProps) {
  const sz = size === 'sm' ? 'tile-sm' : size === 'lg' ? 'tile-lg' : '';
  const Ico = iconKey ? ICON_BY_KEY[iconKey] : null;
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 22 : 18;
  return (
    <div className={`icon-tile tile-${tone} ${sz}`.trim()}>
      {Ico ? <Ico size={iconSize} /> : children}
    </div>
  );
}

// ── Avatar ───────────────────────────────────────────────────────────────────

interface AvatarProps {
  initials: string;
  tone?: Tone;
  size?: number;
}

const AVATAR_PALETTE: Record<string, { bg: string; fg: string }> = {
  sage:   { bg: '#E4F3F3', fg: '#346669' },
  amber:  { bg: '#FAF0D8', fg: '#8A6519' },
  green:  { bg: '#E3F1E8', fg: '#2E7D5E' },
  red:    { bg: '#FBE3DF', fg: '#A03A2D' },
  cream:  { bg: '#F4EFE5', fg: '#5C4423' },
  forest: { bg: '#1C3739', fg: '#fff' },
  neutral:{ bg: '#F0F1F0', fg: '#3F5557' },
};

export function Avatar({ initials, tone = 'sage', size = 32 }: AvatarProps) {
  const palette = AVATAR_PALETTE[tone] || AVATAR_PALETTE.sage;
  return (
    <div style={{
      width: size, height: size, borderRadius: 999,
      background: palette.bg, color: palette.fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.36), fontWeight: 700, flexShrink: 0,
    }}>{initials}</div>
  );
}

// ── ConfidenceMini ────────────────────────────────────────────────────────────

export function ConfidenceMini({ value }: { value: number }) {
  const pct = Math.max(4, Math.min(100, value));
  const tone = value >= 85 ? 'var(--success)' : value >= 70 ? 'var(--review)' : 'var(--danger)';
  return (
    <div className="confidence-mini">
      <span style={{ color: tone }}>{value}%</span>
      <div className="bar"><div className="fill" style={{ width: `${pct}%`, background: tone }} /></div>
    </div>
  );
}

// ── Toggle ───────────────────────────────────────────────────────────────────

interface ToggleProps {
  on: boolean;
  locked?: boolean;
  onChange?: (v: boolean) => void;
}

export function Toggle({ on, locked, onChange }: ToggleProps) {
  return (
    <div
      className={`tg-switch${on ? ' on' : ''}${locked ? ' locked' : ''}`}
      role="switch"
      aria-checked={on}
      onClick={() => !locked && onChange && onChange(!on)}
    >
      <div className="knob" />
    </div>
  );
}

// ── PrincipleBanner ───────────────────────────────────────────────────────────

export function PrincipleBanner() {
  return (
    <div className="principle-banner">
      <span className="pb-icon"><IconLightbulb size={18} /></span>
      <div><b>ClinicOps drafts and routes.</b> Humans approve sensitive actions.</div>
    </div>
  );
}

// ── ReviewDisclaimer ──────────────────────────────────────────────────────────

export function ReviewDisclaimer() {
  return (
    <div className="callout-warn">
      <span style={{ marginTop: 1 }}><IconShieldCheck size={14} /></span>
      <div>Clinical-risk responses require staff or clinician review before sending.</div>
    </div>
  );
}

// ── Dot (typing indicator) ────────────────────────────────────────────────────

export function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <span style={{
      width: 6, height: 6, borderRadius: 999, background: 'var(--fg3)',
      animation: 'bounce 1.1s infinite',
      animationDelay: `${delay}ms`, display: 'inline-block',
    }} />
  );
}
