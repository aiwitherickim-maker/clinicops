'use client';

import React, { useState } from 'react';
import type { InboxMessage } from '@/types';
import { Button, Badge, RiskPill, IconTile, Avatar, ConfidenceMini } from './Primitives';
import {
  IconFilter, IconRefresh, IconClock, IconUser, IconFlag,
  IconEdit, IconCheckCircle, IconAlert, IconStethoscope,
} from './Icons';
import { generateStaffFollowupDraft } from '@/services/agentService';
import type { StaffFollowupDraftClientResult } from '@/services/agentService';

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
  const [staffDrafts, setStaffDrafts] = useState<Record<string, StaffFollowupDraftClientResult>>({});
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

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

  const handleRegenerate = async (msg: InboxMessage) => {
    setRegeneratingId(msg.id);
    try {
      const result = await generateStaffFollowupDraft({
        messageText:   msg.message,
        patientName:   msg.patient,
        category:      msg.category,
        riskLevel:     msg.risk,
        routeTo:       msg.routeTo,
        taskTitle:     msg.task.title,
        taskAssignee:  msg.task.assignee,
        reason:        msg.reason,
        clinicPhone:   '(734) 555-0142',
      });
      setStaffDrafts((prev) => ({ ...prev, [msg.id]: result }));
    } catch (err) {
      console.error('[StaffReviewInbox] regenerate error:', err);
      flashToast('Draft regeneration failed — try again.');
    } finally {
      setRegeneratingId(null);
    }
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
          <DetailPanel
            msg={selected}
            staffDraft={staffDrafts[selected.id] ?? null}
            isRegenerating={regeneratingId === selected.id}
            onRegenerate={() => handleRegenerate(selected)}
            onResolve={onResolve}
            onAssign={onAssign}
            flashToast={flashToast}
            toast={toast}
          />
        )}
      </div>
    </div>
  );
}

interface DetailPanelProps {
  msg: InboxMessage;
  staffDraft: StaffFollowupDraftClientResult | null;
  isRegenerating: boolean;
  onRegenerate: () => void;
  onResolve?: (msg: InboxMessage) => void;
  onAssign?: (msg: InboxMessage) => void;
  flashToast: (text: string) => void;
  toast: { text: string; tone: string } | null;
}

function DetailPanel({ msg, staffDraft, isRegenerating, onRegenerate, onResolve, onAssign, flashToast, toast }: DetailPanelProps) {
  const draftText = staffDraft?.draftText ?? msg.draft;
  const requiresClinicianApproval = staffDraft?.requiresClinicianApproval ?? msg.risk === 'high';
  const missingInformation = staffDraft?.missingInformation ?? [];
  const intendedSenderRole = staffDraft?.intendedSenderRole;

  return (
    <div className="card" style={{ position: 'relative' }}>
      <div className="card-head">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <IconTile tone={msg.iconTone} iconKey={msg.iconKey} />
          <div>
            <h2>{msg.patient}</h2>
            <div className="sub">{msg.category} · received {msg.received}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <RiskPill level={msg.risk} />
          <Badge tone={msg.statusTone} dot>{msg.status}</Badge>
        </div>
      </div>

      <div className="detail-section">
        <div className="label">Original message</div>
        <div className="detail-quote">&ldquo;{msg.message}&rdquo;</div>
        <div style={{ marginTop: 10, display: 'flex', gap: 14, fontSize: 12, color: 'var(--fg3)' }}>
          <span><IconClock size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />{msg.received}</span>
          <span><IconUser size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />{msg.patient}</span>
          <span><IconFlag size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />Via patient portal</span>
        </div>
      </div>

      <div className="detail-section">
        <div className="label">AI classification</div>
        <div className="kv-list">
          <div className="row"><span className="k">Category</span><span className="v">{msg.category}</span></div>
          <div className="row"><span className="k">Risk level</span><span className="v"><RiskPill level={msg.risk} /></span></div>
          <div className="row"><span className="k">Recommended route</span><span className="v">{msg.routeTo}</span></div>
          <div className="row">
            <span className="k">AI confidence</span>
            <span className="v" style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 240 }}>
              <ConfidenceMini value={msg.confidence} />
            </span>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <div className="label">Reason summary</div>
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--fg2)', lineHeight: 1.6 }}>{msg.reason}</p>
      </div>

      <div className="detail-section">
        <div className="label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Staff follow-up draft</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {requiresClinicianApproval && <Badge tone="red" dot>Clinician approval required</Badge>}
            {!requiresClinicianApproval && <Badge tone="amber" dot>Needs staff review</Badge>}
            {intendedSenderRole && <Badge tone="neutral">{intendedSenderRole.replace('_', ' ')}</Badge>}
          </div>
        </div>

        {isRegenerating ? (
          <div className="detail-draft" style={{ color: 'var(--fg3)', fontStyle: 'italic' }}>
            Generating staff follow-up draft…
          </div>
        ) : (
          <div className="detail-draft">{draftText}</div>
        )}

        {missingInformation.length > 0 && (
          <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--amber-soft)', borderRadius: 8, border: '1px solid var(--amber-border)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--amber-ink)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Missing information
            </div>
            <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 12.5, color: 'var(--fg2)', lineHeight: 1.7 }}>
              {missingInformation.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <Button variant="ghost" size="sm"><IconEdit size={13} /> Edit draft</Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRegenerate}
            disabled={isRegenerating}
          >
            <IconRefresh size={13} /> {isRegenerating ? 'Generating…' : 'Regenerate'}
          </Button>
        </div>
      </div>

      <div className="detail-section">
        <div className="label">Suggested task</div>
        <div className="task-card">
          <div className="tc-title">{msg.task.title}</div>
          <div className="tc-meta">
            <span><span className="k">Priority:</span> <span className="v">{msg.task.priority}</span></span>
            <span><span className="k">Assigned to:</span> <span className="v">{msg.task.assignee}</span></span>
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
          variant={msg.risk === 'high' ? 'sage' : 'secondary'}
          size="sm"
          onClick={() => {
            onAssign && onAssign(msg);
            flashToast(`Assigned to ${msg.task.assignee}`);
          }}
        >
          <IconStethoscope size={14} /> Assign to {msg.routeTo}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => flashToast('Escalated to clinical lead.')}>
          <IconAlert size={14} /> Escalate
        </Button>
        <div className="spacer" />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            onResolve && onResolve(msg);
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
