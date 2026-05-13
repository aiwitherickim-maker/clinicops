/* Static data for ClinicOps Chat Agent prototype.
   Demo clinic: Ann Arbor Retina Clinic · Assistant: ArborCare Assistant. */

const CLINIC = {
  name: "Ann Arbor Retina Clinic",
  specialty: "Ophthalmology · Retina",
  assistant: "ArborCare Assistant",
  city: "Ann Arbor, MI",
};

const NAV = [
  { key: "dashboard",   label: "Dashboard",                iconKey: "layout" },
  { key: "chat",        label: "Patient Chat Simulator",   iconKey: "message" },
  { key: "inbox",       label: "Staff Review Inbox",       iconKey: "inbox",   count: 3, urgent: true },
  { key: "command",     label: "Back-Office Command",      iconKey: "terminal" },
  { key: "tasks",       label: "Tasks",                    iconKey: "check",   count: 8 },
  { key: "setup",       label: "Clinic Setup",             iconKey: "settings" },
];

const STAFF = [
  { id: "lee",  name: "Dr. Sarah Lee",  role: "Clinician",         tone: "sage",   initials: "SL" },
  { id: "maria", name: "Maria Alvarez", role: "Billing",           tone: "amber",  initials: "MA" },
  { id: "sam",  name: "Sam Park",       role: "Front Desk",        tone: "sage",   initials: "SP" },
  { id: "mgr",  name: "Jordan Kim",     role: "Finance / Admin",   tone: "cream",  initials: "JK" },
];

/* ============ Dashboard ============ */
const DASH_METRICS = [
  { label: "Patient messages", value: "12", note: "since yesterday 5:00 PM" },
  { label: "Need clinician review", value: "3", note: "1 urgent · 2 today", attention: true },
  { label: "Staff tasks open", value: "5", note: "2 due today" },
  { label: "Billing items pending", value: "2", note: "1 prior auth · 1 cost question" },
];

const WORKLIST = [
  {
    id: "wl-1",
    iconKey: "eye", tone: "red",
    title: "Patient A reported eye pain after injection",
    desc: "Post-procedure symptom · received 7:42 AM · do not reassure",
    risk: "high", route: "Clinician",
    action: "Assign clinician",
    meta: ["Patient: Maya Thompson", "Visit: Yesterday 2:15 PM"],
  },
  {
    id: "wl-2",
    iconKey: "dollar", tone: "amber",
    title: "Patient C asked about cost before tomorrow's visit",
    desc: "Billing / cost question · received 8:04 AM · estimate needs verification",
    risk: "medium", route: "Billing",
    action: "Route to billing",
    meta: ["Patient: Alicia Reed", "Visit: Tomorrow 11:15 AM"],
  },
  {
    id: "wl-3",
    iconKey: "calendar", tone: "sage",
    title: "Patient B requested rescheduling",
    desc: "Scheduling · received 8:11 AM · two slot options confirmed available",
    risk: "low", route: "Front desk",
    action: "Front desk follow-up",
    meta: ["Patient: Daniel Brooks", "Current: Wed May 14 · 2:00 PM"],
  },
  {
    id: "wl-4",
    iconKey: "file", tone: "cream",
    title: "Medical Supply Co. card transaction needs category review",
    desc: "Finance · captured from card · $482.90 · category not recognized",
    risk: "finance", route: "Office manager",
    action: "Review category",
    meta: ["Card: Clinic Visa · ••3104", "Date: Yesterday"],
  },
];

const COMMAND_CHIPS = [
  "What should I handle first?",
  "Show clinical escalations",
  "Draft billing follow-ups",
  "Summarize unresolved messages",
];

/* ============ Chat simulator ============ */
const SIM_CONVERSATIONS = [
  // Default conversation = the eye-pain case
  {
    id: "case-eye-pain",
    patient: "Maya Thompson",
    label: "Post-procedure symptom",
    initialMessages: [
      { who: "patient", text: "Hi — my eye has been hurting since the injection yesterday. Should I wait?", t: "7:42 AM" },
      { who: "assistant", text: "I'm sorry you're experiencing this. I'm going to flag this for the clinical team now. If you have severe pain, sudden vision changes, or rapidly worsening symptoms, please contact the clinic immediately or seek urgent care.", t: "7:42 AM", draft: true },
    ],
    workflow: {
      intent:   { intent: "Post-procedure symptom", domain: "Clinical", confidence: 92 },
      safety:   { risk: "High", review: "Required", routeTo: "Clinician" },
      knowledge:{ source: "Post-injection symptom escalation policy", rule: "Do not diagnose or reassure; escalate to clinical team" },
      planner:  ["Create urgent clinician review task", "Draft safe patient response"],
      validation:{ status: "Approved for review queue", issue: "No autonomous medical advice detected" },
    },
  },
];

/* ============ Review inbox ============ */
const INBOX = [
  {
    id: "msg-a",
    patient: "Maya Thompson", patientShort: "Patient A",
    initials: "MT",
    message: "My eye has been hurting since the injection yesterday. Should I wait?",
    category: "Post-procedure symptom",
    risk: "high",
    status: "Needs clinician review",
    statusTone: "red",
    received: "7:42 AM",
    routeTo: "Clinician",
    iconKey: "eye", iconTone: "red",
    reason:
      "Patient reports eye pain after an injection. The assistant should not diagnose, reassure, or tell the patient to wait. This should be escalated to clinical staff.",
    draft:
      "I'm sorry you're experiencing this. I'm going to flag this for the clinical team now. If you have severe pain, sudden vision changes, or rapidly worsening symptoms, please contact the clinic immediately or seek urgent care.",
    task: { title: "Clinician review for post-injection eye pain", priority: "Urgent", assignee: "Dr. Lee" },
    confidence: 92,
  },
  {
    id: "msg-b",
    patient: "Daniel Brooks", patientShort: "Patient B",
    initials: "DB",
    message: "Can I move my appointment to next week?",
    category: "Scheduling",
    risk: "low",
    status: "Ready for front desk review",
    statusTone: "sage",
    received: "8:11 AM",
    routeTo: "Front desk",
    iconKey: "calendar", iconTone: "sage",
    reason:
      "Patient is requesting a non-urgent reschedule. Two available slots next week have been auto-confirmed against the calendar. Front desk can confirm by SMS.",
    draft:
      "Of course — we have openings on Tuesday May 20 at 10:30 AM or Thursday May 22 at 2:45 PM. Reply with the time that works and the front desk will move your appointment.",
    task: { title: "Reschedule appointment — confirm slot", priority: "Low", assignee: "Sam" },
    confidence: 96,
  },
  {
    id: "msg-c",
    patient: "Alicia Reed", patientShort: "Patient C",
    initials: "AR",
    message: "How much will my visit cost?",
    category: "Billing / cost",
    risk: "medium",
    status: "Route to billing",
    statusTone: "amber",
    received: "8:04 AM",
    routeTo: "Billing",
    iconKey: "dollar", iconTone: "amber",
    reason:
      "Patient is asking for a cost estimate before tomorrow's visit. Estimate exists in payer record but exceeds the auto-share threshold; billing should verify before sending.",
    draft:
      "Thanks for asking ahead — based on your plan (United HMO), the estimated patient responsibility is $145 for tomorrow's visit. Maria from billing will confirm and reply with the exact amount today.",
    task: { title: "Cost question follow-up", priority: "Medium", assignee: "Maria" },
    confidence: 78,
  },
  {
    id: "msg-d",
    patient: "Priya Shah", patientShort: "Patient D",
    initials: "PS",
    message: "Do I need to fast before my injection tomorrow?",
    category: "Procedure prep",
    risk: "medium",
    status: "Review suggested answer",
    statusTone: "amber",
    received: "8:24 AM",
    routeTo: "Clinician (review FAQ)",
    iconKey: "pill", iconTone: "amber",
    reason:
      "Standard procedure-prep question. Approved FAQ answer is available but confidence is below the auto-send threshold. A clinician should glance at the response before sending.",
    draft:
      "For intravitreal injections we don't require fasting — eat normally and take your usual medications. Please arrive 15 minutes early and bring a list of any new prescriptions.",
    task: { title: "Procedure prep — confirm FAQ matches", priority: "Medium", assignee: "Dr. Lee" },
    confidence: 71,
  },
  {
    id: "msg-e",
    patient: "Robert Chen", patientShort: "Patient E",
    initials: "RC",
    message: "Did you receive my new insurance card?",
    category: "Insurance / documents",
    risk: "low",
    status: "Needs verification",
    statusTone: "sage",
    received: "8:36 AM",
    routeTo: "Front desk",
    iconKey: "file", iconTone: "sage",
    reason:
      "Patient is asking about an insurance card upload. A file was received yesterday but not yet linked to their record. Front desk should attach and confirm.",
    draft:
      "Thanks for sending it — I see an upload from yesterday at 3:12 PM. The front desk will attach it to your chart and reply by end of day.",
    task: { title: "Attach new insurance card", priority: "Low", assignee: "Sam" },
    confidence: 89,
  },
];

/* ============ Command center seed ============ */
const COMMAND_CHAT_SEED = [
  { who: "staff", text: "What should I handle first this morning?", t: "8:01 AM" },
  { who: "bot",
    text: "I found 4 items that need attention. The highest priority is Patient A's post-procedure symptom message, followed by Patient C's billing question before tomorrow's visit.",
    t: "8:01 AM", actionRefs: ["ac-1", "ac-3"] },
  { who: "staff", text: "Draft a billing message for Patient C and assign it to Maria.", t: "8:03 AM" },
  { who: "bot",
    text: "Done. I drafted a billing follow-up and created a task for Maria. It's pending approval before sending.",
    t: "8:03 AM", actionRefs: ["ac-2", "ac-3"] },
];

const COMMAND_ACTIONS = [
  { id: "ac-1", iconKey: "alert", tone: "red",
    title: "Urgent clinical review task",
    badges: [{label: "Urgent", tone: "red"}, {label: "Open", tone: "neutral"}],
    rows: [
      { k: "Patient", v: "Maya Thompson" },
      { k: "Assigned", v: "Dr. Lee" },
      { k: "Source", v: "Patient message · 7:42 AM" },
    ],
  },
  { id: "ac-2", iconKey: "dollar", tone: "amber",
    title: "Billing follow-up task",
    badges: [{label: "Medium", tone: "amber"}, {label: "Pending approval", tone: "cream"}],
    rows: [
      { k: "Patient", v: "Alicia Reed" },
      { k: "Assigned", v: "Maria" },
      { k: "Visit", v: "Tomorrow · 11:15 AM" },
    ],
  },
  { id: "ac-3", iconKey: "edit", tone: "sage",
    title: "Draft patient message",
    badges: [{label: "Cost question", tone: "neutral"}, {label: "Needs billing review", tone: "amber"}],
    rows: [
      { k: "Patient", v: "Alicia Reed" },
      { k: "Topic", v: "Cost estimate" },
      { k: "Length", v: "2 sentences" },
    ],
  },
  { id: "ac-4", iconKey: "file", tone: "cream",
    title: "Finance review item",
    badges: [{label: "Finance", tone: "cream"}, {label: "Needs category review", tone: "amber"}],
    rows: [
      { k: "Vendor", v: "Medical Supply Co." },
      { k: "Amount", v: "$482.90" },
      { k: "Date", v: "Yesterday" },
    ],
  },
];

const COMMAND_QUICKS = [
  "Create morning worklist",
  "Assign billing follow-ups",
  "Summarize clinician review items",
  "Show finance items",
];

/* ============ Tasks ============ */
const TASKS = [
  {
    id: "tk-1",
    title: "Clinician review for post-injection eye pain",
    sub: "Source: Patient A message",
    source: "Patient A message",
    iconKey: "stethoscope", tone: "red",
    assignee: STAFF[0],
    priority: "Urgent", priorityTone: "red",
    status: "Open", statusTone: "neutral",
    due: "Today",
    aiCreated: true,
    category: "clinical",
  },
  {
    id: "tk-2",
    title: "Follow up on cost question",
    sub: "Source: Patient C message",
    source: "Patient C message",
    iconKey: "dollar", tone: "amber",
    assignee: STAFF[1],
    priority: "Medium", priorityTone: "amber",
    status: "Pending approval", statusTone: "cream",
    due: "Today",
    aiCreated: true,
    category: "billing",
  },
  {
    id: "tk-3",
    title: "Reschedule appointment",
    sub: "Source: Patient B message",
    source: "Patient B message",
    iconKey: "calendar", tone: "sage",
    assignee: STAFF[2],
    priority: "Low", priorityTone: "sage",
    status: "Open", statusTone: "neutral",
    due: "This week",
    aiCreated: true,
    category: "scheduling",
  },
  {
    id: "tk-4",
    title: "Categorize card transaction",
    sub: "Source: Back-office finance item",
    source: "Back-office finance item",
    iconKey: "file", tone: "cream",
    assignee: STAFF[3],
    priority: "Medium", priorityTone: "amber",
    status: "Needs review", statusTone: "amber",
    due: "Month-end",
    aiCreated: true,
    category: "finance",
  },
  {
    id: "tk-5",
    title: "Confirm procedure-prep FAQ for Patient D",
    sub: "Source: Patient D message",
    source: "Patient D message",
    iconKey: "clipboard", tone: "amber",
    assignee: STAFF[0],
    priority: "Medium", priorityTone: "amber",
    status: "Pending approval", statusTone: "cream",
    due: "Today",
    aiCreated: true,
    category: "clinical",
  },
  {
    id: "tk-6",
    title: "Attach Patient E new insurance card",
    sub: "Source: Patient E message",
    source: "Patient E message",
    iconKey: "file", tone: "sage",
    assignee: STAFF[2],
    priority: "Low", priorityTone: "sage",
    status: "Open", statusTone: "neutral",
    due: "Today",
    aiCreated: true,
    category: "billing",
  },
];

const TASK_FILTERS = [
  { key: "all",      label: "All" },
  { key: "clinical", label: "Clinical Review" },
  { key: "billing",  label: "Billing" },
  { key: "scheduling", label: "Scheduling" },
  { key: "finance",  label: "Finance" },
  { key: "pending",  label: "Pending Approval" },
];

/* ============ Clinic Setup ============ */
const REVIEW_RULES = [
  { trigger: "Clinical symptoms",   resolution: "Clinician review required",       tone: "red"    },
  { trigger: "Medication questions",resolution: "Clinician review required",       tone: "red"    },
  { trigger: "Billing disputes",    resolution: "Billing manager review required", tone: "amber"  },
  { trigger: "Scheduling requests", resolution: "Front desk review",               tone: "sage"   },
  { trigger: "Procedure prep",      resolution: "Use approved FAQ; review if low confidence", tone: "amber" },
];

const KNOWLEDGE_SOURCES = [
  { title: "Post-injection symptom escalation policy", sub: "Clinical · last reviewed 4 days ago",  iconKey: "shield", tone: "red"   },
  { title: "Procedure prep instructions",              sub: "Clinical · last reviewed 2 weeks ago", iconKey: "clipboard", tone: "sage" },
  { title: "Billing FAQ",                              sub: "Billing · last reviewed today",        iconKey: "dollar", tone: "amber" },
  { title: "Clinic hours and location",                sub: "Front desk · last reviewed 1 month ago", iconKey: "building", tone: "sage" },
  { title: "Insurance document policy",                sub: "Billing · last reviewed 3 weeks ago",  iconKey: "file",   tone: "cream" },
];

const SAFETY_SETTINGS = [
  { id: "s1", text: "Do not send clinical-risk responses without human approval", sub: "Required — cannot be disabled.", on: true, locked: true },
  { id: "s2", text: "Use approved clinic knowledge only",                          sub: "Restricts ArborCare to your clinic's policy library.", on: true },
  { id: "s3", text: "Show reasoning summary for staff",                            sub: "Short, auditable rationale on every AI action.", on: true },
  { id: "s4", text: "Create tasks for escalated messages",                          sub: "Every escalated message creates a tracked task.", on: true },
  { id: "s5", text: "Require approval before patient-facing messages",            sub: "Drafts are queued for staff approval before sending.", on: true },
];

Object.assign(window, {
  CLINIC, NAV, STAFF,
  DASH_METRICS, WORKLIST, COMMAND_CHIPS,
  SIM_CONVERSATIONS,
  INBOX,
  COMMAND_CHAT_SEED, COMMAND_ACTIONS, COMMAND_QUICKS,
  TASKS, TASK_FILTERS,
  REVIEW_RULES, KNOWLEDGE_SOURCES, SAFETY_SETTINGS,
});
