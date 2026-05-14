export type Tone = 'sage' | 'amber' | 'green' | 'red' | 'cream' | 'neutral' | 'forest' | 'orange';
export type Risk = 'high' | 'medium' | 'low' | 'finance';
export type Priority = 'Urgent' | 'High' | 'Medium' | 'Low';
export type TaskStatus = 'Open' | 'Pending approval' | 'Needs review' | 'Resolved' | 'In progress';

export interface Staff {
  id: string;
  name: string;
  role: string;
  tone: Tone;
  initials: string;
}

export interface Clinic {
  name: string;
  specialty: string;
  assistant: string;
  city: string;
}

export interface NavItem {
  key: string;
  label: string;
  iconKey: string;
  count?: number;
  urgent?: boolean;
}

export interface DashMetric {
  label: string;
  value: string;
  note: string;
  attention?: boolean;
}

export interface WorklistItem {
  id: string;
  iconKey: string;
  tone: Tone;
  title: string;
  desc: string;
  risk: Risk;
  route: string;
  action: string;
  meta: string[];
}

export interface InboxTask {
  title: string;
  priority: Priority;
  assignee: string;
}

export interface InboxMessage {
  id: string;
  patient: string;
  patientShort: string;
  initials: string;
  message: string;
  category: string;
  risk: Risk;
  status: string;
  statusTone: Tone;
  received: string;
  routeTo: string;
  iconKey: string;
  iconTone: Tone;
  reason: string;
  draft: string;
  task: InboxTask;
  confidence: number;
}

export type ResponseType =
  | 'safe_acknowledgment'          // send_safe_acknowledgment: low-risk auto-sent
  | 'source_answered'              // knowledge agent matched an approved source
  | 'preapproved_safety'           // send_preapproved_safety_response: clinical-risk template
  | 'urgent_safety'                // emergency-level clinical escalation
  | 'draft_review'                 // draft_patient_reply: human must approve before sending
  | 'no_reply';                    // no patient-facing response

export interface ChatMessage {
  who: 'patient' | 'assistant';
  text: string;
  t: string;
  draft?: boolean;
  responseType?: ResponseType;
  badgeText?: string;
}

export interface PlannerAction {
  title: string;
  role: string;
  priority: string;
  reason: string;
  requires_approval: boolean;
}

export interface QAIssueDisplay {
  type: string;
  severity: string;
  description: string;
}

export interface WorkflowStep {
  intent: { intent: string; domain: string; confidence: number };
  safety: { risk: string; review: string; routeTo: string };
  knowledge: { source: string; rule: string; relevance?: string };
  planner: { status: string; actions: PlannerAction[] };
  validation: {
    qaStatus: string;
    canAutoSend: boolean;
    requiresHumanReview: boolean;
    reasonSummary: string;
    issues: QAIssueDisplay[];
  };
}

export interface SimConversation {
  id: string;
  patient: string;
  label: string;
  initialMessages: ChatMessage[];
  workflow: WorkflowStep;
}

export interface CommandChatMessage {
  who: 'staff' | 'bot';
  text: string;
  t: string;
  actionRefs?: string[];
}

export interface ActionBadge {
  label: string;
  tone: Tone;
}

export interface ActionRow {
  k: string;
  v: string;
}

export interface CommandAction {
  id: string;
  iconKey: string;
  tone: Tone;
  title: string;
  badges: ActionBadge[];
  rows: ActionRow[];
}

export interface Task {
  id: string;
  title: string;
  sub: string;
  source: string;
  iconKey: string;
  tone: Tone;
  assignee: Staff;
  priority: Priority;
  priorityTone: Tone;
  status: TaskStatus;
  statusTone: Tone;
  due: string;
  aiCreated: boolean;
  category: string;
}

export interface TaskFilter {
  key: string;
  label: string;
}

export interface ReviewRule {
  trigger: string;
  resolution: string;
  tone: Tone;
}

export interface KnowledgeSource {
  title: string;
  sub: string;
  iconKey: string;
  tone: Tone;
}

export interface SafetySetting {
  id: string;
  text: string;
  sub: string;
  on: boolean;
  locked?: boolean;
}

export interface ClinicProfile {
  name: string;
  specialty: string;
  assistant: string;
  tone: string;
}
