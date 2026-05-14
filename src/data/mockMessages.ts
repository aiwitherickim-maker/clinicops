import type { InboxMessage, SimConversation, CommandChatMessage, CommandAction } from '@/types';

export const INBOX: InboxMessage[] = [
  {
    id: 'msg-a',
    patient: 'Maya Thompson', patientShort: 'Patient A',
    initials: 'MT',
    message: 'My eye has been hurting since the injection yesterday. Should I wait?',
    category: 'Post-procedure symptom',
    risk: 'high',
    status: 'Needs clinician review',
    statusTone: 'red',
    received: '7:42 AM',
    routeTo: 'Clinician',
    iconKey: 'eye', iconTone: 'red',
    reason: 'Patient reports eye pain after an injection. The assistant should not diagnose, reassure, or tell the patient to wait. This should be escalated to clinical staff.',
    draft: "I'm sorry you're experiencing this. I'm going to flag this for the clinical team now. If you have severe pain, sudden vision changes, or rapidly worsening symptoms, please contact the clinic immediately or seek urgent care.",
    task: { title: 'Clinician review for post-injection eye pain', priority: 'Urgent', assignee: 'Dr. Sarah Lee' },
    confidence: 92,
  },
  {
    id: 'msg-b',
    patient: 'Daniel Brooks', patientShort: 'Patient B',
    initials: 'DB',
    message: 'Can I move my appointment to next week?',
    category: 'Scheduling',
    risk: 'low',
    status: 'Ready for front desk review',
    statusTone: 'sage',
    received: '8:11 AM',
    routeTo: 'Front desk',
    iconKey: 'calendar', iconTone: 'sage',
    reason: 'Patient is requesting a non-urgent reschedule. Two available slots next week have been auto-confirmed against the calendar. Front desk can confirm by SMS.',
    draft: 'Of course — we have openings on Tuesday May 20 at 10:30 AM or Thursday May 22 at 2:45 PM. Reply with the time that works and the front desk will move your appointment.',
    task: { title: 'Reschedule appointment — confirm slot', priority: 'Low', assignee: 'Sam Park' },
    confidence: 96,
  },
  {
    id: 'msg-c',
    patient: 'Alicia Reed', patientShort: 'Patient C',
    initials: 'AR',
    message: 'How much will my visit cost?',
    category: 'Billing / cost',
    risk: 'medium',
    status: 'Route to billing',
    statusTone: 'amber',
    received: '8:04 AM',
    routeTo: 'Billing',
    iconKey: 'dollar', iconTone: 'amber',
    reason: "Patient is asking for a cost estimate before tomorrow's visit. Estimate exists in payer record but exceeds the auto-share threshold; billing should verify before sending.",
    draft: 'Thanks for asking ahead — based on your plan (United HMO), the estimated patient responsibility is $145 for tomorrow\'s visit. Maria from billing will confirm and reply with the exact amount today.',
    task: { title: 'Cost question follow-up', priority: 'Medium', assignee: 'Maria Alvarez' },
    confidence: 78,
  },
  {
    id: 'msg-d',
    patient: 'Priya Shah', patientShort: 'Patient D',
    initials: 'PS',
    message: 'Do I need to fast before my injection tomorrow?',
    category: 'Procedure prep',
    risk: 'medium',
    status: 'Review suggested answer',
    statusTone: 'amber',
    received: '8:24 AM',
    routeTo: 'Clinician (review FAQ)',
    iconKey: 'pill', iconTone: 'amber',
    reason: 'Standard procedure-prep question. Approved FAQ answer is available but confidence is below the auto-send threshold. A clinician should glance at the response before sending.',
    draft: "For intravitreal injections we don't require fasting — eat normally and take your usual medications. Please arrive 15 minutes early and bring a list of any new prescriptions.",
    task: { title: 'Procedure prep — confirm FAQ matches', priority: 'Medium', assignee: 'Dr. Sarah Lee' },
    confidence: 71,
  },
  {
    id: 'msg-e',
    patient: 'Robert Chen', patientShort: 'Patient E',
    initials: 'RC',
    message: 'Did you receive my new insurance card?',
    category: 'Insurance / documents',
    risk: 'low',
    status: 'Needs verification',
    statusTone: 'sage',
    received: '8:36 AM',
    routeTo: 'Front desk',
    iconKey: 'file', iconTone: 'sage',
    reason: 'Patient is asking about an insurance card upload. A file was received yesterday but not yet linked to their record. Front desk should attach and confirm.',
    draft: 'Thanks for sending it — I see an upload from yesterday at 3:12 PM. The front desk will attach it to your chart and reply by end of day.',
    task: { title: 'Attach new insurance card', priority: 'Low', assignee: 'Sam Park' },
    confidence: 89,
  },
];

export const SIM_CONVERSATIONS: SimConversation[] = [
  {
    id: 'case-eye-pain',
    patient: 'Maya Thompson',
    label: 'Post-procedure symptom',
    initialMessages: [
      { who: 'patient', text: 'Hi — my eye has been hurting since the injection yesterday. Should I wait?', t: '7:42 AM' },
      { who: 'assistant', text: "I'm sorry you're experiencing this. I'm going to flag this for the clinical team now. If you have severe pain, sudden vision changes, or rapidly worsening symptoms, please contact the clinic immediately or seek urgent care.", t: '7:42 AM', draft: true, responseType: 'urgent_safety' as const, badgeText: 'Urgent safety response sent · clinician alerted' },
    ],
    workflow: {
      intent:    { intent: 'Post-procedure symptom', domain: 'Clinical', confidence: 92 },
      safety:    { risk: 'High', review: 'Required', routeTo: 'Clinician' },
      knowledge: { source: 'Post-injection symptom escalation policy', rule: 'Do not diagnose or reassure; escalate to clinical team' },
      planner:   {
        status: 'needs_clinician_review',
        actions: [
          { title: 'Escalate to clinician immediately', role: 'Clinician', priority: 'urgent', reason: 'Post-procedure symptoms require immediate clinical evaluation', requires_approval: false },
          { title: 'Send pre-approved safety escalation response', role: 'Clinician', priority: 'urgent', reason: 'Pre-approved safety template auto-sent; clinician must follow up directly', requires_approval: false },
        ],
      },
      validation:{ status: 'Approved for review queue', issue: 'No autonomous medical advice detected' },
    },
  },
];

export const COMMAND_CHAT_SEED: CommandChatMessage[] = [
  { who: 'staff', text: 'What should I handle first this morning?', t: '8:01 AM' },
  { who: 'bot',   text: "I found 4 items that need attention. The highest priority is Maya Thompson's post-procedure symptom message, followed by Alicia Reed's billing question before tomorrow's visit.", t: '8:01 AM', actionRefs: ['ac-1', 'ac-3'] },
  { who: 'staff', text: 'Draft a billing message for Alicia Reed and assign it to Maria.', t: '8:03 AM' },
  { who: 'bot',   text: "Done. I drafted a billing follow-up and created a task for Maria Alvarez. It's pending approval before sending.", t: '8:03 AM', actionRefs: ['ac-2', 'ac-3'] },
];

export const COMMAND_ACTIONS: CommandAction[] = [
  {
    id: 'ac-1', iconKey: 'alert', tone: 'red',
    title: 'Urgent clinical review task',
    badges: [{ label: 'Urgent', tone: 'red' }, { label: 'Open', tone: 'neutral' }],
    rows: [
      { k: 'Patient',  v: 'Maya Thompson' },
      { k: 'Assigned', v: 'Dr. Sarah Lee' },
      { k: 'Source',   v: 'Patient message · 7:42 AM' },
    ],
  },
  {
    id: 'ac-2', iconKey: 'dollar', tone: 'amber',
    title: 'Billing follow-up task',
    badges: [{ label: 'Medium', tone: 'amber' }, { label: 'Pending approval', tone: 'cream' }],
    rows: [
      { k: 'Patient',  v: 'Alicia Reed' },
      { k: 'Assigned', v: 'Maria Alvarez' },
      { k: 'Visit',    v: 'Tomorrow · 11:15 AM' },
    ],
  },
  {
    id: 'ac-3', iconKey: 'edit', tone: 'sage',
    title: 'Draft patient message',
    badges: [{ label: 'Cost question', tone: 'neutral' }, { label: 'Needs billing review', tone: 'amber' }],
    rows: [
      { k: 'Patient', v: 'Alicia Reed' },
      { k: 'Topic',   v: 'Cost estimate' },
      { k: 'Length',  v: '2 sentences' },
    ],
  },
  {
    id: 'ac-4', iconKey: 'file', tone: 'cream',
    title: 'Finance review item',
    badges: [{ label: 'Finance', tone: 'cream' }, { label: 'Needs category review', tone: 'amber' }],
    rows: [
      { k: 'Vendor', v: 'Medical Supply Co.' },
      { k: 'Amount', v: '$482.90' },
      { k: 'Date',   v: 'Yesterday' },
    ],
  },
];

export const COMMAND_QUICKS: string[] = [
  'Create morning worklist',
  'Assign billing follow-ups',
  'Summarize clinician review items',
  'Show finance items',
];
