'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { InboxMessage, Tone, Risk } from '@/types';
import { Button, Badge, RiskPill, IconTile, Avatar, ConfidenceMini } from './Primitives';
import {
  IconFilter, IconRefresh, IconClock, IconUser, IconFlag,
  IconEdit, IconCheckCircle, IconAlert, IconStethoscope,
} from './Icons';
import { generateStaffFollowupDraft } from '@/services/agentService';
import type { StaffFollowupDraftClientResult } from '@/services/agentService';
import {
  approveMessageWorkflow,
  editDraftWorkflow,
  assignMessageWorkflow,
  escalateMessageWorkflow,
  resolveMessageWorkflowWithLog,
} from '@/services/clinicDataService';

interface StaffReviewInboxProps {
  inbox: InboxMessage[];
  onResolve?: (msg: InboxMessage) => void;
  onAssign?:  (msg: InboxMessage) => void;
}

type FilterKey   = 'all' | 'high' | 'medium' | 'low';
type ActionName  = 'approve' | 'edit_save' | 'assign' | 'escalate' | 'resolve';

export function StaffReviewInbox({ inbox, onResolve, onAssign }: StaffReviewInboxProps) {
  // Maintain a local copy so we can update status/route after DB writes
  const [localInbox, setLocalInbox] = useState<InboxMessage[]>(inbox);
  useEffect(() => { setLocalInbox(inbox); }, [inbox]);

  const [selectedId, setSelectedId]         = useState<string>(inbox[0]?.id);
  const [filter, setFilter]                 = useState<FilterKey>('all');
  const [toast, setToast]                   = useState<{ text: string; isError: boolean } | null>(null);
  const [staffDrafts, setStaffDrafts]       = useState<Record<string, StaffFollowupDraftClientResult>>({});
  const [editedTexts, setEditedTexts]       = useState<Record<string, string>>({});
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [loadingActions, setLoadingActions] = useState<Record<string, ActionName>>({});
  const [editingMsgId, setEditingMsgId]     = useState<string | null>(null);
  const [editText, setEditText]             = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = localInbox.filter((m) => {
    if (filter === 'all')    return true;
    if (filter === 'high')   return m.risk === 'high';
    if (filter === 'medium') return m.risk === 'medium';
    if (filter === 'low')    return m.risk === 'low';
    return true;
  });
  const selected = localInbox.find((m) => m.id === selectedId) || filtered[0];

  const flashToast = (text: string, isError = false) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ text, isError });
    toastTimer.current = setTimeout(() => setToast(null), isError ? 3500 : 2000);
  };

  const setActionBusy = (msgId: string, action: ActionName | null) => {
    setLoadingActions(prev => {
      if (action === null) { const n = { ...prev }; delete n[msgId]; return n; }
      return { ...prev, [msgId]: action };
    });
  };

  const handleRegenerate = async (msg: InboxMessage) => {
    setRegeneratingId(msg.id);
    try {
      const result = await generateStaffFollowupDraft({
        messageText:  msg.message,
        patientName:  msg.patient,
        category:     msg.category,
        riskLevel:    msg.risk,
        routeTo:      msg.routeTo,
        taskTitle:    msg.task.title,
        taskAssignee: msg.task.assignee,
        reason:       msg.reason,
        clinicPhone:  '(734) 555-0142',
      });
      setStaffDrafts(prev => ({ ...prev, [msg.id]: result }));
    } catch (err) {
      console.error('[StaffReviewInbox] regenerate:', err);
      flashToast('Draft regeneration failed — try again.', true);
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleApprove = async (msg: InboxMessage) => {
    if (loadingActions[msg.id]) return;
    const draftText = editedTexts[msg.id] ?? staffDrafts[msg.id]?.draftText ?? msg.draft;
    setActionBusy(msg.id, 'approve');
    try {
      const result = await approveMessageWorkflow(msg.id, draftText);
      if (!result.success) throw new Error(result.error);
      setLocalInbox(prev => prev.map(m =>
        m.id === msg.id ? { ...m, status: 'Approved', statusTone: 'sage' as Tone } : m,
      ));
      flashToast('Draft approved — sent to send queue.');
    } catch (err) {
      console.error('[handleApprove]', err);
      flashToast('Failed to approve draft. Please try again.', true);
    } finally {
      setActionBusy(msg.id, null);
    }
  };

  const handleEditStart = (msg: InboxMessage) => {
    const currentText = editedTexts[msg.id] ?? staffDrafts[msg.id]?.draftText ?? msg.draft;
    setEditingMsgId(msg.id);
    setEditText(currentText);
  };

  const handleEditSave = async (msg: InboxMessage) => {
    if (loadingActions[msg.id] || !editText.trim()) return;
    const originalText = staffDrafts[msg.id]?.draftText ?? msg.draft;
    setActionBusy(msg.id, 'edit_save');
    try {
      const result = await editDraftWorkflow(msg.id, originalText, editText);
      if (!result.success) throw new Error(result.error);
      setEditedTexts(prev => ({ ...prev, [msg.id]: editText }));
      setEditingMsgId(null);
      flashToast('Draft saved.');
    } catch (err) {
      console.error('[handleEditSave]', err);
      flashToast('Failed to save edit. Please try again.', true);
    } finally {
      setActionBusy(msg.id, null);
    }
  };

  const handleAssign = async (msg: InboxMessage) => {
    if (loadingActions[msg.id]) return;
    setActionBusy(msg.id, 'assign');
    try {
      const result = await assignMessageWorkflow(msg.id, msg.routeTo, msg.routeTo);
      if (!result.success) throw new Error(result.error);
      onAssign && onAssign(msg);
      flashToast(`Assigned to ${msg.routeTo}`);
    } catch (err) {
      console.error('[handleAssign]', err);
      flashToast('Failed to assign. Please try again.', true);
    } finally {
      setActionBusy(msg.id, null);
    }
  };

  const handleEscalate = async (msg: InboxMessage) => {
    if (loadingActions[msg.id]) return;
    setActionBusy(msg.id, 'escalate');
    try {
      const result = await escalateMessageWorkflow(msg.id, msg.patient, msg.routeTo, msg.risk);
      if (!result.success) throw new Error(result.error);
      setLocalInbox(prev => prev.map(m =>
        m.id === msg.id
          ? { ...m, risk: 'high' as Risk, routeTo: 'Clinician', status: 'Escalated', statusTone: 'red' as Tone }
          : m,
      ));
      flashToast('Escalated to clinical lead.');
    } catch (err) {
      console.error('[handleEscalate]', err);
      flashToast('Failed to escalate. Please try again.', true);
    } finally {
      setActionBusy(msg.id, null);
    }
  };

  const handleResolve = async (msg: InboxMessage) => {
    if (loadingActions[msg.id]) return;
    setActionBusy(msg.id, 'resolve');
    try {
      const result = await resolveMessageWorkflowWithLog(msg.id);
      if (!result.success) throw new Error(result.error);
      setLocalInbox(prev => prev.filter(m => m.id !== msg.id));
      onResolve && onResolve(msg);
      flashToast('Marked resolved.');
    } catch (err) {
      console.error('[handleResolve]', err);
      flashToast('Failed to resolve. Please try again.', true);
    } finally {
      setActionBusy(msg.id, null);
    }
  };

  const filterTabs: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all',    label: 'All',         count: localInbox.length },
    { key: 'high',   label: 'High risk',   count: localInbox.filter(m => m.risk === 'high').length },
    { key: 'medium', label: 'Medium risk', count: localInbox.filter(m => m.risk === 'medium').length },
    { key: 'low',    label: 'Low risk',    count: localInbox.filter(m => m.risk === 'low').length },
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

      <div className="filter-bar">
        {filterTabs.map((f) => (
          <button key={f.key} className={`chip${filter === f.key ? ' is-active' : ''}`} onClick={() => setFilter(f.key)}>
            {f.label} <span style={{ opacity: 0.7 }}>· {f.count}</span>
          </button>
        ))}
      </div>

      <div className="split-list-detail">
        <div className="card" style={{ position: 'sticky', top: 24 }}>
          <div className="card-head">
            <div>
              <h2>Messages</h2>
              <div className="sub">{filtered.length} total · sorted by risk</div>
            </div>
          </div>
          <div className="card-body tight inbox-list">
            {filtered.map((m) => (
              <InboxCard key={m.id} m={m} selected={m.id === selected?.id} onSelect={() => setSelectedId(m.id)} />
            ))}
          </div>
        </div>

        {selected && (
          <DetailPanel
            msg={selected}
            staffDraft={staffDrafts[selected.id] ?? null}
            editedText={editedTexts[selected.id] ?? null}
            isRegenerating={regeneratingId === selected.id}
            isEditing={editingMsgId === selected.id}
            editText={editText}
            loadingAction={loadingActions[selected.id] ?? null}
            onRegenerate={() => handleRegenerate(selected)}
            onEditStart={() => handleEditStart(selected)}
            onEditChange={setEditText}
            onEditSave={() => handleEditSave(selected)}
            onEditCancel={() => setEditingMsgId(null)}
            onApprove={() => handleApprove(selected)}
            onAssign={() => handleAssign(selected)}
            onEscalate={() => handleEscalate(selected)}
            onResolve={() => handleResolve(selected)}
            toast={toast}
          />
        )}
      </div>
    </div>
  );
}

// ── DetailPanel ───────────────────────────────────────────────────────────────

interface DetailPanelProps {
  msg:              InboxMessage;
  staffDraft:       StaffFollowupDraftClientResult | null;
  editedText:       string | null;
  isRegenerating:   boolean;
  isEditing:        boolean;
  editText:         string;
  loadingAction:    ActionName | null;
  onRegenerate:     () => void;
  onEditStart:      () => void;
  onEditChange:     (text: string) => void;
  onEditSave:       () => void;
  onEditCancel:     () => void;
  onApprove:        () => void;
  onAssign:         () => void;
  onEscalate:       () => void;
  onResolve:        () => void;
  toast:            { text: string; isError: boolean } | null;
}

function formatPreparedFor(role: string | undefined, routeTo: string): string {
  const r = (role ?? routeTo).toLowerCase().replace('_', ' ');
  const labels: Record<string, string> = {
    billing: 'Billing', 'front desk': 'Front Desk', clinician: 'Clinician',
    'office manager': 'Office Manager', staff: 'Staff',
  };
  return labels[r] ?? (r.charAt(0).toUpperCase() + r.slice(1));
}

function DetailPanel({
  msg, staffDraft, editedText, isRegenerating,
  isEditing, editText, loadingAction,
  onRegenerate, onEditStart, onEditChange, onEditSave, onEditCancel,
  onApprove, onAssign, onEscalate, onResolve, toast,
}: DetailPanelProps) {
  const effectiveDraftText   = editedText ?? staffDraft?.draftText ?? msg.draft;
  const requiresClinicianApproval = staffDraft?.requiresClinicianApproval ?? (msg.risk === 'high' && msg.routeTo === 'Clinician');
  const missingInformation   = staffDraft?.missingInformation ?? [];
  const preparedFor          = formatPreparedFor(staffDraft?.intendedSenderRole, msg.routeTo);
  const isBusy               = loadingAction !== null;

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>Staff follow-up draft</span>
            <span style={{ fontSize: 11.5, color: 'var(--fg3)', fontWeight: 500 }}>
              Prepared for: {preparedFor}
            </span>
          </div>
          <div>
            {requiresClinicianApproval
              ? <Badge tone="red" dot>Clinician approval required</Badge>
              : <Badge tone="amber" dot>Ready for staff approval</Badge>
            }
          </div>
        </div>

        {isRegenerating ? (
          <div className="detail-draft" style={{ color: 'var(--fg3)', fontStyle: 'italic' }}>
            Generating staff follow-up draft…
          </div>
        ) : isEditing ? (
          <textarea
            value={editText}
            onChange={e => onEditChange(e.target.value)}
            className="detail-draft"
            style={{ width: '100%', resize: 'vertical', minHeight: 120, fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 1.6 }}
          />
        ) : (
          <div className="detail-draft">{effectiveDraftText}</div>
        )}

        {missingInformation.length > 0 && !isEditing && (
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
          {isEditing ? (
            <>
              <Button variant="primary" size="sm" onClick={onEditSave} disabled={loadingAction === 'edit_save'}>
                {loadingAction === 'edit_save' ? 'Saving…' : 'Save edit'}
              </Button>
              <Button variant="ghost" size="sm" onClick={onEditCancel} disabled={loadingAction === 'edit_save'}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={onEditStart} disabled={isBusy}>
                <IconEdit size={13} /> Edit draft
              </Button>
              <Button variant="ghost" size="sm" onClick={onRegenerate} disabled={isRegenerating || isBusy}>
                <IconRefresh size={13} /> {isRegenerating ? 'Generating…' : 'Regenerate'}
              </Button>
            </>
          )}
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
        <Button variant="ghost" size="sm" onClick={onApprove} disabled={isBusy}>
          <IconCheckCircle size={14} />
          {loadingAction === 'approve' ? 'Approving…' : 'Approve draft'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onEditStart} disabled={isBusy}>
          <IconEdit size={14} /> Edit draft
        </Button>
        <Button
          variant={msg.risk === 'high' ? 'sage' : 'secondary'}
          size="sm"
          onClick={onAssign}
          disabled={isBusy}
        >
          <IconStethoscope size={14} />
          {loadingAction === 'assign' ? 'Assigning…' : `Assign to ${msg.routeTo}`}
        </Button>
        <Button variant="ghost" size="sm" onClick={onEscalate} disabled={isBusy}>
          <IconAlert size={14} />
          {loadingAction === 'escalate' ? 'Escalating…' : 'Escalate'}
        </Button>
        <div className="spacer" />
        <Button variant="secondary" size="sm" onClick={onResolve} disabled={isBusy}>
          {loadingAction === 'resolve' ? 'Resolving…' : 'Mark resolved'}
        </Button>
      </div>

      {toast && (
        <div style={{
          position: 'absolute', bottom: 78, right: 22,
          background: toast.isError ? '#B91C1C' : 'var(--forest-ink)',
          color: 'white',
          padding: '10px 14px', borderRadius: 12,
          fontSize: 13, fontWeight: 600,
          boxShadow: 'var(--shadow-elevated)',
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'fadeIn 180ms ease',
        }}>
          {toast.isError ? <IconAlert size={14} /> : <IconCheckCircle size={14} />}
          {toast.text}
        </div>
      )}
    </div>
  );
}

// ── InboxCard ─────────────────────────────────────────────────────────────────

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
