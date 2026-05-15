'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { DbBackofficeDraft } from '@/types/database';
import { Button, Badge, IconTile } from './Primitives';
import { IconFile, IconCheckCircle, IconClock, IconAlert, IconUser } from './Icons';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDraftType(t: string): string {
  const map: Record<string, string> = {
    payer_call_script:    'Payer Call Script',
    patient_update:       'Patient Update',
    internal_note:        'Internal Note',
    prior_auth_checklist: 'PA Checklist',
    appeal_draft:         'Appeal Draft',
    billing_followup:     'Billing Follow-up',
  };
  return map[t] ?? t.replace(/_/g, ' ');
}

function draftTypeTone(t: string): 'amber' | 'sage' | 'forest' | 'cream' | 'neutral' {
  if (t === 'payer_call_script' || t === 'appeal_draft' || t === 'billing_followup') return 'amber';
  if (t === 'patient_update')       return 'sage';
  if (t === 'prior_auth_checklist') return 'forest';
  return 'neutral';
}

function statusTone(s: string): 'cream' | 'sage' | 'forest' | 'neutral' | 'amber' {
  if (s === 'ready_for_review') return 'cream';
  if (s === 'approved')         return 'sage';
  if (s === 'used')             return 'forest';
  if (s === 'archived')         return 'neutral';
  return 'neutral';
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    draft:            'Draft',
    ready_for_review: 'Ready for review',
    approved:         'Approved',
    used:             'Used',
    archived:         'Archived',
  };
  return map[s] ?? s;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function patientName(d: DbBackofficeDraft): string | null {
  return (d.metadata?.patient_name as string) ?? null;
}

// ── API calls ─────────────────────────────────────────────────────────────────

async function fetchDrafts(): Promise<DbBackofficeDraft[]> {
  const res = await fetch('/api/backoffice-drafts?clinicId=a0000000-0000-0000-0000-000000000001');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json() as { drafts: DbBackofficeDraft[] };
  return json.drafts;
}

async function patchDraft(id: string, updates: Record<string, string>): Promise<DbBackofficeDraft> {
  const res = await fetch(`/api/backoffice-drafts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json() as { draft: DbBackofficeDraft };
  return json.draft;
}

// ── Filter bar ────────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { key: 'all',             label: 'All' },
  { key: 'ready_for_review',label: 'Ready for review' },
  { key: 'approved',        label: 'Approved' },
  { key: 'used',            label: 'Used' },
  { key: 'archived',        label: 'Archived' },
];

const TYPE_FILTERS = [
  { key: 'all',                 label: 'All types' },
  { key: 'payer_call_script',   label: 'Payer call script' },
  { key: 'patient_update',      label: 'Patient update' },
  { key: 'prior_auth_checklist',label: 'PA checklist' },
  { key: 'internal_note',       label: 'Internal note' },
  { key: 'appeal_draft',        label: 'Appeal draft' },
  { key: 'billing_followup',    label: 'Billing follow-up' },
];

// ── Main component ────────────────────────────────────────────────────────────

export function BackofficeDrafts() {
  const [drafts, setDrafts]         = useState<DbBackofficeDraft[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [selected, setSelected]     = useState<DbBackofficeDraft | null>(null);
  const [statusFilter, setStatus]   = useState('all');
  const [typeFilter, setType]       = useState('all');
  const [copying, setCopying]       = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchDrafts();
      setDrafts(data);
      // Keep selected in sync after reload
      if (selected) {
        const refreshed = data.find(d => d.id === selected.id);
        if (refreshed) setSelected(refreshed);
      }
    } catch (e) {
      setError('Failed to load drafts. Please try again.');
      console.error('[BackofficeDrafts] load error:', e);
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = drafts.filter(d => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (typeFilter   !== 'all' && d.draft_type !== typeFilter) return false;
    return true;
  });

  const doAction = async (action: 'used' | 'archived') => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const updated = await patchDraft(selected.id, { status: action });
      setDrafts(prev => prev.map(d => d.id === updated.id ? updated : d));
      setSelected(updated);
    } catch (e) {
      console.error('[BackofficeDrafts] action error:', e);
    } finally {
      setActionLoading(false);
    }
  };

  const doCopy = async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(selected.content);
      setCopying(true);
      setTimeout(() => setCopying(false), 1800);
    } catch {
      // Fallback: select the text in a textarea
    }
  };

  return (
    <div className="screen-enter" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div>
          <h1>Backoffice Drafts</h1>
          <p className="lede">AI-generated scripts, letters, and checklists — saved for review, editing, and use.</p>
        </div>
        <div className="actions">
          <Button variant="secondary" size="sm" onClick={load}>Refresh</Button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--fg3)', fontWeight: 600 }}>Status:</span>
        {STATUS_FILTERS.map(f => (
          <button
            key={f.key}
            className={`chip${statusFilter === f.key ? ' active' : ''}`}
            onClick={() => setStatus(f.key)}
          >{f.label}</button>
        ))}
        <span style={{ fontSize: 12, color: 'var(--fg3)', fontWeight: 600, marginLeft: 8 }}>Type:</span>
        {TYPE_FILTERS.map(f => (
          <button
            key={f.key}
            className={`chip${typeFilter === f.key ? ' active' : ''}`}
            onClick={() => setType(f.key)}
          >{f.label}</button>
        ))}
      </div>

      <div className="split-2col">
        {/* Draft list */}
        <div className="card" style={{ padding: 0 }}>
          <div className="card-head" style={{ padding: '14px 18px' }}>
            <div>
              <h2>Saved drafts</h2>
              <div className="sub">{visible.length} draft{visible.length !== 1 ? 's' : ''}</div>
            </div>
          </div>

          {loading && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg3)', fontSize: 14 }}>
              Loading drafts…
            </div>
          )}

          {error && (
            <div style={{ padding: 20, color: '#A03A2D', fontSize: 13 }}>
              <IconAlert size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
              {error}
            </div>
          )}

          {!loading && !error && visible.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg3)', fontSize: 14 }}>
              No drafts match the current filters.
              <br />
              <span style={{ fontSize: 12 }}>Use Back-Office Command to generate drafts.</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {visible.map((d, i) => (
              <DraftRow
                key={d.id}
                draft={d}
                isSelected={selected?.id === d.id}
                isLast={i === visible.length - 1}
                onClick={() => setSelected(d)}
              />
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="card" style={{ padding: 0 }}>
          {selected == null ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 320, gap: 10, color: 'var(--fg3)', padding: '20px 22px' }}>
              <IconFile size={32} style={{ opacity: 0.3 }} />
              <div style={{ fontSize: 14 }}>Select a draft to view its content</div>
            </div>
          ) : (
            <DraftDetail
              draft={selected}
              copying={copying}
              actionLoading={actionLoading}
              onCopy={doCopy}
              onMarkUsed={() => doAction('used')}
              onArchive={() => doAction('archived')}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── DraftRow ──────────────────────────────────────────────────────────────────

function DraftRow({
  draft, isSelected, isLast, onClick,
}: {
  draft: DbBackofficeDraft;
  isSelected: boolean;
  isLast: boolean;
  onClick: () => void;
}) {
  const name = patientName(draft);
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '14px 18px',
        background: isSelected ? 'var(--sage-tint)' : 'transparent',
        border: 'none',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        borderLeft: isSelected ? '3px solid var(--sage-deep)' : '3px solid transparent',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        transition: 'background 0.12s',
      }}
    >
      <IconTile tone={draftTypeTone(draft.draft_type)} iconKey="file" size="sm" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg1)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {draft.title}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <Badge tone={draftTypeTone(draft.draft_type)}>{formatDraftType(draft.draft_type)}</Badge>
          <Badge tone={statusTone(draft.status)}>{statusLabel(draft.status)}</Badge>
          {name && (
            <span style={{ fontSize: 11.5, color: 'var(--fg3)' }}>
              <IconUser size={10} style={{ verticalAlign: '-1px', marginRight: 2 }} />
              {name}
            </span>
          )}
          <span style={{ fontSize: 11.5, color: 'var(--fg3)', marginLeft: 'auto' }}>
            <IconClock size={10} style={{ verticalAlign: '-1px', marginRight: 2 }} />
            {timeAgo(draft.created_at)}
          </span>
        </div>
      </div>
    </button>
  );
}

// ── DraftContent ─────────────────────────────────────────────────────────────

function DraftContent({ text }: { text: string }) {
  // Collapse 3+ consecutive blank lines → 1 blank line, trim trailing whitespace per line
  const normalised = text
    .split('\n')
    .map(l => l.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const lines = normalised.split('\n');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {lines.map((line, i) => {
        if (line === '') {
          return <div key={i} style={{ height: 10 }} />;
        }

        // Bullet line
        const isBullet = /^[•\-\*·□✓]\s/.test(line) || /^\d+\.\s/.test(line);
        if (isBullet) {
          return (
            <div key={i} style={{
              fontSize: 13,
              lineHeight: 1.6,
              color: 'var(--fg1)',
              paddingLeft: 16,
              marginBottom: 2,
              position: 'relative',
            }}>
              <span style={{ position: 'absolute', left: 0, color: 'var(--fg3)' }}>
                {line.match(/^(\d+\.)/)?.[1] ?? '•'}
              </span>
              {line.replace(/^[•\-\*·□✓]\s/, '').replace(/^\d+\.\s/, '')}
            </div>
          );
        }

        // Section heading: line ends with ":" and is short (≤ 60 chars) and not a sentence
        const isHeading = line.endsWith(':') && line.length <= 60 && !line.includes('. ');
        if (isHeading) {
          return (
            <div key={i} style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: 'var(--fg2)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginTop: i === 0 ? 0 : 12,
              marginBottom: 4,
            }}>
              {line.replace(/:$/, '')}
            </div>
          );
        }

        // Normal paragraph line
        return (
          <div key={i} style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--fg1)', marginBottom: 2 }}>
            {line}
          </div>
        );
      })}
    </div>
  );
}

// ── DraftDetail ───────────────────────────────────────────────────────────────

function DraftDetail({
  draft, copying, actionLoading, onCopy, onMarkUsed, onArchive,
}: {
  draft: DbBackofficeDraft;
  copying: boolean;
  actionLoading: boolean;
  onCopy: () => void;
  onMarkUsed: () => void;
  onArchive: () => void;
}) {
  const name = patientName(draft);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 22px 20px' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <Badge tone={draftTypeTone(draft.draft_type)}>{formatDraftType(draft.draft_type)}</Badge>
          <Badge tone={statusTone(draft.status)}>{statusLabel(draft.status)}</Badge>
          {draft.intended_sender_role && (
            <Badge tone="neutral">{draft.intended_sender_role.replace(/_/g, ' ')}</Badge>
          )}
        </div>
        <h2 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, lineHeight: 1.4 }}>{draft.title}</h2>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--fg3)' }}>
          {name && (
            <span>
              <IconUser size={11} style={{ verticalAlign: '-1px', marginRight: 3 }} />
              {name}
            </span>
          )}
          <span>
            <IconClock size={11} style={{ verticalAlign: '-1px', marginRight: 3 }} />
            {timeAgo(draft.created_at)}
          </span>
          {draft.created_by_agent && (
            <span style={{ color: 'var(--sage-deep)' }}>AI-generated</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          maxHeight: 380,
          overflowY: 'auto',
          background: 'var(--shell)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '16px 18px',
          marginBottom: 20,
        }}
      >
        <DraftContent text={draft.content} />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingBottom: 2 }}>
        <Button variant="secondary" size="sm" onClick={onCopy}>
          {copying ? <><IconCheckCircle size={13} /> Copied!</> : 'Copy'}
        </Button>
        {draft.status !== 'used' && (
          <Button variant="sage" size="sm" onClick={onMarkUsed} disabled={actionLoading}>
            <IconCheckCircle size={13} /> Mark used
          </Button>
        )}
        {draft.status !== 'archived' && (
          <Button variant="ghost" size="sm" onClick={onArchive} disabled={actionLoading}>
            Archive
          </Button>
        )}
      </div>
    </div>
  );
}
