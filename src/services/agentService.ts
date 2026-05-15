import type { InboxMessage, CommandAction, WorkflowStep, ChatMessage, ResponseType, StageLog } from '@/types';

// ─── Patient message analysis ─────────────────────────────────────────────────

export interface AnalyzeResult {
  workflow: WorkflowStep;
  draftText: string;
  badgeText: string;
  responseType: ResponseType;
  messageId: string | null;
  stageLogs: StageLog[];
}

// Calls the server-side API route which runs Intent + Safety agents via Claude.
// clinicId defaults to the demo clinic from the seed.
export async function analyzePatientMessageAndPersist(
  messageText: string,
  patientName: string,
  clinicId = 'a0000000-0000-0000-0000-000000000001',
): Promise<AnalyzeResult> {
  console.log('[agentService] calling /api/analyze-message');

  const res = await fetch('/api/analyze-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageText, patientName, clinicId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[agentService] API error:', res.status, err);
    throw new Error(`analyze-message API returned ${res.status}`);
  }

  const data = await res.json() as AnalyzeResult;
  console.log('[agentService] API response:', data);
  return data;
}

// ─── Staff follow-up draft ────────────────────────────────────────────────────

export interface GenerateStaffDraftRequest {
  messageText: string;
  patientName: string;
  category: string;
  riskLevel: string;
  routeTo: string;
  taskTitle: string;
  taskAssignee: string;
  reason: string;
  clinicPhone?: string;
}

export interface StaffFollowupDraftClientResult {
  draftText: string;
  draftType: string;
  intendedSenderRole: string;
  requiresClinicianApproval: boolean;
  canBeSentByAssignedStaff: boolean;
  missingInformation: string[];
  safetyNotes: string;
  reasonSummary: string;
}

export async function generateStaffFollowupDraft(
  req: GenerateStaffDraftRequest,
): Promise<StaffFollowupDraftClientResult> {
  console.log('[agentService] calling /api/generate-staff-draft for:', req.patientName);

  const res = await fetch('/api/generate-staff-draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[agentService] generate-staff-draft API error:', res.status, err);
    throw new Error(`generate-staff-draft API returned ${res.status}`);
  }

  const data = await res.json() as StaffFollowupDraftClientResult;
  console.log('[agentService] staff draft received | type:', data.draftType, '| role:', data.intendedSenderRole);
  return data;
}

// ─── Unimplemented stubs ──────────────────────────────────────────────────────

export async function classifyPatientMessage(
  _message: string
): Promise<WorkflowStep> {
  throw new Error('Not implemented: use analyzePatientMessageAndPersist');
}

export async function generateDraftResponse(
  _message: string,
  _context: Partial<InboxMessage>
): Promise<string> {
  throw new Error('Not implemented: connect to Claude API');
}

export async function runBackOfficeCommand(
  _prompt: string,
  _existingActions: CommandAction[]
): Promise<{ reply: string; newActions: CommandAction[] }> {
  throw new Error('Not implemented: connect to Claude API');
}

export async function generateMorningWorklist(
  _inbox: InboxMessage[]
): Promise<string> {
  throw new Error('Not implemented: connect to Claude API');
}

export async function simulateChatResponse(
  _messages: ChatMessage[],
  _clinicContext: { name: string; assistant: string }
): Promise<ChatMessage> {
  throw new Error('Not implemented: connect to Claude API');
}
