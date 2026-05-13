import type { Clinic, NavItem, Staff, DashMetric, WorklistItem, ReviewRule, KnowledgeSource, SafetySetting } from '@/types';

export const CLINIC: Clinic = {
  name: 'Ann Arbor Retina Clinic',
  specialty: 'Ophthalmology · Retina',
  assistant: 'ArborCare Assistant',
  city: 'Ann Arbor, MI',
};

export const STAFF: Staff[] = [
  { id: 'lee',   name: 'Dr. Sarah Lee',  role: 'Clinician',       tone: 'sage',   initials: 'SL' },
  { id: 'maria', name: 'Maria Alvarez',  role: 'Billing',         tone: 'amber',  initials: 'MA' },
  { id: 'sam',   name: 'Sam Park',       role: 'Front Desk',      tone: 'sage',   initials: 'SP' },
  { id: 'mgr',   name: 'Jordan Kim',     role: 'Finance / Admin', tone: 'cream',  initials: 'JK' },
];

export const NAV: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard',                iconKey: 'layout' },
  { key: 'chat',      label: 'Patient Chat Simulator',   iconKey: 'message' },
  { key: 'inbox',     label: 'Staff Review Inbox',       iconKey: 'inbox',   count: 3, urgent: true },
  { key: 'command',   label: 'Back-Office Command',      iconKey: 'terminal' },
  { key: 'tasks',     label: 'Tasks',                    iconKey: 'check',   count: 8 },
  { key: 'setup',     label: 'Clinic Setup',             iconKey: 'settings' },
];

export const DASH_METRICS: DashMetric[] = [
  { label: 'Patient messages',        value: '12', note: 'since yesterday 5:00 PM' },
  { label: 'Need clinician review',   value: '3',  note: '1 urgent · 2 today', attention: true },
  { label: 'Staff tasks open',        value: '5',  note: '2 due today' },
  { label: 'Billing items pending',   value: '2',  note: '1 prior auth · 1 cost question' },
];

export const WORKLIST: WorklistItem[] = [
  {
    id: 'wl-1',
    iconKey: 'eye', tone: 'red',
    title: 'Maya Thompson reported eye pain after injection',
    desc: 'Post-procedure symptom · received 7:42 AM · do not reassure',
    risk: 'high', route: 'Clinician',
    action: 'Assign clinician',
    meta: ['Patient: Maya Thompson', 'Visit: Yesterday 2:15 PM'],
  },
  {
    id: 'wl-2',
    iconKey: 'dollar', tone: 'amber',
    title: 'Alicia Reed asked about cost before tomorrow\'s visit',
    desc: 'Billing / cost question · received 8:04 AM · estimate needs verification',
    risk: 'medium', route: 'Billing',
    action: 'Route to billing',
    meta: ['Patient: Alicia Reed', 'Visit: Tomorrow 11:15 AM'],
  },
  {
    id: 'wl-3',
    iconKey: 'calendar', tone: 'sage',
    title: 'Daniel Brooks requested rescheduling',
    desc: 'Scheduling · received 8:11 AM · two slot options confirmed available',
    risk: 'low', route: 'Front desk',
    action: 'Front desk follow-up',
    meta: ['Patient: Daniel Brooks', 'Current: Wed May 14 · 2:00 PM'],
  },
  {
    id: 'wl-4',
    iconKey: 'file', tone: 'cream',
    title: 'Medical Supply Co. card transaction needs category review',
    desc: 'Finance · captured from card · $482.90 · category not recognized',
    risk: 'finance', route: 'Office manager',
    action: 'Review category',
    meta: ['Card: Clinic Visa · ••3104', 'Date: Yesterday'],
  },
];

export const COMMAND_CHIPS: string[] = [
  'What should I handle first?',
  'Show clinical escalations',
  'Draft billing follow-ups',
  'Summarize unresolved messages',
];

export const REVIEW_RULES: ReviewRule[] = [
  { trigger: 'Clinical symptoms',    resolution: 'Clinician review required',                     tone: 'red' },
  { trigger: 'Medication questions', resolution: 'Clinician review required',                     tone: 'red' },
  { trigger: 'Billing disputes',     resolution: 'Billing manager review required',               tone: 'amber' },
  { trigger: 'Scheduling requests',  resolution: 'Front desk review',                             tone: 'sage' },
  { trigger: 'Procedure prep',       resolution: 'Use approved FAQ; review if low confidence',    tone: 'amber' },
];

export const KNOWLEDGE_SOURCES: KnowledgeSource[] = [
  { title: 'Post-injection symptom escalation policy', sub: 'Clinical · last reviewed 4 days ago',    iconKey: 'shield',     tone: 'red' },
  { title: 'Procedure prep instructions',              sub: 'Clinical · last reviewed 2 weeks ago',   iconKey: 'clipboard',  tone: 'sage' },
  { title: 'Billing FAQ',                              sub: 'Billing · last reviewed today',          iconKey: 'dollar',     tone: 'amber' },
  { title: 'Clinic hours and location',                sub: 'Front desk · last reviewed 1 month ago', iconKey: 'building',   tone: 'sage' },
  { title: 'Insurance document policy',                sub: 'Billing · last reviewed 3 weeks ago',    iconKey: 'file',       tone: 'cream' },
];

export const SAFETY_SETTINGS: SafetySetting[] = [
  { id: 's1', text: 'Do not send clinical-risk responses without human approval',    sub: 'Required — cannot be disabled.',                               on: true, locked: true },
  { id: 's2', text: 'Use approved clinic knowledge only',                           sub: 'Restricts ArborCare to your clinic\'s policy library.',         on: true },
  { id: 's3', text: 'Show reasoning summary for staff',                             sub: 'Short, auditable rationale on every AI action.',               on: true },
  { id: 's4', text: 'Create tasks for escalated messages',                          sub: 'Every escalated message creates a tracked task.',              on: true },
  { id: 's5', text: 'Require approval before patient-facing messages',              sub: 'Drafts are queued for staff approval before sending.',         on: true },
];
