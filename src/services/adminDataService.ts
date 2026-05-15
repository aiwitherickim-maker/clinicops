import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { createTask } from '@/services/db/taskDbService';
import type {
  DbPatient,
  DbAppointment,
  DbInsuranceProfile,
  DbProcedure,
  DbPriorAuthorization,
  DbBillingCase,
  DbBackofficeCommand,
  DbTask,
  PriorAuthStatus,
  BillingCaseStatus,
  BenefitsStatus,
  FinancialClearanceStatus,
  TaskPriority,
} from '@/types/database';

// ── AdminCaseSummary ──────────────────────────────────────────────────────────

export interface AdminCaseSummary {
  patient: DbPatient;
  appointments: DbAppointment[];
  insuranceProfiles: DbInsuranceProfile[];
  procedures: DbProcedure[];
  priorAuthorizations: DbPriorAuthorization[];
  billingCases: DbBillingCase[];
}

// ── Time helpers (computed once at module load) ───────────────────────────────

const now = new Date();
const daysFromNow = (n: number) => new Date(now.getTime() + n * 86400000).toISOString();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();
const hoursAgo = (n: number) => new Date(now.getTime() - n * 3600000).toISOString();
const weeksAgo = (n: number) => new Date(now.getTime() - n * 7 * 86400000).toISOString();
const monthsAgo = (n: number) => new Date(now.getTime() - n * 30 * 86400000).toISOString();
const yearsAgo = (n: number) => new Date(now.getTime() - n * 365 * 86400000).toISOString();

// ── Fixed UUIDs (must match seed_admin.sql) ───────────────────────────────────

const CLINIC_ID = 'a0000000-0000-0000-0000-000000000001';

// Patient IDs
const P_MAYA    = 'a1000000-0000-0000-0000-000000000001';
const P_DANIEL  = 'a1000000-0000-0000-0000-000000000002';
const P_ALICIA  = 'a1000000-0000-0000-0000-000000000003';
const P_PRIYA   = 'a1000000-0000-0000-0000-000000000004';
const P_ROBERT  = 'a1000000-0000-0000-0000-000000000005';

// Appointment IDs
const A_MAYA    = 'a2000000-0000-0000-0000-000000000001';
const A_DANIEL  = 'a2000000-0000-0000-0000-000000000002';
const A_ALICIA  = 'a2000000-0000-0000-0000-000000000003';
const A_PRIYA   = 'a2000000-0000-0000-0000-000000000004';
const A_ROBERT  = 'a2000000-0000-0000-0000-000000000005';

// Insurance profile IDs
const INS_MAYA   = 'a3000000-0000-0000-0000-000000000001';
const INS_DANIEL = 'a3000000-0000-0000-0000-000000000002';
const INS_ALICIA = 'a3000000-0000-0000-0000-000000000003';
const INS_PRIYA  = 'a3000000-0000-0000-0000-000000000004';
const INS_ROBERT = 'a3000000-0000-0000-0000-000000000005';

// Procedure IDs
const PROC_MAYA   = 'a4000000-0000-0000-0000-000000000001';
const PROC_DANIEL = 'a4000000-0000-0000-0000-000000000002';
const PROC_ALICIA = 'a4000000-0000-0000-0000-000000000003';
const PROC_PRIYA  = 'a4000000-0000-0000-0000-000000000004';
const PROC_ROBERT = 'a4000000-0000-0000-0000-000000000005';

// Prior auth IDs
const PA_ALICIA = 'a5000000-0000-0000-0000-000000000001';
const PA_PRIYA  = 'a5000000-0000-0000-0000-000000000002';
const PA_ROBERT = 'a5000000-0000-0000-0000-000000000003';

// Billing case IDs
const BC_MAYA   = 'a6000000-0000-0000-0000-000000000001';
const BC_DANIEL = 'a6000000-0000-0000-0000-000000000002';
const BC_ALICIA = 'a6000000-0000-0000-0000-000000000003';
const BC_PRIYA  = 'a6000000-0000-0000-0000-000000000004';
const BC_ROBERT = 'a6000000-0000-0000-0000-000000000005';

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_PATIENTS: DbPatient[] = [
  {
    id: P_MAYA,
    clinic_id: CLINIC_ID,
    full_name: 'Maya Thompson',
    date_of_birth: '1985-09-23',
    phone: '(734) 555-1001',
    email: 'maya.thompson@email.local',
    created_at: monthsAgo(6),
    updated_at: monthsAgo(6),
  },
  {
    id: P_DANIEL,
    clinic_id: CLINIC_ID,
    full_name: 'Daniel Brooks',
    date_of_birth: '1962-11-08',
    phone: '(734) 555-1002',
    email: null,
    created_at: yearsAgo(1),
    updated_at: yearsAgo(1),
  },
  {
    id: P_ALICIA,
    clinic_id: CLINIC_ID,
    full_name: 'Alicia Reed',
    date_of_birth: '1978-04-12',
    phone: '(734) 555-1003',
    email: 'alicia.reed@email.local',
    created_at: monthsAgo(3),
    updated_at: monthsAgo(3),
  },
  {
    id: P_PRIYA,
    clinic_id: CLINIC_ID,
    full_name: 'Priya Shah',
    date_of_birth: '1990-07-15',
    phone: '(734) 555-1004',
    email: null,
    created_at: monthsAgo(4),
    updated_at: monthsAgo(4),
  },
  {
    id: P_ROBERT,
    clinic_id: CLINIC_ID,
    full_name: 'Robert Chen',
    date_of_birth: '1955-03-30',
    phone: '(734) 555-1005',
    email: null,
    created_at: yearsAgo(2),
    updated_at: yearsAgo(2),
  },
];

const MOCK_APPOINTMENTS: DbAppointment[] = [
  {
    id: A_MAYA,
    clinic_id: CLINIC_ID,
    patient_id: P_MAYA,
    appointment_date: daysAgo(2),
    appointment_type: 'Intravitreal Injection',
    provider_name: 'Dr. Sarah Lee',
    status: 'completed',
    created_at: daysAgo(2),
    updated_at: daysAgo(2),
  },
  {
    id: A_DANIEL,
    clinic_id: CLINIC_ID,
    patient_id: P_DANIEL,
    appointment_date: daysFromNow(6),
    appointment_type: 'Routine Retinal Exam',
    provider_name: 'Dr. Sarah Lee',
    status: 'scheduled',
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
  },
  {
    id: A_ALICIA,
    clinic_id: CLINIC_ID,
    patient_id: P_ALICIA,
    appointment_date: daysFromNow(5),
    appointment_type: 'Retinal Detachment Repair Surgery',
    provider_name: 'Dr. Sarah Lee',
    status: 'scheduled',
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
  },
  {
    id: A_PRIYA,
    clinic_id: CLINIC_ID,
    patient_id: P_PRIYA,
    appointment_date: hoursAgo(6),
    appointment_type: 'Laser Photocoagulation',
    provider_name: 'Dr. Sarah Lee',
    status: 'completed',
    created_at: hoursAgo(6),
    updated_at: hoursAgo(6),
  },
  {
    id: A_ROBERT,
    clinic_id: CLINIC_ID,
    patient_id: P_ROBERT,
    appointment_date: daysFromNow(8),
    appointment_type: 'OCT Scan + Consultation',
    provider_name: 'Dr. Sarah Lee',
    status: 'scheduled',
    created_at: daysAgo(2),
    updated_at: daysAgo(2),
  },
];

const MOCK_INSURANCE_PROFILES: DbInsuranceProfile[] = [
  {
    id: INS_MAYA,
    clinic_id: CLINIC_ID,
    patient_id: P_MAYA,
    payer_name: 'Aetna HMO',
    plan_name: null,
    member_id: 'AET-22019',
    eligibility_status: 'active',
    benefits_status: 'verified',
    benefits_verified_at: daysAgo(2),
    notes: null,
    created_at: monthsAgo(6),
    updated_at: daysAgo(2),
  },
  {
    id: INS_DANIEL,
    clinic_id: CLINIC_ID,
    patient_id: P_DANIEL,
    payer_name: 'UnitedHealthcare PPO',
    plan_name: null,
    member_id: 'UHC-55782',
    eligibility_status: 'active',
    benefits_status: 'verified',
    benefits_verified_at: daysAgo(7),
    notes: null,
    created_at: yearsAgo(1),
    updated_at: daysAgo(7),
  },
  {
    id: INS_ALICIA,
    clinic_id: CLINIC_ID,
    patient_id: P_ALICIA,
    payer_name: 'Blue Cross Blue Shield',
    plan_name: 'Blue Care Network',
    member_id: 'BCN-88421',
    eligibility_status: 'active',
    benefits_status: 'not_verified',
    benefits_verified_at: null,
    notes: 'Benefits verification pending. Surgery scheduled in 5 days — urgent.',
    created_at: monthsAgo(3),
    updated_at: daysAgo(1),
  },
  {
    id: INS_PRIYA,
    clinic_id: CLINIC_ID,
    patient_id: P_PRIYA,
    payer_name: 'Blue Shield of California',
    plan_name: 'Blue Shield PPO',
    member_id: 'BSC-33190',
    eligibility_status: 'active',
    benefits_status: 'verified',
    benefits_verified_at: weeksAgo(3),
    notes: null,
    created_at: monthsAgo(4),
    updated_at: weeksAgo(3),
  },
  {
    id: INS_ROBERT,
    clinic_id: CLINIC_ID,
    patient_id: P_ROBERT,
    payer_name: 'Medicare Part B',
    plan_name: null,
    member_id: 'MED-CHEN-1955',
    eligibility_status: 'active',
    benefits_status: 'verified',
    benefits_verified_at: daysAgo(14),
    notes: 'Medicare covers 80% after deductible.',
    created_at: yearsAgo(2),
    updated_at: daysAgo(14),
  },
];

const MOCK_PROCEDURES: DbProcedure[] = [
  {
    id: PROC_MAYA,
    clinic_id: CLINIC_ID,
    patient_id: P_MAYA,
    appointment_id: A_MAYA,
    procedure_name: 'Intravitreal Injection (Anti-VEGF)',
    cpt_code: '67028',
    diagnosis_code: 'H35.31',
    requires_prior_auth: false,
    status: 'completed',
    created_at: daysAgo(2),
    updated_at: daysAgo(2),
  },
  {
    id: PROC_DANIEL,
    clinic_id: CLINIC_ID,
    patient_id: P_DANIEL,
    appointment_id: A_DANIEL,
    procedure_name: 'Dilated Fundus Examination',
    cpt_code: '92228',
    diagnosis_code: null,
    requires_prior_auth: false,
    status: 'planned',
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
  },
  {
    id: PROC_ALICIA,
    clinic_id: CLINIC_ID,
    patient_id: P_ALICIA,
    appointment_id: A_ALICIA,
    procedure_name: 'Retinal Detachment Repair',
    cpt_code: '67108',
    diagnosis_code: 'H33.001',
    requires_prior_auth: true,
    status: 'planned',
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
  },
  {
    id: PROC_PRIYA,
    clinic_id: CLINIC_ID,
    patient_id: P_PRIYA,
    appointment_id: A_PRIYA,
    procedure_name: 'Laser Photocoagulation',
    cpt_code: '67228',
    diagnosis_code: 'H35.02',
    requires_prior_auth: true,
    status: 'completed',
    created_at: hoursAgo(6),
    updated_at: hoursAgo(6),
  },
  {
    id: PROC_ROBERT,
    clinic_id: CLINIC_ID,
    patient_id: P_ROBERT,
    appointment_id: A_ROBERT,
    procedure_name: 'Optical Coherence Tomography',
    cpt_code: '92134',
    diagnosis_code: null,
    requires_prior_auth: false,
    status: 'planned',
    created_at: daysAgo(2),
    updated_at: daysAgo(2),
  },
];

const MOCK_PRIOR_AUTHORIZATIONS: DbPriorAuthorization[] = [
  {
    id: PA_ALICIA,
    clinic_id: CLINIC_ID,
    patient_id: P_ALICIA,
    procedure_id: PROC_ALICIA,
    insurance_profile_id: INS_ALICIA,
    payer_name: 'Blue Cross Blue Shield',
    status: 'not_started',
    auth_number: null,
    submitted_at: null,
    approved_at: null,
    expires_at: null,
    missing_items: [
      'Medical records from referring physician',
      'Clinical notes documenting medical necessity',
      'OCT imaging results',
      'Failed conservative treatment documentation',
    ],
    notes: 'Surgery in 5 days. PA not started. Must be submitted immediately.',
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
  },
  {
    id: PA_PRIYA,
    clinic_id: CLINIC_ID,
    patient_id: P_PRIYA,
    procedure_id: PROC_PRIYA,
    insurance_profile_id: INS_PRIYA,
    payer_name: 'Blue Shield of California',
    status: 'approved',
    auth_number: 'PA-2024-77341',
    submitted_at: weeksAgo(3),
    approved_at: weeksAgo(2),
    expires_at: daysFromNow(180),
    missing_items: [],
    notes: null,
    created_at: weeksAgo(3),
    updated_at: weeksAgo(2),
  },
  {
    id: PA_ROBERT,
    clinic_id: CLINIC_ID,
    patient_id: P_ROBERT,
    procedure_id: PROC_ROBERT,
    insurance_profile_id: INS_ROBERT,
    payer_name: 'Medicare Part B',
    status: 'not_required',
    auth_number: null,
    submitted_at: null,
    approved_at: null,
    expires_at: null,
    missing_items: [],
    notes: 'Medicare Part B covers OCT without prior authorization.',
    created_at: daysAgo(2),
    updated_at: daysAgo(2),
  },
];

const MOCK_BILLING_CASES: DbBillingCase[] = [
  {
    id: BC_MAYA,
    clinic_id: CLINIC_ID,
    patient_id: P_MAYA,
    appointment_id: A_MAYA,
    procedure_id: PROC_MAYA,
    insurance_profile_id: INS_MAYA,
    prior_auth_id: null,
    status: 'needs_review',
    benefits_status: 'verified',
    financial_clearance_status: 'cleared',
    estimated_patient_responsibility: 150.00,
    estimated_allowed_amount: null,
    estimated_reimbursement: null,
    notes: 'Post-injection clinical issue flagged. Billing cleared but hold for clinical resolution.',
    created_at: daysAgo(2),
    updated_at: daysAgo(2),
  },
  {
    id: BC_DANIEL,
    clinic_id: CLINIC_ID,
    patient_id: P_DANIEL,
    appointment_id: A_DANIEL,
    procedure_id: PROC_DANIEL,
    insurance_profile_id: INS_DANIEL,
    prior_auth_id: null,
    status: 'cleared',
    benefits_status: 'verified',
    financial_clearance_status: 'cleared',
    estimated_patient_responsibility: 40.00,
    estimated_allowed_amount: null,
    estimated_reimbursement: null,
    notes: null,
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
  },
  {
    id: BC_ALICIA,
    clinic_id: CLINIC_ID,
    patient_id: P_ALICIA,
    appointment_id: A_ALICIA,
    procedure_id: PROC_ALICIA,
    insurance_profile_id: INS_ALICIA,
    prior_auth_id: PA_ALICIA,
    status: 'blocked',
    benefits_status: 'not_verified',
    financial_clearance_status: 'not_cleared',
    estimated_patient_responsibility: 3200.00,
    estimated_allowed_amount: 18500.00,
    estimated_reimbursement: 15300.00,
    notes: 'Surgery scheduled in 5 days. Benefits not verified. Prior auth not started. Patient asked about cost — needs immediate billing review.',
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
  },
  {
    id: BC_PRIYA,
    clinic_id: CLINIC_ID,
    patient_id: P_PRIYA,
    appointment_id: A_PRIYA,
    procedure_id: PROC_PRIYA,
    insurance_profile_id: INS_PRIYA,
    prior_auth_id: PA_PRIYA,
    status: 'needs_review',
    benefits_status: 'verified',
    financial_clearance_status: 'cleared',
    estimated_patient_responsibility: 200.00,
    estimated_allowed_amount: null,
    estimated_reimbursement: null,
    notes: 'Post-procedure complication. Clinical team alerted. Billing hold pending resolution.',
    created_at: hoursAgo(6),
    updated_at: hoursAgo(6),
  },
  {
    id: BC_ROBERT,
    clinic_id: CLINIC_ID,
    patient_id: P_ROBERT,
    appointment_id: A_ROBERT,
    procedure_id: PROC_ROBERT,
    insurance_profile_id: INS_ROBERT,
    prior_auth_id: PA_ROBERT,
    status: 'cleared',
    benefits_status: 'verified',
    financial_clearance_status: 'cleared',
    estimated_patient_responsibility: 0.00,
    estimated_allowed_amount: null,
    estimated_reimbursement: null,
    notes: 'Medicare covers 80%. No PA required.',
    created_at: daysAgo(2),
    updated_at: daysAgo(2),
  },
];

// ── Read functions ────────────────────────────────────────────────────────────

export async function getPatients(clinicId?: string): Promise<DbPatient[]> {
  if (!isSupabaseConfigured()) {
    return clinicId
      ? MOCK_PATIENTS.filter(p => p.clinic_id === clinicId)
      : MOCK_PATIENTS;
  }

  const sb = getSupabaseClient()!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (sb.from('patients') as any).select('*').order('full_name', { ascending: true });
  if (clinicId) query = query.eq('clinic_id', clinicId);

  const { data, error } = await query;
  if (error) { console.error('[adminDataService] getPatients:', error.message); return MOCK_PATIENTS; }
  return data ?? MOCK_PATIENTS;
}

export class AmbiguousPatientError extends Error {
  constructor(public matches: DbPatient[]) {
    super(`Ambiguous name — ${matches.length} patients match: ${matches.map(p => p.full_name).join(', ')}`);
  }
}

// ── Patient matching ──────────────────────────────────────────────────────────

export interface PatientMatchResult {
  status: 'matched' | 'needs_confirmation' | 'ambiguous' | 'not_found';
  query: string;
  selected_patient: DbPatient | null;
  candidates: DbPatient[];
}

function classifyMatches(query: string, candidates: DbPatient[]): PatientMatchResult {
  if (candidates.length === 0) {
    return { status: 'not_found', query, selected_patient: null, candidates: [] };
  }
  // Exact full-name match wins immediately
  const exact = candidates.filter(p => p.full_name.toLowerCase() === query.toLowerCase());
  if (exact.length === 1) {
    return { status: 'matched', query, selected_patient: exact[0], candidates: exact };
  }
  if (candidates.length === 1) {
    // Single partial match → ask for confirmation
    return { status: 'needs_confirmation', query, selected_patient: null, candidates };
  }
  return { status: 'ambiguous', query, selected_patient: null, candidates };
}

export async function findPatientCandidates(name: string, clinicId?: string): Promise<PatientMatchResult> {
  const lower = name.toLowerCase();

  if (!isSupabaseConfigured()) {
    const matches = MOCK_PATIENTS.filter(p =>
      p.full_name.toLowerCase().includes(lower) &&
      (!clinicId || p.clinic_id === clinicId)
    );
    return classifyMatches(name, matches);
  }

  const sb = getSupabaseClient()!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (sb.from('patients') as any).select('*').ilike('full_name', `%${name}%`);
  if (clinicId) query = query.eq('clinic_id', clinicId);
  const { data, error } = await query.limit(5);

  if (error) {
    // Table may not exist yet (migration pending) — fall back to mock
    console.warn('[adminDataService] findPatientCandidates DB error:', error.message, '— falling back to mock');
    const mockMatches = MOCK_PATIENTS.filter(p =>
      p.full_name.toLowerCase().includes(lower) &&
      (!clinicId || p.clinic_id === clinicId)
    );
    return classifyMatches(name, mockMatches);
  }

  return classifyMatches(name, (data ?? []) as DbPatient[]);
}

export async function getPatientByName(name: string, clinicId?: string): Promise<DbPatient | null> {
  if (!isSupabaseConfigured()) {
    // Mock mode: partial match, throw on ambiguity
    const lower = name.toLowerCase();
    const matches = MOCK_PATIENTS.filter(p =>
      p.full_name.toLowerCase().includes(lower) &&
      (!clinicId || p.clinic_id === clinicId)
    );
    if (matches.length > 1) throw new AmbiguousPatientError(matches);
    return matches[0] ?? null;
  }

  const sb = getSupabaseClient()!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (sb.from('patients') as any).select('*').ilike('full_name', `%${name}%`);
  if (clinicId) query = query.eq('clinic_id', clinicId);

  // Use limit(5) — no .single() so partial names don't error
  const { data, error } = await query.limit(5);

  if (error) {
    // DB error (e.g. table not yet migrated) — fall back to mock data
    console.warn('[adminDataService] getPatientByName DB error:', error.message, '— falling back to mock');
    const lower = name.toLowerCase();
    const mockMatches = MOCK_PATIENTS.filter(p =>
      p.full_name.toLowerCase().includes(lower) &&
      (!clinicId || p.clinic_id === clinicId)
    );
    if (mockMatches.length > 1) throw new AmbiguousPatientError(mockMatches);
    return mockMatches[0] ?? null;
  }

  // Supabase returned results — prefer real data, no mock fallback
  if (!data || data.length === 0) return null;
  if (data.length > 1) throw new AmbiguousPatientError(data as DbPatient[]);
  return data[0] as DbPatient;
}

export async function getAppointments(clinicId?: string): Promise<DbAppointment[]> {
  if (!isSupabaseConfigured()) {
    return clinicId
      ? MOCK_APPOINTMENTS.filter(a => a.clinic_id === clinicId)
      : MOCK_APPOINTMENTS;
  }

  const sb = getSupabaseClient()!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (sb.from('appointments') as any)
    .select('*')
    .order('appointment_date', { ascending: false });
  if (clinicId) query = query.eq('clinic_id', clinicId);

  const { data, error } = await query;
  if (error) { console.error('[adminDataService] getAppointments:', error.message); return MOCK_APPOINTMENTS; }
  return data ?? MOCK_APPOINTMENTS;
}

export async function getUpcomingAppointments(
  daysAhead = 14,
  clinicId?: string,
): Promise<DbAppointment[]> {
  if (!isSupabaseConfigured()) {
    const cutoff = new Date(now.getTime() + daysAhead * 86400000).toISOString();
    return MOCK_APPOINTMENTS.filter(a =>
      a.appointment_date >= now.toISOString() &&
      a.appointment_date <= cutoff &&
      (!clinicId || a.clinic_id === clinicId)
    );
  }

  const sb = getSupabaseClient()!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (sb.from('appointments') as any)
    .select('*')
    .gte('appointment_date', 'now()')
    .lte('appointment_date', `now() + interval '${daysAhead} days'`)
    .order('appointment_date', { ascending: true });
  if (clinicId) query = query.eq('clinic_id', clinicId);

  const { data, error } = await query;
  if (error) { console.error('[adminDataService] getUpcomingAppointments:', error.message); return []; }
  return data ?? [];
}

export async function getInsuranceProfiles(clinicId?: string): Promise<DbInsuranceProfile[]> {
  if (!isSupabaseConfigured()) {
    return clinicId
      ? MOCK_INSURANCE_PROFILES.filter(ip => ip.clinic_id === clinicId)
      : MOCK_INSURANCE_PROFILES;
  }

  const sb = getSupabaseClient()!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (sb.from('insurance_profiles') as any).select('*');
  if (clinicId) query = query.eq('clinic_id', clinicId);

  const { data, error } = await query;
  if (error) { console.error('[adminDataService] getInsuranceProfiles:', error.message); return MOCK_INSURANCE_PROFILES; }
  return data ?? MOCK_INSURANCE_PROFILES;
}

export async function getInsuranceProfileByPatient(patientId: string): Promise<DbInsuranceProfile | null> {
  if (!isSupabaseConfigured()) {
    return MOCK_INSURANCE_PROFILES.find(ip => ip.patient_id === patientId) ?? null;
  }

  const sb = getSupabaseClient()!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('insurance_profiles') as any)
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error) { console.error('[adminDataService] getInsuranceProfileByPatient:', error.message); return null; }
  return data;
}

export async function getProcedures(clinicId?: string): Promise<DbProcedure[]> {
  if (!isSupabaseConfigured()) {
    return clinicId
      ? MOCK_PROCEDURES.filter(p => p.clinic_id === clinicId)
      : MOCK_PROCEDURES;
  }

  const sb = getSupabaseClient()!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (sb.from('procedures') as any).select('*');
  if (clinicId) query = query.eq('clinic_id', clinicId);

  const { data, error } = await query;
  if (error) { console.error('[adminDataService] getProcedures:', error.message); return MOCK_PROCEDURES; }
  return data ?? MOCK_PROCEDURES;
}

export async function getPriorAuthorizations(clinicId?: string): Promise<DbPriorAuthorization[]> {
  if (!isSupabaseConfigured()) {
    return clinicId
      ? MOCK_PRIOR_AUTHORIZATIONS.filter(pa => pa.clinic_id === clinicId)
      : MOCK_PRIOR_AUTHORIZATIONS;
  }

  const sb = getSupabaseClient()!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (sb.from('prior_authorizations') as any).select('*');
  if (clinicId) query = query.eq('clinic_id', clinicId);

  const { data, error } = await query;
  if (error) { console.error('[adminDataService] getPriorAuthorizations:', error.message); return MOCK_PRIOR_AUTHORIZATIONS; }
  return data ?? MOCK_PRIOR_AUTHORIZATIONS;
}

export async function getBillingCases(clinicId?: string): Promise<DbBillingCase[]> {
  if (!isSupabaseConfigured()) {
    return clinicId
      ? MOCK_BILLING_CASES.filter(bc => bc.clinic_id === clinicId)
      : MOCK_BILLING_CASES;
  }

  const sb = getSupabaseClient()!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (sb.from('billing_cases') as any)
    .select('*')
    .order('created_at', { ascending: false });
  if (clinicId) query = query.eq('clinic_id', clinicId);

  const { data, error } = await query;
  if (error) { console.error('[adminDataService] getBillingCases:', error.message); return MOCK_BILLING_CASES; }
  return data ?? MOCK_BILLING_CASES;
}

// ── Summary function ──────────────────────────────────────────────────────────

export async function getAdminCaseSummary(patientId: string): Promise<AdminCaseSummary | null> {
  if (!isSupabaseConfigured()) {
    const patient = MOCK_PATIENTS.find(p => p.id === patientId) ?? null;
    if (!patient) return null;

    return {
      patient,
      appointments: MOCK_APPOINTMENTS.filter(a => a.patient_id === patientId),
      insuranceProfiles: MOCK_INSURANCE_PROFILES.filter(ip => ip.patient_id === patientId),
      procedures: MOCK_PROCEDURES.filter(p => p.patient_id === patientId),
      priorAuthorizations: MOCK_PRIOR_AUTHORIZATIONS.filter(pa => pa.patient_id === patientId),
      billingCases: MOCK_BILLING_CASES.filter(bc => bc.patient_id === patientId),
    };
  }

  const sb = getSupabaseClient()!;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patientQuery = (sb.from('patients') as any)
    .select('*')
    .eq('id', patientId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const appointmentsQuery = (sb.from('appointments') as any)
    .select('*')
    .eq('patient_id', patientId)
    .order('appointment_date', { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insuranceProfilesQuery = (sb.from('insurance_profiles') as any)
    .select('*')
    .eq('patient_id', patientId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proceduresQuery = (sb.from('procedures') as any)
    .select('*')
    .eq('patient_id', patientId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const priorAuthsQuery = (sb.from('prior_authorizations') as any)
    .select('*')
    .eq('patient_id', patientId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const billingCasesQuery = (sb.from('billing_cases') as any)
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  const [
    patientResult,
    appointmentsResult,
    insuranceResult,
    proceduresResult,
    priorAuthsResult,
    billingResult,
  ] = await Promise.all([
    patientQuery,
    appointmentsQuery,
    insuranceProfilesQuery,
    proceduresQuery,
    priorAuthsQuery,
    billingCasesQuery,
  ]);

  if (patientResult.error || !patientResult.data) {
    console.warn('[adminDataService] getAdminCaseSummary: patient lookup failed:', patientResult.error?.message, '— using mock fallback');
    const patient = MOCK_PATIENTS.find(p => p.id === patientId) ?? null;
    if (!patient) return null;
    return {
      patient,
      appointments:        MOCK_APPOINTMENTS.filter(a => a.patient_id === patientId),
      insuranceProfiles:   MOCK_INSURANCE_PROFILES.filter(ip => ip.patient_id === patientId),
      procedures:          MOCK_PROCEDURES.filter(p => p.patient_id === patientId),
      priorAuthorizations: MOCK_PRIOR_AUTHORIZATIONS.filter(pa => pa.patient_id === patientId),
      billingCases:        MOCK_BILLING_CASES.filter(bc => bc.patient_id === patientId),
    };
  }

  if (appointmentsResult.error) console.error('[adminDataService] getAdminCaseSummary appointments:', appointmentsResult.error.message);
  if (insuranceResult.error) console.error('[adminDataService] getAdminCaseSummary insurance_profiles:', insuranceResult.error.message);
  if (proceduresResult.error) console.error('[adminDataService] getAdminCaseSummary procedures:', proceduresResult.error.message);
  if (priorAuthsResult.error) console.error('[adminDataService] getAdminCaseSummary prior_authorizations:', priorAuthsResult.error.message);
  if (billingResult.error) console.error('[adminDataService] getAdminCaseSummary billing_cases:', billingResult.error.message);

  return {
    patient: patientResult.data,
    appointments: appointmentsResult.data ?? [],
    insuranceProfiles: insuranceResult.data ?? [],
    procedures: proceduresResult.data ?? [],
    priorAuthorizations: priorAuthsResult.data ?? [],
    billingCases: billingResult.data ?? [],
  };
}

// ── Update functions ──────────────────────────────────────────────────────────

export async function updatePriorAuthStatus(
  priorAuthId: string,
  status: PriorAuthStatus,
  updates?: {
    auth_number?: string;
    submitted_at?: string;
    approved_at?: string;
    expires_at?: string;
    missing_items?: string[];
    notes?: string;
  },
): Promise<DbPriorAuthorization | null> {
  if (!isSupabaseConfigured()) {
    const pa = MOCK_PRIOR_AUTHORIZATIONS.find(p => p.id === priorAuthId);
    if (!pa) return null;
    return {
      ...pa,
      status,
      ...updates,
      updated_at: new Date().toISOString(),
    };
  }

  const sb = getSupabaseClient()!;
  const payload = { status, ...updates, updated_at: new Date().toISOString() };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('prior_authorizations') as any)
    .update(payload)
    .eq('id', priorAuthId)
    .select()
    .single();
  if (error) { console.error('[adminDataService] updatePriorAuthStatus:', error.message); return null; }
  return data;
}

export async function updateBillingCaseStatus(
  billingCaseId: string,
  status: BillingCaseStatus,
  updates?: {
    benefits_status?: BenefitsStatus;
    financial_clearance_status?: FinancialClearanceStatus;
    notes?: string;
    estimated_patient_responsibility?: number;
  },
): Promise<DbBillingCase | null> {
  if (!isSupabaseConfigured()) {
    const bc = MOCK_BILLING_CASES.find(b => b.id === billingCaseId);
    if (!bc) return null;
    return {
      ...bc,
      status,
      ...updates,
      updated_at: new Date().toISOString(),
    };
  }

  const sb = getSupabaseClient()!;
  const payload = { status, ...updates, updated_at: new Date().toISOString() };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('billing_cases') as any)
    .update(payload)
    .eq('id', billingCaseId)
    .select()
    .single();
  if (error) { console.error('[adminDataService] updateBillingCaseStatus:', error.message); return null; }
  return data;
}

// ── Task creation helpers ─────────────────────────────────────────────────────

export async function createPriorAuthTask(input: {
  clinicId: string;
  patientName: string;
  priorAuthId: string;
  procedureName: string;
  priority?: TaskPriority;
}): Promise<DbTask | null> {
  return createTask({
    clinic_id: input.clinicId,
    source_message_id: null,
    title: `Submit Prior Auth: ${input.procedureName} — ${input.patientName}`,
    description: `Prior authorization ID: ${input.priorAuthId}. Submit to payer and collect all required documentation before the procedure date.`,
    assigned_to: null,
    assigned_role: 'Billing',
    priority: input.priority ?? 'high',
    status: 'open',
    ai_created: false,
    due_at: null,
  });
}

export async function createBillingTask(input: {
  clinicId: string;
  patientName: string;
  billingCaseId: string;
  procedureName: string;
  priority?: TaskPriority;
}): Promise<DbTask | null> {
  return createTask({
    clinic_id: input.clinicId,
    source_message_id: null,
    title: `Billing Review: ${input.procedureName} — ${input.patientName}`,
    description: `Billing case ID: ${input.billingCaseId}. Review benefits verification status, financial clearance, and patient responsibility estimate.`,
    assigned_to: null,
    assigned_role: 'Billing',
    priority: input.priority ?? 'medium',
    status: 'open',
    ai_created: false,
    due_at: null,
  });
}

// ── Command logging ───────────────────────────────────────────────────────────

export async function saveBackofficeCommand(input: {
  clinicId: string;
  staffId?: string;
  commandText: string;
  commandType?: string;
  result?: Record<string, unknown>;
}): Promise<DbBackofficeCommand | null> {
  if (!isSupabaseConfigured()) {
    const mockCommand: DbBackofficeCommand = {
      id: `cmd-${Date.now()}`,
      clinic_id: input.clinicId,
      staff_id: input.staffId ?? null,
      command_text: input.commandText,
      command_type: input.commandType ?? null,
      result: input.result ?? null,
      created_at: new Date().toISOString(),
    };
    return mockCommand;
  }

  const sb = getSupabaseClient()!;
  const payload = {
    clinic_id: input.clinicId,
    staff_id: input.staffId ?? null,
    command_text: input.commandText,
    command_type: input.commandType ?? null,
    result: input.result ?? null,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from('backoffice_commands') as any)
    .insert(payload)
    .select()
    .single();
  if (error) { console.error('[adminDataService] saveBackofficeCommand:', error.message); return null; }
  return data;
}
