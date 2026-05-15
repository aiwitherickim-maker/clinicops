'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { COMMAND_CHAT_SEED, COMMAND_QUICKS } from '@/data/mockMessages';
import type {
  CommandChatMessage, CommandAction, StageLog,
  BackofficeBlockerSummary, BackofficeCreatedItemSummary,
  PatientCandidateInfo, PatientConfirmationData,
} from '@/types';
import type { Tone } from '@/types';

// ── DB message → chat message ─────────────────────────────────────────────────

interface DbChatMsg {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  stage_logs: unknown[];
  metadata: Record<string, unknown>;
  created_at: string;
}

function dbMsgToChat(m: DbChatMsg): CommandChatMessage {
  return {
    who:          m.role === 'user' ? 'staff' : 'bot',
    text:         m.content,
    t:            new Date(m.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    stageLogs:    m.role === 'assistant' ? (m.stage_logs as StageLog[]) : undefined,
    blockers:     (m.metadata?.blockers as BackofficeBlockerSummary[]) ?? undefined,
    createdItems: (m.metadata?.created_items as BackofficeCreatedItemSummary[]) ?? undefined,
    // patientConfirmation intentionally omitted — stale for historical messages
  };
}
import { Button, Badge, IconTile, Dot } from './Primitives';
import {
  IconSparkles, IconSend,
  IconBot, IconCheckCircle, IconLayers, IconAlert,
} from './Icons';

// ── API response type ─────────────────────────────────────────────────────────

interface BackofficeApiResponse {
  command_type: string;
  patient_match: string | null;
  patient_match_info: {
    status: 'matched' | 'needs_confirmation' | 'ambiguous' | 'not_found';
    query: string;
    selected_patient: { id: string; full_name: string } | null;
    candidates: { id: string; full_name: string }[];
  } | null;
  case_summary: {
    patient_name: string | null;
    appointment:  string | null;
    insurance:    string | null;
    procedure:    string | null;
    prior_auth:   string | null;
    billing_case: string | null;
  };
  blockers: BackofficeBlockerSummary[];
  recommended_actions: {
    type: string;
    title: string;
    description: string;
    assigned_role: string;
    priority: string;
    requires_approval: boolean;
  }[];
  created_items: BackofficeCreatedItemSummary[];
  drafts: { draft_type: string; title: string; text: string }[];
  assistant_response: string;
  audit_notes: string;
  stage_logs: StageLog[];
}

// ── Workup output ─────────────────────────────────────────────────────────────

interface WorkupOutput {
  blockers:    CommandAction[];
  tasks:       CommandAction[];
  drafts:      CommandAction[];
  suggestions: CommandAction[]; // recommended_actions only when no tasks created
}

const EMPTY_WORKUP: WorkupOutput = { blockers: [], tasks: [], drafts: [], suggestions: [] };

function roleTone(role: string): Tone {
  if (role === 'clinician')  return 'red';
  if (role === 'billing')    return 'amber';
  if (role === 'front_desk') return 'sage';
  return 'cream';
}

function priorityTone(p: string): Tone {
  if (p === 'urgent') return 'red';
  if (p === 'high')   return 'amber';
  return 'neutral';
}

function buildWorkupOutput(data: BackofficeApiResponse): WorkupOutput {
  const ts = Date.now();
  const hasTasks = (data.created_items ?? []).some(i => i.type === 'task' && i.status === 'created');

  const blockers: CommandAction[] = (data.blockers ?? []).map((b, i) => {
    const tone: Tone = b.severity === 'high' ? 'red' : b.severity === 'medium' ? 'amber' : 'sage';
    return {
      id: `bl-${ts}-${i}`,
      iconKey: 'alert',
      tone,
      title: b.description.slice(0, 90),
      badges: [
        { label: `${b.severity.charAt(0).toUpperCase() + b.severity.slice(1)} severity`, tone },
        { label: b.type.replace(/_/g, ' '), tone: 'neutral' as Tone },
      ],
      rows: [{ k: 'Patient', v: data.patient_match ?? 'N/A' }],
    };
  });

  const tasks: CommandAction[] = (data.created_items ?? [])
    .filter(item => item.type === 'task' && item.status === 'created')
    .map((item, i) => ({
      id: `ct-${ts}-${i}`,
      iconKey: 'clipboard',
      tone: 'forest' as Tone,
      title: item.title,
      badges: [
        { label: 'Task created',     tone: 'sage'   as Tone },
        { label: 'Pending approval', tone: 'cream'  as Tone },
      ],
      rows: [
        { k: 'Created by', v: 'ClinicOps AI' },
        { k: 'Patient',    v: data.patient_match ?? 'N/A' },
      ],
    }));

  const savedDraftTitles = new Set(
    (data.created_items ?? []).filter(ci => ci.type === 'draft' && ci.status === 'saved').map(ci => ci.title),
  );
  const drafts: CommandAction[] = (data.drafts ?? []).map((d, i) => {
    const wasSaved = savedDraftTitles.has(d.title);
    return {
      id: `dr-${ts}-${i}`,
      iconKey: 'file',
      tone:    'sage' as Tone,
      title:   d.title,
      badges: [
        { label: wasSaved ? 'Draft saved' : 'Draft prepared', tone: (wasSaved ? 'sage' : 'cream') as Tone },
        { label: d.draft_type.replace(/_/g, ' '), tone: 'neutral' as Tone },
      ],
      rows: [
        { k: 'Type',    v: d.draft_type.replace(/_/g, ' ') },
        { k: 'Patient', v: data.patient_match ?? 'N/A' },
      ],
    };
  });

  // Show recommended_actions only when the execution agent didn't create tasks from them
  const suggestions: CommandAction[] = hasTasks ? [] : (data.recommended_actions ?? [])
    .filter(a => a.type !== 'no_action')
    .map((a, i) => {
      const iconKey = a.type === 'create_task' ? 'clipboard' : a.type.includes('draft') ? 'edit' : 'file';
      return {
        id: `ra-${ts}-${i}`,
        iconKey,
        tone: roleTone(a.assigned_role),
        title: a.title,
        badges: [
          { label: a.priority.charAt(0).toUpperCase() + a.priority.slice(1), tone: priorityTone(a.priority) },
          { label: a.requires_approval ? 'Needs approval' : 'Auto', tone: (a.requires_approval ? 'amber' : 'sage') as Tone },
        ],
        rows: [
          { k: 'Role', v: a.assigned_role.replace(/_/g, ' ') },
          { k: 'Why',  v: a.description.slice(0, 60) },
        ],
      };
    });

  return { blockers, tasks, drafts, suggestions };
}

function workupSubtitle(w: WorkupOutput): string {
  const parts: string[] = [];
  if (w.blockers.length)    parts.push(`${w.blockers.length} blocker${w.blockers.length !== 1 ? 's' : ''} found`);
  if (w.tasks.length)       parts.push(`${w.tasks.length} task${w.tasks.length !== 1 ? 's' : ''} created`);
  if (w.drafts.length)      parts.push(`${w.drafts.length} draft${w.drafts.length !== 1 ? 's' : ''} saved`);
  if (w.suggestions.length) parts.push(`${w.suggestions.length} suggestion${w.suggestions.length !== 1 ? 's' : ''}`);
  const needsApproval = w.tasks.some(t => t.badges.some(b => b.label === 'Pending approval'));
  if (needsApproval) parts.push('staff approval required');
  return parts.length ? parts.join(' · ') : 'Run a command to see results';
}

const BO_CLEARED_KEY = 'clinicops_bo_cleared_at';

function ResetButton({ onClick, label }: { onClick: () => void; label: string }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontSize: 12.5,
        fontWeight: 500,
        padding: '5px 12px',
        borderRadius: 8,
        border: '1px solid var(--border)',
        background: hovered ? 'var(--shell)' : 'transparent',
        color: hovered ? 'var(--fg2)' : 'var(--fg3)',
        cursor: 'pointer',
        outline: 'none',
        transition: 'background 150ms, color 150ms',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

// ── Execution trace ───────────────────────────────────────────────────────────

interface ExecutionStep {
  label: string;
  details?: string;
  status: string;
}

interface ExecutionRun {
  steps: ExecutionStep[];
  running: boolean;
  summary: string | null;
  expanded: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BackOfficeCommandCenter() {
  const [chat, setChat]     = useState<CommandChatMessage[]>(COMMAND_CHAT_SEED);
  const [workup, setWorkup] = useState<WorkupOutput>(EMPTY_WORKUP);
  const [input, setInput]     = useState('');
  const [thinking, setThinking]         = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [flashIds, setFlashIds]         = useState<string[]>([]);
  const [currentExecution, setCurrentExecution] = useState<ExecutionRun | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    originalCommand: string;
    status: 'needs_confirmation' | 'ambiguous';
    candidates: PatientCandidateInfo[];
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleClearHistory = () => {
    if (!window.confirm('Clear command history? The command center will reset to an empty state.')) return;
    localStorage.setItem(BO_CLEARED_KEY, new Date().toISOString());
    setChat([]);
    setWorkup(EMPTY_WORKUP);
  };

  // Load persisted history on mount
  const loadHistory = useCallback(async () => {
    try {
      const after = localStorage.getItem(BO_CLEARED_KEY);
      const url = '/api/backoffice-chat-messages?clinicId=a0000000-0000-0000-0000-000000000001&limit=100'
        + (after ? `&after=${encodeURIComponent(after)}` : '');
      const res = await fetch(url);
      if (!res.ok) return;
      const json = await res.json() as { messages: DbChatMsg[] };
      if (json.messages && json.messages.length > 0) {
        setChat(json.messages.map(dbMsgToChat));
        setWorkup(EMPTY_WORKUP);
      }
    } catch {
      // Keep seed data on error — non-critical
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chat, thinking, currentExecution?.steps.length]);

  const flash = (ids: string[]) => {
    setFlashIds(ids);
    setTimeout(() => setFlashIds([]), 1400);
  };

  const t = () => new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const callBackofficeApi = async (command: string, confirmedPatientName?: string) => {
    setThinking(true);
    setCurrentExecution({ steps: [], running: true, summary: null, expanded: true });

    try {
      const res = await fetch('/api/backoffice-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command,
          clinicId: 'a0000000-0000-0000-0000-000000000001',
          confirmedPatientName,
        }),
      });

      if (!res.ok || !res.body) throw new Error(`API error ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult: BackofficeApiResponse | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line) as { t: string; [k: string]: unknown };
            if (msg.t === 'step') {
              const step: ExecutionStep = {
                label:   msg.label   as string,
                details: msg.details as string | undefined,
                status:  msg.status  as string,
              };
              setCurrentExecution(prev => prev ? { ...prev, steps: [...prev.steps, step] } : null);
            } else if (msg.t === 'done') {
              finalResult = msg.data as BackofficeApiResponse;
            }
          } catch { /* skip malformed lines */ }
        }
      }

      if (finalResult) {
        const data = finalResult;
        const matchInfo = data.patient_match_info;
        let patientConfirmation: PatientConfirmationData | undefined;

        if (matchInfo && (matchInfo.status === 'needs_confirmation' || matchInfo.status === 'ambiguous')) {
          patientConfirmation = {
            status:          matchInfo.status,
            query:           matchInfo.query,
            candidates:      matchInfo.candidates,
            originalCommand: command,
          };
          setPendingConfirmation({
            originalCommand: command,
            status:          matchInfo.status,
            candidates:      matchInfo.candidates,
          });
        } else {
          setPendingConfirmation(null);
        }

        // Chat gets only the final assistant response — no stage logs
        setChat(c => [...c, {
          who:                'bot',
          text:               data.assistant_response,
          t:                  t(),
          blockers:           data.blockers,
          createdItems:       data.created_items,
          patientConfirmation,
        }]);

        const newWorkup = buildWorkupOutput(data);
        setWorkup(prev => ({
          blockers:    [...newWorkup.blockers,    ...prev.blockers],
          tasks:       [...newWorkup.tasks,       ...prev.tasks],
          drafts:      [...newWorkup.drafts,      ...prev.drafts],
          suggestions: [...newWorkup.suggestions, ...prev.suggestions],
        }));
        const allNewIds = [
          ...newWorkup.blockers, ...newWorkup.tasks,
          ...newWorkup.drafts, ...newWorkup.suggestions,
        ].map(c => c.id);
        if (allNewIds.length) flash(allNewIds);

        // Collapse execution trace to summary
        const draftsCount = (data.created_items ?? []).filter(i => i.type === 'draft' && i.status === 'saved').length;
        const tasksCount  = (data.created_items ?? []).filter(i => i.type === 'task'  && i.status === 'created').length;
        setCurrentExecution(prev => {
          if (!prev) return null;
          const n = prev.steps.length;
          const parts: string[] = [`${n} step${n !== 1 ? 's' : ''}`];
          if (draftsCount > 0) parts.push(`${draftsCount} draft${draftsCount !== 1 ? 's' : ''} saved`);
          if (tasksCount  > 0) parts.push(`${tasksCount} task${tasksCount !== 1 ? 's' : ''} created`);
          return { ...prev, running: false, expanded: false, summary: `Run completed · ${parts.join(' · ')}` };
        });
      } else {
        setCurrentExecution(prev => prev
          ? { ...prev, running: false, expanded: false, summary: 'Run ended' }
          : null,
        );
      }
    } catch (err) {
      console.error('[BackOfficeCommandCenter] API error:', err);
      setPendingConfirmation(null);
      setChat(c => [...c, { who: 'bot', text: 'Something went wrong. Please try again.', t: t() }]);
      setCurrentExecution(null);
    } finally {
      setThinking(false);
    }
  };

  const respondTo = (text: string) => {
    setChat(c => [...c, { who: 'staff', text, t: t() }]);
    callBackofficeApi(text);
  };

  const confirmPatient = (patientFullName: string) => {
    if (!pendingConfirmation) return;
    const { originalCommand } = pendingConfirmation;
    setPendingConfirmation(null);
    setChat(c => [...c, { who: 'staff', text: `Use ${patientFullName}`, t: t() }]);
    callBackofficeApi(originalCommand, patientFullName);
  };

  const cancelConfirmation = () => {
    setPendingConfirmation(null);
    setChat(c => [...c, { who: 'staff', text: 'Cancel', t: t() }]);
  };

  const send = () => {
    if (!input.trim() || thinking) return;
    const text = input.trim();
    setInput('');

    if (pendingConfirmation?.status === 'needs_confirmation') {
      if (/^(yes|yeah|yep|ok|okay|confirm|use )/i.test(text)) {
        confirmPatient(pendingConfirmation.candidates[0].full_name);
        return;
      }
    }

    respondTo(text);
  };

  return (
    <div className="screen-enter" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div>
          <h1>Back-Office Command Center</h1>
          <p className="lede">Ask in plain English. ClinicOps will turn requests into tasks, drafts, and worklists — non-technical staff stay in control.</p>
        </div>
        <div className="actions">
          <ResetButton onClick={handleClearHistory} label="Clear history" />
        </div>
      </div>

      <div className="split-2col">
        {/* Chat */}
        <div className="chat-shell">
          <div className="ch-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <IconTile tone="forest" iconKey="terminal" />
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>ClinicOps</h2>
                <div className="sub" style={{ marginTop: 2 }}>Ask ClinicOps to create tasks, draft messages, and organize follow-ups.</div>
              </div>
            </div>
          </div>

          <div className="ch-body" ref={scrollRef}>
            {historyLoading && (
              <div style={{ padding: '10px 18px', fontSize: 12, color: 'var(--fg3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Dot delay={0} /><Dot delay={120} /><Dot delay={240} />
                <span style={{ marginLeft: 2 }}>Loading history…</span>
              </div>
            )}
            {chat.map((m, i) => (
              <CmdMsg
                key={i}
                m={m}
                pendingConfirmation={pendingConfirmation}
                onConfirmPatient={confirmPatient}
                onCancelConfirmation={cancelConfirmation}
              />
            ))}
            {currentExecution && (
              <ExecutionTraceCard
                run={currentExecution}
                onToggleExpand={() => setCurrentExecution(prev =>
                  prev ? { ...prev, expanded: !prev.expanded } : null,
                )}
              />
            )}
          </div>

          <div className="ch-foot">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--shell)', border: '1px solid var(--border)', borderRadius: 12 }}>
                <IconSparkles size={15} style={{ color: 'var(--sage-deep)' }} />
                <input
                  style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 14 }}
                  placeholder="Ask ClinicOps to draft, assign, summarize, or prioritize…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !thinking && send()}
                  disabled={thinking}
                />
              </div>
              <Button variant="primary" onClick={send} disabled={thinking}>
                <IconSend size={14} /> Send
              </Button>
            </div>
            <div className="cb-chips">
              {COMMAND_QUICKS.map((q) => (
                <button key={q} className="chip" onClick={() => !thinking && respondTo(q)} disabled={thinking}>{q}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Workup & tasks */}
        <div className="card">
          <div className="card-head">
            <div>
              <h2>Workup &amp; tasks</h2>
              <div className="sub">{workupSubtitle(workup)}</div>
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {workup.blockers.length === 0 && workup.tasks.length === 0 && workup.drafts.length === 0 && workup.suggestions.length === 0 && (
              <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--fg3)', fontSize: 13 }}>
                Run a command to see results here
              </div>
            )}
            {workup.blockers.length > 0 && (
              <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <PanelSectionHeader label="Blockers found" />
                {workup.blockers.map(a => <BlockerRow key={a.id} a={a} flash={flashIds.includes(a.id)} />)}
              </section>
            )}
            {workup.tasks.length > 0 && (
              <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <PanelSectionHeader label="Tasks created" />
                {workup.tasks.map(a => <ActionCard key={a.id} a={a} flash={flashIds.includes(a.id)} />)}
              </section>
            )}
            {workup.drafts.length > 0 && (
              <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <PanelSectionHeader label="Drafts saved" />
                {workup.drafts.map(a => <ActionCard key={a.id} a={a} flash={flashIds.includes(a.id)} />)}
              </section>
            )}
            {workup.suggestions.length > 0 && (
              <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <PanelSectionHeader label="Suggested actions" />
                {workup.suggestions.map(a => <ActionCard key={a.id} a={a} flash={flashIds.includes(a.id)} />)}
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CmdMsg ────────────────────────────────────────────────────────────────────

function CmdMsg({
  m,
  pendingConfirmation,
  onConfirmPatient,
  onCancelConfirmation,
}: {
  m: CommandChatMessage;
  pendingConfirmation: { originalCommand: string; status: string; candidates: PatientCandidateInfo[] } | null;
  onConfirmPatient: (name: string) => void;
  onCancelConfirmation: () => void;
}) {
  const isStaff = m.who === 'staff';
  const showConfirmButtons =
    !isStaff &&
    m.patientConfirmation != null &&
    pendingConfirmation != null &&
    pendingConfirmation.originalCommand === m.patientConfirmation.originalCommand;

  return (
    <div className={`chat-msg ${isStaff ? 'staff' : 'bot'}`}>
      <div className="av">
        {isStaff ? 'JK' : <IconBot size={14} />}
      </div>
      <div className="bub">
        <div className="who">{isStaff ? 'Jordan · Office manager' : 'ClinicOps'}</div>

        {/* Main response text */}
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{m.text}</div>

        {/* Patient confirmation buttons */}
        {showConfirmButtons && (
          <PatientConfirmationButtons
            data={m.patientConfirmation!}
            onConfirm={onConfirmPatient}
            onCancel={onCancelConfirmation}
          />
        )}

        {/* Inline created-items summary */}
        {!isStaff && m.createdItems && m.createdItems.filter(i => i.status !== 'skipped').length > 0 && (
          <CreatedItemsSummary items={m.createdItems} />
        )}

        {/* Existing action refs badge (seed data) */}
        {!isStaff && m.actionRefs && (
          <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--sage-deep)', fontWeight: 600, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <IconLayers size={11} style={{ verticalAlign: '-1px' }} />
            Created {m.actionRefs.length} action{m.actionRefs.length === 1 ? '' : 's'} →
          </div>
        )}
      </div>
    </div>
  );
}

// ── Patient confirmation buttons ──────────────────────────────────────────────

function PatientConfirmationButtons({
  data,
  onConfirm,
  onCancel,
}: {
  data: PatientConfirmationData;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  return (
    <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {data.candidates.map(c => (
        <Button key={c.id} variant="sage" size="sm" onClick={() => onConfirm(c.full_name)}>
          Use {c.full_name}
        </Button>
      ))}
      <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
    </div>
  );
}

// ── Execution trace card ──────────────────────────────────────────────────────

function ExecutionTraceCard({ run, onToggleExpand }: { run: ExecutionRun; onToggleExpand: () => void }) {
  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
      background: 'var(--paper)',
      fontSize: 12.5,
      alignSelf: 'stretch',
    }}>
      {/* Header row — clickable after completion to toggle expand */}
      <div
        role={run.running ? undefined : 'button'}
        tabIndex={run.running ? undefined : 0}
        onClick={run.running ? undefined : onToggleExpand}
        onKeyDown={run.running ? undefined : (e) => e.key === 'Enter' && onToggleExpand()}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          cursor: run.running ? 'default' : 'pointer',
          userSelect: 'none',
        }}
      >
        {run.running ? (
          <span style={{ display: 'inline-flex', gap: 4 }}>
            <Dot delay={0} /><Dot delay={120} /><Dot delay={240} />
          </span>
        ) : (
          <span style={{ color: 'var(--sage-deep)', fontWeight: 700, fontSize: 12 }}>✓</span>
        )}
        <span style={{ color: run.running ? 'var(--fg3)' : 'var(--fg2)', fontWeight: 500, fontSize: 12.5 }}>
          {run.running
            ? (run.steps.length > 0
                ? run.steps[run.steps.length - 1].label + '…'
                : 'Starting…')
            : run.summary}
        </span>
        {!run.running && (
          <span style={{ marginLeft: 'auto', color: 'var(--fg3)', fontSize: 11 }}>
            {run.expanded ? '▲' : '▼'}
          </span>
        )}
      </div>

      {/* Step list — visible while running, or when manually expanded */}
      {(run.running || run.expanded) && run.steps.length > 0 && (
        <div style={{
          borderTop: '1px solid var(--border)',
          padding: '7px 12px 9px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          background: 'var(--shell)',
        }}>
          {run.steps.map((step, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
                animation: 'fadeIn 180ms ease-in',
              }}
            >
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: step.status === 'failed' ? '#A03A2D' : 'var(--sage-deep)',
                width: 12,
                textAlign: 'center',
                flexShrink: 0,
              }}>
                {step.status === 'failed' ? '✗' : '✓'}
              </span>
              <span style={{ color: step.status === 'failed' ? '#A03A2D' : 'var(--fg2)' }}>
                {step.label}
              </span>
              {step.details && (
                <span style={{ color: 'var(--fg3)', fontSize: 11.5 }}>· {step.details}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Created items summary ─────────────────────────────────────────────────────

function CreatedItemsSummary({ items }: { items: BackofficeCreatedItemSummary[] }) {
  const tasks        = items.filter(i => i.type === 'task'  && i.status === 'created');
  const savedDrafts  = items.filter(i => i.type === 'draft' && i.status === 'saved');
  const prepedDrafts = items.filter(i => i.type === 'draft' && i.status === 'prepared');
  if (tasks.length === 0 && savedDrafts.length === 0 && prepedDrafts.length === 0) return null;

  const parts: string[] = [];
  if (tasks.length)        parts.push(`${tasks.length} task${tasks.length > 1 ? 's' : ''} created`);
  if (savedDrafts.length)  parts.push(`${savedDrafts.length} draft${savedDrafts.length > 1 ? 's' : ''} saved → Drafts`);
  if (prepedDrafts.length) parts.push(`${prepedDrafts.length} draft${prepedDrafts.length > 1 ? 's' : ''} prepared (not saved)`);

  return (
    <div style={{
      marginTop: 10,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 11.5,
      color: 'var(--sage-deep)',
      fontWeight: 600,
    }}>
      <IconCheckCircle size={12} />
      {parts.join(' · ')}
    </div>
  );
}

// ── Panel section header ──────────────────────────────────────────────────────

function PanelSectionHeader({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: 10.5,
      fontWeight: 700,
      letterSpacing: '0.07em',
      textTransform: 'uppercase',
      color: 'var(--fg3)',
      paddingBottom: 6,
      borderBottom: '1px solid var(--border-muted)',
    }}>
      {label}
    </div>
  );
}

// ── Blocker row (no action buttons — these are findings, not tasks) ────────────

function BlockerRow({ a, flash }: { a: CommandAction; flash: boolean }) {
  return (
    <div className={`action-card${flash ? ' flash' : ''}`} style={{ padding: '10px 14px' }}>
      <IconTile tone={a.tone} iconKey={a.iconKey} size="sm" />
      <div className="body">
        <div className="ac-head">
          <span className="ac-title">{a.title}</span>
          {a.badges.map((b, i) => (
            <Badge key={i} tone={b.tone} dot={b.tone === 'red' || b.tone === 'amber'}>{b.label}</Badge>
          ))}
        </div>
        <div className="ac-row">
          {a.rows.map((r, i) => (
            <span key={i}><span className="muted">{r.k}:</span> <span className="v">{r.v}</span></span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── ActionCard ────────────────────────────────────────────────────────────────

function ActionCard({ a, flash }: { a: CommandAction; flash: boolean }) {
  return (
    <div className={`action-card${flash ? ' flash' : ''}`}>
      <IconTile tone={a.tone} iconKey={a.iconKey} />
      <div className="body">
        <div className="ac-head">
          <span className="ac-title">{a.title}</span>
          {a.badges.map((b, i) => (
            <Badge key={i} tone={b.tone} dot={b.tone === 'red' || b.tone === 'amber'}>{b.label}</Badge>
          ))}
        </div>
        <div className="ac-row">
          {a.rows.map((r, i) => (
            <span key={i}><span className="muted">{r.k}:</span> <span className="v">{r.v}</span></span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <Button variant="ghost" size="sm">View</Button>
          <Button variant="ghost" size="sm">Reassign</Button>
          {a.badges.some(b => b.label.toLowerCase().includes('pending') || b.label.toLowerCase().includes('needs')) && (
            <Button variant="sage" size="sm"><IconCheckCircle size={13} /> Approve</Button>
          )}
        </div>
      </div>
    </div>
  );
}
