import type { InboxMessage, CommandAction, WorkflowStep, ChatMessage } from '@/types';

// Placeholder: classify a patient message and return workflow result
export async function classifyPatientMessage(
  _message: string
): Promise<WorkflowStep> {
  throw new Error('Not implemented: connect to Claude API');
}

// Placeholder: generate a draft response for a patient message
export async function generateDraftResponse(
  _message: string,
  _context: Partial<InboxMessage>
): Promise<string> {
  throw new Error('Not implemented: connect to Claude API');
}

// Placeholder: run the back-office command
export async function runBackOfficeCommand(
  _prompt: string,
  _existingActions: CommandAction[]
): Promise<{ reply: string; newActions: CommandAction[] }> {
  throw new Error('Not implemented: connect to Claude API');
}

// Placeholder: generate a morning worklist summary
export async function generateMorningWorklist(
  _inbox: InboxMessage[]
): Promise<string> {
  throw new Error('Not implemented: connect to Claude API');
}

// Placeholder: simulate chat response for patient-facing chat
export async function simulateChatResponse(
  _messages: ChatMessage[],
  _clinicContext: { name: string; assistant: string }
): Promise<ChatMessage> {
  throw new Error('Not implemented: connect to Claude API');
}
