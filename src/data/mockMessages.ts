import type { InboxMessage, SimConversation, CommandChatMessage, CommandAction } from '@/types';

export const INBOX: InboxMessage[] = [
  {
    id: 'msg-a',
    patient: 'Maya Thompson', patientShort: 'Patient A',
    initials: 'MT',
    message: 'My eye has been hurting since the injection yesterday. Should I wait?',
    category: 'Post-procedure symptom',
    risk: 'high',
    status: 'Clinician follow-up',
    statusTone: 'red',
    received: '7:42 AM',
    routeTo: 'Clinician',
    iconKey: 'eye', iconTone: 'red',
    reason: 'Patient reports eye pain after an injection. The assistant should not diagnose, reassure, or tell the patient to wait. This should be escalated to clinical staff.',
    draft: "Hi Maya, I'm sorry to hear about the eye pain after yesterday's injection. Your case has been flagged as urgent for Dr. Lee to review. Please call us at (734) 555-0142 right away if your pain worsens or you notice any changes in vision — do not wait for a callback.",
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
    status: 'Front desk follow-up',
    statusTone: 'sage',
    received: '8:11 AM',
    routeTo: 'Front desk',
    iconKey: 'calendar', iconTone: 'sage',
    reason: 'Patient is requesting a non-urgent reschedule. Two available slots next week have been auto-confirmed against the calendar. Front desk can confirm by SMS.',
    draft: "Hi Daniel, thanks for reaching out. We'll check next week's availability and follow up to confirm a new time. If you have specific days or times that work best, feel free to send those over and we'll do our best to accommodate.",
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
    status: 'Billing follow-up',
    statusTone: 'amber',
    received: '8:04 AM',
    routeTo: 'Billing',
    iconKey: 'dollar', iconTone: 'amber',
    reason: "Patient is asking for a cost estimate before tomorrow's visit. Estimate exists in payer record but exceeds the auto-share threshold; billing should verify before sending.",
    draft: "Hi Alicia, thanks for asking ahead of your visit. The final cost and coverage depend on your insurance plan, benefits, deductible, and any prior authorization required. Our billing team will verify your plan details and follow up with the most accurate estimate — you can also call us at (734) 555-0142 if you need information sooner.",
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
    status: 'Clinician follow-up',
    statusTone: 'red',
    received: '8:24 AM',
    routeTo: 'Clinician (review FAQ)',
    iconKey: 'pill', iconTone: 'amber',
    reason: 'Standard procedure-prep question. Approved FAQ answer is available but confidence is below the auto-send threshold. A clinician should glance at the response before sending.',
    draft: "Hi Priya, thanks for asking before your procedure tomorrow. Please do not change how you use your current medications based on this message. I'm routing your question to the clinical team so they can provide guidance specific to your injection. We'll follow up with you directly today.",
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
    status: 'Front desk follow-up',
    statusTone: 'sage',
    received: '8:36 AM',
    routeTo: 'Front desk',
    iconKey: 'file', iconTone: 'sage',
    reason: 'Patient is asking about an insurance card upload. A file was received yesterday but not yet linked to their record. Front desk should attach and confirm.',
    draft: "Hi Robert, thanks for sending your updated insurance card. Our front desk will verify the upload, attach it to your chart, and confirm once it's been linked to your record. We'll follow up by end of day.",
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
      validation: {
        qaStatus: 'Approved',
        canAutoSend: false,
        requiresHumanReview: true,
        reasonSummary: 'Response uses safe escalation language; clinical team alerted.',
        issues: [],
      },
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
