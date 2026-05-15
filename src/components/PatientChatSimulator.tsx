'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CLINIC } from '@/data/mockClinic';
import { SIM_CONVERSATIONS } from '@/data/mockMessages';
import type { ChatMessage, WorkflowStep, ResponseType } from '@/types';
import { Badge, IconTile, ConfidenceMini, Dot } from './Primitives';
import { IconSend, IconLayers } from './Icons';
import { analyzePatientMessageAndPersist } from '@/services/agentService';

const CHAT_RESET_KEY = 'clinicops_chat_reset_at';

interface PatientHistoryItem {
  patientMessage: { text: string; t: string; patientName: string };
  assistantMessage: { text: string; t: string; responseType: string; badgeText: string } | null;
  workflow: WorkflowStep | null;
}

export function PatientChatSimulator() {
  const seed = SIM_CONVERSATIONS[0];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [workflow, setWorkflow] = useState<WorkflowStep>(seed.workflow);
  const [showWorkflow, setShowWorkflow] = useState(true);
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [patientName, setPatientName] = useState('Simulator Patient');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleReset = () => {
    if (!window.confirm('Reset chat? The default starter conversation will be restored.')) return;
    const now = new Date().toISOString();
    localStorage.setItem(CHAT_RESET_KEY, now);
    setMessages(SIM_CONVERSATIONS[0].initialMessages);
    setWorkflow(SIM_CONVERSATIONS[0].workflow);
  };

  const loadHistory = useCallback(async () => {
    try {
      const after = localStorage.getItem(CHAT_RESET_KEY);
      const url = '/api/patient-chat-messages?clinicId=a0000000-0000-0000-0000-000000000001'
        + (after ? `&after=${encodeURIComponent(after)}` : '');
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const items = await res.json() as PatientHistoryItem[];

      if (!items.length) {
        setMessages(SIM_CONVERSATIONS[0].initialMessages);
        return;
      }

      const msgs: ChatMessage[] = [];
      let lastWorkflow: WorkflowStep | null = null;

      for (const item of items) {
        msgs.push({ who: 'patient', text: item.patientMessage.text, t: item.patientMessage.t });
        if (item.assistantMessage) {
          msgs.push({
            who: 'assistant',
            text: item.assistantMessage.text,
            t: item.assistantMessage.t,
            draft: true,
            responseType: item.assistantMessage.responseType as ResponseType,
            badgeText: item.assistantMessage.badgeText,
          });
        }
        if (item.workflow) lastWorkflow = item.workflow;
      }

      setMessages(msgs);
      if (lastWorkflow) setWorkflow(lastWorkflow);
    } catch (err) {
      console.error('[PatientChatSimulator] history load error:', err);
      setMessages(SIM_CONVERSATIONS[0].initialMessages);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const runWorkflow = async () => {
    const userText = input.trim();
    if (!userText) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((m) => [...m, { who: 'patient', text: userText, t: time }]);
    setInput('');
    setRunning(true);
    setShowWorkflow(false);

    try {
      const result = await analyzePatientMessageAndPersist(userText, patientName);

      setWorkflow(result.workflow);
      setMessages((m) => [...m, {
        who: 'assistant',
        text: result.draftText,
        t: time,
        draft: true,
        responseType: result.responseType,
        badgeText: result.badgeText,
      }]);
    } catch (err) {
      console.error('[PatientChatSimulator] workflow error:', err);
      setMessages((m) => [...m, {
        who: 'assistant',
        text: "I've received your message and routed it to our team. A staff member will respond shortly. For urgent concerns, please call (734) 555-0142.",
        t: time,
        draft: true,
        responseType: 'draft_review' as ResponseType,
      }]);
    } finally {
      setShowWorkflow(true);
      setRunning(false);
    }
  };

  return (
    <div className="screen-enter" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div>
          <h1>Patient Chat Simulator</h1>
          <p className="lede">Preview the white-labeled patient assistant and inspect how each agent decides what to draft, route, and escalate.</p>
        </div>
        <div className="actions">
          <ResetButton onClick={handleReset} label="Reset chat" />
        </div>
      </div>

      <div className="split-2col">
        {/* Phone mock */}
        <div>
          <div className="phone-mock">
            <div className="ph-head">
              <div className="ph-tile">AR</div>
              <div>
                <div className="ph-clinic">{CLINIC.name}</div>
                <div className="ph-asst">{CLINIC.assistant}</div>
              </div>
              <div className="ph-status">
                <span className="dot" />
                Online
              </div>
            </div>

            <div className="ph-body" ref={scrollRef}>
              <div style={{ alignSelf: 'center', fontSize: 11, color: 'var(--fg3)', padding: '2px 10px', background: 'var(--paper)', borderRadius: 999, border: '1px solid var(--border)' }}>
                Today · Tuesday May 13
              </div>
              {historyLoading ? (
                <div style={{ alignSelf: 'center', display: 'flex', gap: 6, padding: '20px 0' }}>
                  <Dot delay={0} /><Dot delay={120} /><Dot delay={240} />
                </div>
              ) : (
                messages.map((m, i) => (
                  <ChatBubble key={i} m={m} />
                ))
              )}
              {running && (
                <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 6, padding: '8px 14px', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 16 }}>
                  <Dot delay={0} /><Dot delay={120} /><Dot delay={240} />
                </div>
              )}
            </div>

            <div className="ph-composer">
              <input
                placeholder="Patient name (optional)"
                value={patientName === 'Simulator Patient' ? '' : patientName}
                onChange={(e) => setPatientName(e.target.value || 'Simulator Patient')}
                style={{ fontSize: 12, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--paper)', color: 'var(--fg2)', outline: 'none' }}
              />
              <div className="row">
                <input
                  placeholder="Type a patient message…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runWorkflow()}
                />
                <button className="send" onClick={runWorkflow} title="Send"><IconSend size={15} /></button>
              </div>
            </div>
          </div>
        </div>

        {/* Right — agent workflow result */}
        <div>
          <AgentWorkflowResult wf={workflow} visible={showWorkflow} running={running} />
        </div>
      </div>
    </div>
  );
}

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

function shortenBadgeText(text: string): string {
  if (/billing follow-?up/i.test(text)) return 'Billing follow-up';
  if (/front desk follow-?up/i.test(text)) return 'Front desk follow-up';
  if (/clinician alerted/i.test(text)) return 'Clinician alerted';
  if (/clinician follow-?up/i.test(text)) return 'Clinician follow-up';
  if (/approved.*source|source.*answer/i.test(text)) return 'Approved source';
  if (/safe acknowledgment/i.test(text)) return 'Staff follow-up';
  return text;
}

function responseBadge(rt: ResponseType | undefined): { tone: 'green' | 'sage' | 'red' | 'amber'; text: string } {
  switch (rt) {
    case 'safe_acknowledgment':  return { tone: 'green', text: 'Staff follow-up' };
    case 'source_answered':      return { tone: 'sage',  text: 'Approved source' };
    case 'preapproved_safety':   return { tone: 'red',   text: 'Clinician follow-up' };
    case 'urgent_safety':        return { tone: 'red',   text: 'Clinician alerted' };
    case 'draft_review':
    default:                     return { tone: 'amber', text: 'Staff review required' };
  }
}

function ChatBubble({ m }: { m: ChatMessage }) {
  if (m.who === 'patient') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <div className="bubble patient">{m.text}</div>
        <div className="bubble-meta">{m.t} · You</div>
      </div>
    );
  }
  const badge = responseBadge(m.responseType);
  const displayText = shortenBadgeText(m.badgeText ?? badge.text);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <div className="assistant-label">
        <div className="av">A</div>
        <div className="nm">ArborCare</div>
        {m.draft && <Badge tone={badge.tone} dot>{displayText}</Badge>}
      </div>
      <div className={`bubble assistant${m.draft ? ' draft' : ''}`}>{m.text}</div>
      <div className="bubble-meta">{m.t}</div>
    </div>
  );
}

function WorkflowSummaryBadges({ wf }: { wf: WorkflowStep }) {
  const { canAutoSend, requiresHumanReview, qaStatus } = wf.validation;
  const routeTo = wf.safety.routeTo;
  const risk = wf.safety.risk.toLowerCase();
  const qa = qaStatus.toLowerCase();

  if (qa.includes('blocked')) {
    return (
      <>
        <Badge tone="red" dot>Blocked</Badge>
        <Badge tone="red" dot>Staff review required</Badge>
      </>
    );
  }

  return (
    <>
      {canAutoSend
        ? <Badge tone="green" dot>Auto-sent</Badge>
        : <Badge tone="amber" dot>Staff review required</Badge>
      }
      {canAutoSend && routeTo === 'Clinician' && <Badge tone="red" dot>Clinician alerted</Badge>}
      {canAutoSend && routeTo === 'Billing' && <Badge tone="amber" dot>Billing follow-up</Badge>}
      {canAutoSend && (routeTo === 'Front Desk' || routeTo === 'Staff') && <Badge tone="sage" dot>Front desk follow-up</Badge>}
      {!canAutoSend && requiresHumanReview && routeTo === 'Clinician' && <Badge tone="red" dot>Clinician follow-up</Badge>}
      {risk === 'high' && <Badge tone="red">High risk</Badge>}
      {risk === 'medium' && <Badge tone="amber">Medium risk</Badge>}
      <Badge tone="sage">Audit ID · wf-AAR-0413</Badge>
    </>
  );
}

function SafetyAgentBadge({ wf }: { wf: WorkflowStep }) {
  const risk = wf.safety.risk.toLowerCase();
  const routeTo = wf.safety.routeTo;
  const canAutoSend = wf.validation.canAutoSend;
  const qa = wf.validation.qaStatus.toLowerCase();

  if (qa.includes('blocked')) return <Badge tone="red" dot>Blocked</Badge>;
  if (risk === 'high') {
    return canAutoSend
      ? <Badge tone="red" dot>Safety response only</Badge>
      : <Badge tone="red" dot>Clinician follow-up</Badge>;
  }
  if (risk === 'medium') {
    return routeTo === 'Clinician'
      ? <Badge tone="amber" dot>Clinician follow-up</Badge>
      : <Badge tone="amber" dot>Follow-up required</Badge>;
  }
  return <Badge tone="green" dot>Auto-send allowed</Badge>;
}

function AgentWorkflowResult({ wf, visible, running }: { wf: WorkflowStep; visible: boolean; running: boolean }) {
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconLayers size={16} style={{ color: 'var(--sage-deep)' }} /> Agent Workflow Result
          </h2>
          <div className="sub">5 agents reasoned over this message · auditable, no hidden chain-of-thought</div>
        </div>
        <Badge tone="sage" dot>Live</Badge>
      </div>
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <WorkflowSummaryBadges wf={wf} />
        </div>

        {(!visible || running) ? (
          <div className="empty-state" style={{ minHeight: 380 }}>
            <div style={{ display: 'inline-flex', gap: 6 }}>
              <Dot delay={0} /><Dot delay={120} /><Dot delay={240} />
            </div>
            <div style={{ marginTop: 12 }}>Running agent workflow…</div>
          </div>
        ) : (
          <div className="agent-panel">
            <AgentStep
              num="1" iconKey="bulb" tone="sage"
              title="Intent Agent"
              right={<ConfidenceMini value={wf.intent.confidence} />}
              kv={[
                { k: 'Intent',     v: wf.intent.intent },
                { k: 'Domain',     v: wf.intent.domain },
                { k: 'Confidence', v: `${wf.intent.confidence}%` },
              ]}
            />
            <AgentStep
              num="2" iconKey="shield" tone="red"
              title="Safety Agent"
              right={<SafetyAgentBadge wf={wf} />}
              kv={[
                { k: 'Risk level',   v: wf.safety.risk,   danger: wf.safety.risk.toLowerCase() === 'high' },
                { k: 'Human review', v: wf.safety.review, warn: wf.safety.review === 'Required' },
                { k: 'Route to',     v: wf.safety.routeTo },
              ]}
            />
            <AgentStep
              num="3" iconKey="book" tone="sage"
              title="Knowledge Agent"
              kv={[
                { k: 'Source',    v: wf.knowledge.source },
                { k: 'Guideline', v: wf.knowledge.rule },
                ...(wf.knowledge.relevance
                  ? [{ k: 'Relevance', v: wf.knowledge.relevance.charAt(0).toUpperCase() + wf.knowledge.relevance.slice(1) }]
                  : []),
              ]}
            />
            <AgentStep
              num="4" iconKey="route" tone="amber"
              title="Action Planner"
              right={<PlannerStatusBadge status={wf.planner.status} />}
              kv={wf.planner.actions.map((a, i) => ({
                k: `Action ${i + 1}`,
                v: a.requires_approval
                  ? `${a.title} → Clinician approval required (${a.priority})`
                  : `${a.title} → ${a.role} (${a.priority})`,
              }))}
            />
            <AgentStep
              num="5" iconKey="checkCircle"
              tone={wf.validation.qaStatus.toLowerCase().includes('blocked') ? 'red' : (wf.validation.qaStatus.toLowerCase().includes('revision') || wf.validation.qaStatus.toLowerCase().includes('fallback')) ? 'amber' : 'green'}
              title="QA Agent"
              right={<QAStatusBadge status={wf.validation.qaStatus} />}
              kv={[
                { k: 'QA Status',      v: wf.validation.qaStatus },
                { k: 'Auto-send',      v: wf.validation.qaStatus.toLowerCase().includes('fallback') ? 'Approved safety fallback' : wf.validation.canAutoSend ? 'Approved' : 'Requires approval' },
                { k: 'Summary',        v: wf.validation.reasonSummary },
                ...wf.validation.issues.map((issue, i) => ({
                  k: `Issue ${i + 1}`,
                  v: `${issue.type.replace(/_/g, ' ')} (${issue.severity}): ${issue.description}`,
                  warn: issue.severity === 'medium',
                  danger: issue.severity === 'high',
                })),
              ]}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function QAStatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const tone = s.includes('blocked') ? 'red' : (s.includes('revision') || s.includes('fallback')) ? 'amber' : 'green';
  return <Badge tone={tone as 'green' | 'amber' | 'red'} dot>{status}</Badge>;
}

function PlannerStatusBadge({ status }: { status: string }) {
  const tone =
    status.toLowerCase().includes('clinician') ? 'red' :
    status.toLowerCase().includes('billing')   ? 'amber' :
    status.toLowerCase().includes('resolved')  ? 'green' : 'amber';
  return <Badge tone={tone as 'red' | 'amber' | 'green'} dot>{status}</Badge>;
}

interface KVRow { k: string; v: string; danger?: boolean; warn?: boolean; }

function AgentStep({ num, iconKey, tone, title, kv, right }: {
  num: string; iconKey: string; tone: string; title: string;
  kv: KVRow[]; right?: React.ReactNode;
}) {
  return (
    <div className="agent-step">
      <IconTile tone={tone as 'sage' | 'red' | 'amber' | 'green'} iconKey={iconKey} size="sm" />
      <div className="step-body">
        <div className="step-head">
          <span className="step-title">{title}</span>
          <div>{right}</div>
        </div>
        <div className="kv">
          {kv.map((r, i) => (
            <div className="kv-row" key={i}>
              <span className="k">{r.k}</span>
              <span className={`v${r.danger ? ' danger' : ''}${r.warn ? ' warn' : ''}`}>{r.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
