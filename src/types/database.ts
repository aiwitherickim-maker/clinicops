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

// ── Backoffice status union types ─────────────────────────────────────────────

export type PriorAuthStatus =
  | 'not_started' | 'not_required' | 'required' | 'submitted'
  | 'pending' | 'approved' | 'denied' | 'needs_more_info' | 'expired';

export type BillingCaseStatus =
  | 'needs_review' | 'benefits_pending' | 'pa_pending'
  | 'cleared' | 'blocked' | 'patient_followup_needed';

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';
export type ProcedureStatus = 'planned' | 'scheduled' | 'completed' | 'cancelled';
export type EligibilityStatus = 'unknown' | 'active' | 'inactive' | 'terminated';
export type BenefitsStatus = 'not_verified' | 'verified' | 'pending' | 'failed';
export type FinancialClearanceStatus = 'not_cleared' | 'cleared' | 'pending' | 'blocked';

// ── Backoffice entity interfaces ───────────────────────────────────────────────

export interface DbPatient {
  id: string;
  clinic_id: string;
  full_name: string;
  date_of_birth: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbAppointment {
  id: string;
  clinic_id: string;
  patient_id: string;
  appointment_date: string;
  appointment_type: string | null;
  provider_name: string | null;
  status: AppointmentStatus;
  created_at: string;
  updated_at: string;
}

export interface DbInsuranceProfile {
  id: string;
  clinic_id: string;
  patient_id: string;
  payer_name: string;
  plan_name: string | null;
  member_id: string | null;
  eligibility_status: EligibilityStatus;
  benefits_status: BenefitsStatus;
  benefits_verified_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbProcedure {
  id: string;
  clinic_id: string;
  patient_id: string;
  appointment_id: string | null;
  procedure_name: string;
  cpt_code: string | null;
  diagnosis_code: string | null;
  requires_prior_auth: boolean;
  status: ProcedureStatus;
  created_at: string;
  updated_at: string;
}

export interface DbPriorAuthorization {
  id: string;
  clinic_id: string;
  patient_id: string;
  procedure_id: string;
  insurance_profile_id: string | null;
  payer_name: string | null;
  status: PriorAuthStatus;
  auth_number: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  expires_at: string | null;
  missing_items: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbBillingCase {
  id: string;
  clinic_id: string;
  patient_id: string;
  appointment_id: string | null;
  procedure_id: string | null;
  insurance_profile_id: string | null;
  prior_auth_id: string | null;
  status: BillingCaseStatus;
  benefits_status: BenefitsStatus;
  financial_clearance_status: FinancialClearanceStatus;
  estimated_patient_responsibility: number | null;
  estimated_allowed_amount: number | null;
  estimated_reimbursement: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbBackofficeCommand {
  id: string;
  clinic_id: string;
  staff_id: string | null;
  command_text: string;
  command_type: string | null;
  result: Record<string, unknown> | null;
  created_at: string;
}

export type BackofficeDraftStatus = 'draft' | 'ready_for_review' | 'approved' | 'used' | 'archived';
export type BackofficeDraftType   =
  | 'payer_call_script'
  | 'patient_update'
  | 'internal_note'
  | 'prior_auth_checklist'
  | 'appeal_draft'
  | 'billing_followup';

export interface DbBackofficeDraft {
  id:                   string;
  clinic_id:            string;
  patient_id:           string | null;
  appointment_id:       string | null;
  procedure_id:         string | null;
  prior_auth_id:        string | null;
  billing_case_id:      string | null;
  task_id:              string | null;
  command_id:           string | null;
  draft_type:           string;
  title:                string;
  content:              string;
  intended_audience:    string;
  intended_sender_role: string | null;
  status:               string;
  created_by_agent:     boolean;
  metadata:             Record<string, unknown>;
  created_at:           string;
  updated_at:           string;
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
      patients: {
        Row: DbPatient;
        Insert: Omit<DbPatient, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DbPatient, 'id' | 'created_at'>>;
      };
      appointments: {
        Row: DbAppointment;
        Insert: Omit<DbAppointment, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DbAppointment, 'id' | 'created_at'>>;
      };
      insurance_profiles: {
        Row: DbInsuranceProfile;
        Insert: Omit<DbInsuranceProfile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DbInsuranceProfile, 'id' | 'created_at'>>;
      };
      procedures: {
        Row: DbProcedure;
        Insert: Omit<DbProcedure, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DbProcedure, 'id' | 'created_at'>>;
      };
      prior_authorizations: {
        Row: DbPriorAuthorization;
        Insert: Omit<DbPriorAuthorization, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DbPriorAuthorization, 'id' | 'created_at'>>;
      };
      billing_cases: {
        Row: DbBillingCase;
        Insert: Omit<DbBillingCase, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DbBillingCase, 'id' | 'created_at'>>;
      };
      backoffice_commands: {
        Row: DbBackofficeCommand;
        Insert: Omit<DbBackofficeCommand, 'id' | 'created_at'>;
        Update: never; // Commands are immutable
      };
      backoffice_drafts: {
        Row: DbBackofficeDraft;
        Insert: Omit<DbBackofficeDraft, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DbBackofficeDraft, 'id' | 'created_at'>>;
      };
    };
  };
}
