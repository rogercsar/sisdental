import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_URL ||
  'https://mbqsrqqmhwlqawbrsejj.supabase.co'

const supabaseAnonKey =
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1icXNycXFtaHdscWF3YnJzZWpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2ODg3NTYsImV4cCI6MjA2ODI2NDc1Nn0.VGe-VLboCFlKfObhqGqUJlI6JiA2l5045RFTcsPOGM4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Database types
export interface Patient {
  id: string
  created_at: string
  updated_at: string
  deleted_at?: string | null
  name: string
  email: string
  phone: string
  date_of_birth?: string | null
  address: string
  medical_history?: string
  notes?: string
  cpf?: string
  emergency_contact?: string
  emergency_phone?: string
  profession?: string
  civil_status?: string
  gender?: string
  allergies?: string
  medications?: string
  diseases?: string
  surgeries?: string
  family_history?: string
  last_cleaning_date?: string | null
  orthodontic_treatment?: boolean
  previous_dentist?: string
  chief_complaint?: string
  pain_level?: number
  sensitivity?: boolean
  insurance_provider?: string
  insurance_number?: string
  insurance_coverage?: string
  insurance_expiration?: string | null
  smoking?: boolean
  alcohol?: boolean
  drugs?: boolean
  bruxism?: boolean
}

export interface Doctor {
  id: string
  user_id: string
  name: string
  email: string
  created_at: string
  updated_at: string
}

export interface PatientDoctor {
  id: string
  created_at: string
  patient_id: string
  doctor_id: string
  is_primary_doctor: boolean
  assigned_at: string
  notes?: string
}