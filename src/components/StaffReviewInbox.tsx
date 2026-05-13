'use client';

import React, { useState } from 'react';
import type { InboxMessage } from '@/types';
import { Button, Badge, RiskPill, IconTile, Avatar, ConfidenceMini } from './Primitives';
import {
  IconFilter, IconRefresh, IconClock, IconUser, IconFlag,
  IconEdit, IconCheckCircle, IconAlert, IconStethoscope,
} from './Icons';

interface StaffReviewInboxProps {
  inbox: InboxMessage[];
  onResolve?: (msg: InboxMessage) => void;
  onAssign?: (msg: InboxMessage) => void;
}

type FilterKey = 'all' | 'high' | 'medium' | 'low';

export function StaffReviewInbox({ inbox, onResolve, onAssign }: StaffReviewInboxProps) {
  const [selectedId, setSelectedId] = useState<string>(inbox[0]?.id);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [toast, setToast] = useState<{ text: string; tone: string } | null>(null);

  const filtered = inbox.filter((m) => {
    if (filter === 'all')    return true;
    if (filter === 'high')   return m.risk === 'high';
    if (filter === 'medium') return m.risk === 'medium';
    if (filter === 'low')    return m.risk === 'low';
    return true;
  });

  const selected = inbox.find((m) => m.id === selectedId) || filtered[0];

  const flashToast = (text: string) => {
    setToast({ text, tone: 'sage' });
    setTimeout(() => setToast(null), 1800);
  };

  const filterTabs: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all',    label: 'All',         count: inbox.length },
    { key: 'high',   label: 'High risk',   count: inbox.filter(m => m.risk === 'high').length },
    { key: 'medium', label: 'Medium risk', count: inbox.filter(m => m.risk === 'medium').length },
    { key: 'low',    label: 'Low risk',    count: inbox.filter(m => m.risk === 'low').length },
  ];

  return (
    <div className="screen-enter" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div>
          <h1>Staff Review Inbox</h1>
          <p className="lede">AI-triaged patient messages. Each one is drafted, classified, and routed — staff approve, edit, assign, or escalate.</p>
        </div>
        <div className="actions">
          <Button variant="secondary" size="sm"><IconFilter size={14} /> Filters</Button>
          <Button variant="secondary" size="sm"><IconRefresh size={14} /> Refresh</Button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="filter-bar">
        {filterTabs.map((f) => (
          <button key={f.key} className={`chip${filter === f.key ? ' is-active' : ''}`} onClick={() => setFilter(f.key)}>
            {f.label} <span style={{ opacity: 0.7 }}>· {f.count}</span>
          </button>
        ))}
      </div>

      <div className="split-list-detail">
        {/* List */}
        <div className="card" style={{ position: 'sticky', top: 24 }}>
          <div className="card-head">
            <div>
              <h2>Messages</h2>
              <div className="sub">{filtered.length} total · sorted by risk</div>
            </div>
          </div>
          <div className="card-body tight inbox-list">
            {filtered.map((m) => (
              <InboxCard
                key={m.id}
                m={m}
                selected={m.id === selected?.id}
                onSelect={() => setSelectedId(m.id)}
              />
            ))}
          </div>
        </div>

        {/* Detail */}
        {selected && (
          <div className="card" style={{ position: 'relative' }}>
            <div className="card-head">
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <IconTile tone={selected.iconTone} iconKey={selected.iconKey} />
                <div>
                  <h2>{selected.patient}</h2>
                  <div className="sub">{selected.category} · received {selected.received}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <RiskPill level={selected.risk} />
                <Badge tone={selected.statusTone} dot>{selected.status}</Badge>
              </div>
            </div>

            <div className="detail-section">
              <div className="label">Original message</div>
              <div className="detail-quote">&ldquo;{selected.message}&rdquo;</div>
              <div style={{ marginTop: 10, display: 'flex', gap: 14, fontSize: 12, color: 'var(--fg3)' }}>
                <span><IconClock size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />{selected.received}</span>
                <span><IconUser size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />{selected.patient}</span>
                <span><IconFlag size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />Via patient portal</span>
              </div>
            </div>

            <div className="detail-section">
              <div className="label">AI classification</div>
              <div className="kv-list">
                <div className="row"><span className="k">Category</span><span className="v">{selected.category}</span></div>
                <div className="row"><span className="k">Risk level</span><span className="v"><RiskPill level={selected.risk} /></span></div>
                <div className="row"><span className="k">Recommended route</span><span className="v">{selected.routeTo}</span></div>
                <div className="row">
                  <span className="k">AI confidence</span>
                  <span className="v" style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 240 }}>
                    <ConfidenceMini value={selected.confidence} />
                  </span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <div className="label">Reason summary</div>
              <p style={{ margin: 0, fontSize: 13.5, color: 'var(--fg2)', lineHeight: 1.6 }}>{selected.reason}</p>
            </div>

            <div className="detail-section">
              <div className="label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>AI draft response</span>
                <Badge tone="amber" dot>Draft only — needs review</Badge>
              </div>
              <div className="detail-draft">{selected.draft}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <Button variant="ghost" size="sm"><IconEdit size={13} /> Edit draft</Button>
                <Button variant="ghost" size="sm"><IconRefresh size={13} /> Regenerate</Button>
              </div>
            </div>

            <div className="detail-section">
              <div className="label">Suggested task</div>
              <div className="task-card">
                <div className="tc-title">{selected.task.title}</div>
                <div className="tc-meta">
                  <span><span className="k">Priority:</span> <span className="v">{selected.task.priority}</span></span>
                  <span><span className="k">Assigned to:</span> <span className="v">{selected.task.assignee}</span></span>
                  <span><span className="k">Source:</span> <span className="v">Patient message</span></span>
                </div>
              </div>
            </div>

            <div className="detail-actions">
              <Button variant="ghost" size="sm" onClick={() => flashToast('Draft approved — sent to send queue.')}>
                <IconCheckCircle size={14} /> Approve draft
              </Button>
              <Button variant="ghost" size="sm">
                <IconEdit size={14} /> Edit draft
              </Button>
              <Button
                variant={selected.risk === 'high' ? 'sage' : 'secondary'}
                size="sm"
                onClick={() => {
                  onAssign && onAssign(selected);
                  flashToast(`Assigned to ${selected.task.assignee}`);
                }}
              >
                <IconStethoscope size={14} /> Assign to {selected.routeTo}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => flashToast('Escalated to clinical lead.')}>
                <IconAlert size={14} /> Escalate
              </Button>
              <div className="spacer" />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onResolve && onResolve(selected);
                  flashToast('Marked resolved.');
                }}
              >
                Mark resolved
              </Button>
            </div>

            {toast && (
              <div style={{
                position: 'absolute', bottom: 78, right: 22,
                background: 'var(--forest-ink)', color: 'white',
                padding: '10px 14px', borderRadius: 12,
                fontSize: 13, fontWeight: 600,
                boxShadow: 'var(--shadow-elevated)',
                display: 'flex', alignItems: 'center', gap: 8,
                animation: 'fadeIn 180ms ease',
              }}>
                <IconCheckCircle size={14} /> {toast.text}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InboxCard({ m, selected, onSelect }: { m: InboxMessage; selected: boolean; onSelect: () => void }) {
  const avatarTone = m.iconTone === 'red' ? 'red' : m.iconTone === 'amber' ? 'amber' : 'sage';
  return (
    <button className={`inbox-card${selected ? ' selected' : ''}`} onClick={onSelect}>
      <div className="ic-head">
        <Avatar initials={m.initials} tone={avatarTone} size={28} />
        <span className="ic-name">{m.patient}</span>
        <span className="ic-time">{m.received}</span>
      </div>
      <div className="ic-msg">&ldquo;{m.message}&rdquo;</div>
      <div className="ic-meta">
        <RiskPill level={m.risk} />
        <Badge tone="neutral">{m.category}</Badge>
        <Badge tone={m.statusTone} dot>{m.status}</Badge>
      </div>
    </button>
  );
}
