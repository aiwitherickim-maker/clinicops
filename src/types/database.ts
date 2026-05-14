// Auto-aligned with supabase/schema.sql
// These types mirror the DB rows exactly.

export type MessageStatus = 'new' | 'analyzing' | 'needs_review' | 'approved' | 'escalated' | 'resolved';
export type TaskStatus    = 'open' | 'pending_approval' | 'needs_review' | 'resolved' | 'in_progress';
export type TaskPriority  = 'urgent' | 'high' | 'medium' | 'low';
export type DraftStatus   = 'needs_review' | 'approved' | 'rejected' | 'sent';

export interface DbClinic {
  id: string;
  name: string;
  specialty: string | null;
  assistant_name: string | null;
  tone: string | null;
  created_at: string;
}

export interface DbStaff {
  id: string;
  clinic_id: string;
  name: string;
  role: string;
  email: string | null;
  created_at: string;
}

export interface DbPatientMessage {
  id: string;
  clinic_id: string;
  patient_name: string;
  message_text: string;
  channel: string;
  category: string | null;
  risk_level: string | null;
  route_to: string | null;
  status: MessageStatus;
  created_at: string;
  updated_at: string;
}

export interface DbAgentAnalysis {
  id: string;
  message_id: string;
  intent: Record<string, unknown> | null;
  safety: Record<string, unknown> | null;
  knowledge: Record<string, unknown> | null;
  actions: Record<string, unknown> | null;
  draft: Record<string, unknown> | null;
  validation: Record<string, unknown> | null;
  final_status: string | null;
  created_at: string;
}

export type DraftType = 'immediate_patient_response' | 'staff_followup_draft';

export interface DbDraftResponse {
  id: string;
  message_id: string;
  analysis_id: string | null;
  draft_text: string;
  draft_type: DraftType;
  status: DraftStatus;
  edited_text: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbTask {
  id: string;
  clinic_id: string;
  source_message_id: string | null;
  title: string;
  description: string | null;
  assigned_to: string | null;
  assigned_role: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  ai_created: boolean;
  due_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbKnowledgeSource {
  id: string;
  clinic_id: string;
  title: string;
  category: string | null;
  content: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Supabase typed schema — used by createClient<Database>()
export interface Database {
  public: {
    Tables: {
      clinics: {
        Row: DbClinic;
        Insert: Omit<DbClinic, 'id' | 'created_at'>;
        Update: Partial<Omit<DbClinic, 'id' | 'created_at'>>;
      };
      staff: {
        Row: DbStaff;
        Insert: Omit<DbStaff, 'id' | 'created_at'>;
        Update: Partial<Omit<DbStaff, 'id' | 'created_at'>>;
      };
      patient_messages: {
        Row: DbPatientMessage;
        Insert: Omit<DbPatientMessage, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DbPatientMessage, 'id' | 'created_at'>>;
      };
      agent_analyses: {
        Row: DbAgentAnalysis;
        Insert: Omit<DbAgentAnalysis, 'id' | 'created_at'>;
        Update: Partial<Omit<DbAgentAnalysis, 'id' | 'created_at'>>;
      };
      draft_responses: {
        Row: DbDraftResponse;
        Insert: Omit<DbDraftResponse, 'id' | 'created_at' | 'updated_at'> & { draft_type?: DraftType };
        Update: Partial<Omit<DbDraftResponse, 'id' | 'created_at'>>;
      };
      tasks: {
        Row: DbTask;
        Insert: Omit<DbTask, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DbTask, 'id' | 'created_at'>>;
      };
      clinic_knowledge_sources: {
        Row: DbKnowledgeSource;
        Insert: Omit<DbKnowledgeSource, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DbKnowledgeSource, 'id' | 'created_at'>>;
      };
    };
  };
}
