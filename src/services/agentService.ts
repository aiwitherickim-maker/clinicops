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
// Streams NDJSON: emits stage logs via onStageLog as they arrive, resolves with final result.
export async function analyzePatientMessageAndPersist(
  messageText: string,
  patientName: string,
  clinicId = 'a0000000-0000-0000-0000-000000000001',
  onStageLog?: (log: StageLog) => void,
): Promise<AnalyzeResult> {
  console.log('[agentService] calling /api/analyze-message (streaming)');

  const res = await fetch('/api/analyze-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageText, patientName, clinicId }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`analyze-message API returned ${res.status}`);
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: AnalyzeResult | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const event = JSON.parse(line) as { type: string; [key: string]: any };
          if (event.type === 'stage_log') {
            onStageLog?.(event.log as StageLog);
          } else if (event.type === 'result') {
            result = {
              workflow:     event.workflow     as WorkflowStep,
              draftText:    event.draftText    as string,
              badgeText:    event.badgeText    as string,
              responseType: event.responseType as ResponseType,
              messageId:    event.messageId    as string | null,
              stageLogs:    event.stageLogs    as StageLog[],
            };
          } else if (event.type === 'error') {
            throw new Error(event.message as string);
          }
        } catch (parseErr) {
          console.warn('[agentService] Failed to parse stream line:', line, parseErr);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!result) throw new Error('No result received from workflow stream');
  return result;
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
