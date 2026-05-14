'use client';

import React, { useState, useRef, useEffect } from 'react';
import { COMMAND_CHAT_SEED, COMMAND_ACTIONS, COMMAND_QUICKS } from '@/data/mockMessages';
import type { CommandChatMessage, CommandAction, StageLog, BackofficeBlockerSummary, BackofficeCreatedItemSummary } from '@/types';
import type { Tone } from '@/types';
import { Button, Badge, IconTile, Dot } from './Primitives';
import {
  IconBook, IconClock, IconSparkles, IconSend, IconPlus,
  IconBot, IconCheckCircle, IconLayers, IconAlert,
} from './Icons';

// ── API response type ─────────────────────────────────────────────────────────

interface BackofficeApiResponse {
  command_type: string;
  patient_match: string | null;
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

// ── Action card builder ───────────────────────────────────────────────────────

function roleTone(role: string): Tone {
  if (role === 'clinician')     return 'red';
  if (role === 'billing')       return 'amber';
  if (role === 'front_desk')    return 'sage';
  return 'cream';
}

function priorityTone(p: string): Tone {
  if (p === 'urgent') return 'red';
  if (p === 'high')   return 'amber';
  return 'neutral';
}

function buildActionCards(data: BackofficeApiResponse): CommandAction[] {
  const cards: CommandAction[] = [];
  const ts = Date.now();

  // Blockers
  for (const [i, b] of (data.blockers ?? []).entries()) {
    const tone: Tone = b.severity === 'high' ? 'red' : b.severity === 'medium' ? 'amber' : 'sage';
    cards.push({
      id: `bl-${ts}-${i}`,
      iconKey: 'alert',
      tone,
      title: b.description.slice(0, 70),
      badges: [
        { label: `${b.severity.charAt(0).toUpperCase() + b.severity.slice(1)} severity`, tone },
        { label: 'Blocker', tone: 'neutral' },
      ],
      rows: [
        { k: 'Type',    v: b.type.replace(/_/g, ' ') },
        { k: 'Patient', v: data.patient_match ?? 'N/A' },
      ],
    });
  }

  // Recommended actions
  for (const [i, a] of (data.recommended_actions ?? []).entries()) {
    if (a.type === 'no_action') continue;
    const iconKey = a.type === 'create_task' ? 'clipboard' : a.type.includes('draft') ? 'edit' : 'file';
    cards.push({
      id: `ra-${ts}-${i}`,
      iconKey,
      tone: roleTone(a.assigned_role),
      title: a.title,
      badges: [
        { label: a.priority.charAt(0).toUpperCase() + a.priority.slice(1), tone: priorityTone(a.priority) },
        { label: a.requires_approval ? 'Needs approval' : 'Auto', tone: a.requires_approval ? 'amber' : 'sage' },
      ],
      rows: [
        { k: 'Role', v: a.assigned_role.replace(/_/g, ' ') },
        { k: 'Why',  v: a.description.slice(0, 60) },
      ],
    });
  }

  // Drafts
  for (const [i, d] of (data.drafts ?? []).entries()) {
    cards.push({
      id: `dr-${ts}-${i}`,
      iconKey: 'edit',
      tone:    'sage',
      title:   d.title,
      badges: [
        { label: 'Draft ready', tone: 'sage' },
        { label: d.draft_type.replace(/_/g, ' '), tone: 'neutral' },
      ],
      rows: [
        { k: 'Type',    v: d.draft_type.replace(/_/g, ' ') },
        { k: 'Patient', v: data.patient_match ?? 'N/A' },
      ],
    });
  }

  // Created tasks
  for (const [i, item] of (data.created_items ?? []).entries()) {
    if (item.type === 'task' && item.status === 'created') {
      cards.push({
        id: `ct-${ts}-${i}`,
        iconKey: 'clipboard',
        tone:    'forest',
        title:   item.title,
        badges: [
          { label: 'Task created', tone: 'sage' },
          { label: 'Pending approval', tone: 'cream' },
        ],
        rows: [
          { k: 'Created by', v: 'ClinicOps AI' },
          { k: 'Patient',    v: data.patient_match ?? 'N/A' },
        ],
      });
    }
  }

  return cards;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BackOfficeCommandCenter() {
  const [chat, setChat]       = useState<CommandChatMessage[]>(COMMAND_CHAT_SEED);
  const [actions, setActions] = useState<CommandAction[]>(COMMAND_ACTIONS);
  const [input, setInput]     = useState('');
  const [thinking, setThinking] = useState(false);
  const [flashIds, setFlashIds] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chat, thinking]);

  const flash = (ids: string[]) => {
    setFlashIds(ids);
    setTimeout(() => setFlashIds([]), 1400);
  };

  const t = () => new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const respondTo = async (text: string) => {
    const msgTime = t();
    setChat(c => [...c, { who: 'staff', text, t: msgTime }]);
    setThinking(true);

    try {
      const res = await fetch('/api/backoffice-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command:  text,
          clinicId: 'a0000000-0000-0000-0000-000000000001',
        }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);

      const data = await res.json() as BackofficeApiResponse;

      setChat(c => [...c, {
        who:          'bot',
        text:         data.assistant_response,
        t:            t(),
        stageLogs:    data.stage_logs,
        blockers:     data.blockers,
        createdItems: data.created_items,
      }]);

      const newCards = buildActionCards(data);
      if (newCards.length > 0) {
        setActions(prev => [...newCards, ...prev]);
        flash(newCards.map(c => c.id));
      }

    } catch (err) {
      console.error('[BackOfficeCommandCenter] API error:', err);
      setChat(c => [...c, {
        who:  'bot',
        text: 'Something went wrong. Please try again.',
        t:    t(),
      }]);
    } finally {
      setThinking(false);
    }
  };

  const send = () => {
    if (!input.trim()) return;
    respondTo(input.trim());
    setInput('');
  };

  return (
    <div className="screen-enter" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div>
          <h1>Back-Office Command Center</h1>
          <p className="lede">Ask in plain English. ClinicOps will turn requests into tasks, drafts, and worklists — non-technical staff stay in control.</p>
        </div>
        <div className="actions">
          <Button variant="secondary" size="sm"><IconBook size={14} /> Prompt library</Button>
          <Button variant="secondary" size="sm"><IconClock size={14} /> Activity log</Button>
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
                <div className="sub" style={{ marginTop: 2 }}>Plain-English back-office operations · audited</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                <Badge tone="sage" dot>Live</Badge>
                <Badge tone="neutral">{new Date().toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</Badge>
              </div>
            </div>
          </div>

          <div className="ch-body" ref={scrollRef}>
            {chat.map((m, i) => (
              <CmdMsg key={i} m={m} />
            ))}
            {thinking && (
              <div className="chat-msg bot">
                <div className="av"><IconBot size={14} /></div>
                <div className="bub">
                  <div className="who">ClinicOps</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--fg3)', fontSize: 13 }}>
                    <Dot delay={0} /><Dot delay={120} /><Dot delay={240} />
                    <span style={{ marginLeft: 4 }}>Working on it…</span>
                  </div>
                </div>
              </div>
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

        {/* Generated actions */}
        <div className="card">
          <div className="card-head">
            <div>
              <h2>Generated actions</h2>
              <div className="sub">{actions.length} items · created by ClinicOps · awaiting human approval where required</div>
            </div>
            <Button variant="ghost" size="sm"><IconPlus size={13} /> Add manually</Button>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {actions.map((a) => (
              <ActionCard key={a.id} a={a} flash={flashIds.includes(a.id)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CmdMsg ────────────────────────────────────────────────────────────────────

function CmdMsg({ m }: { m: CommandChatMessage }) {
  const isStaff = m.who === 'staff';
  return (
    <div className={`chat-msg ${isStaff ? 'staff' : 'bot'}`}>
      <div className="av">
        {isStaff ? 'JK' : <IconBot size={14} />}
      </div>
      <div className="bub">
        <div className="who">{isStaff ? 'Jordan · Office manager' : 'ClinicOps'}</div>

        {/* Activity trail — only for bot messages with real stage logs */}
        {!isStaff && m.stageLogs && m.stageLogs.length > 0 && (
          <ActivityTrail logs={m.stageLogs} />
        )}

        {/* Main response text */}
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{m.text}</div>

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

// ── Activity trail ────────────────────────────────────────────────────────────

function ActivityTrail({ logs }: { logs: StageLog[] }) {
  const visible = logs.filter(l => l.status !== 'started');
  if (visible.length === 0) return null;

  return (
    <div style={{
      marginBottom: 10,
      paddingBottom: 10,
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
    }}>
      {visible.map((l, i) => {
        const isFailed    = l.status === 'failed';
        const isCompleted = l.status === 'completed';
        return (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 6,
            fontSize: 12.5,
            color: isFailed ? '#A03A2D' : 'var(--fg2)',
          }}>
            <span style={{
              fontWeight: 700,
              color: isFailed ? '#A03A2D' : 'var(--sage-deep)',
              flexShrink: 0,
              width: 14,
              textAlign: 'center',
            }}>
              {isFailed ? '✗' : isCompleted ? '✓' : '·'}
            </span>
            <span style={{ fontWeight: 500 }}>{l.label}</span>
            {l.details && (
              <span style={{ color: 'var(--fg3)', fontSize: 11.5 }}>· {l.details}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Created items summary ─────────────────────────────────────────────────────

function CreatedItemsSummary({ items }: { items: BackofficeCreatedItemSummary[] }) {
  const tasks  = items.filter(i => i.type === 'task'  && i.status === 'created');
  const drafts = items.filter(i => i.type === 'draft' && i.status === 'prepared');
  if (tasks.length === 0 && drafts.length === 0) return null;

  const parts: string[] = [];
  if (tasks.length)  parts.push(`${tasks.length} task${tasks.length > 1 ? 's' : ''} created`);
  if (drafts.length) parts.push(`${drafts.length} draft${drafts.length > 1 ? 's' : ''} prepared`);

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
      {parts.join(' · ')} → see actions panel
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
