import { z } from 'zod';

// User types
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;

// Auth types
export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const SignUpRequestSchema = LoginRequestSchema.extend({
  name: z.string().optional(),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type SignUpRequest = z.infer<typeof SignUpRequestSchema>;

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: any; // Supabase user object
  error?: string;
}

// Stripe types
export const PriceSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  active: z.boolean(),
  description: z.string().nullable(),
  unit_amount: z.number(),
  currency: z.string(),
  type: z.string(),
  interval: z.string().nullable(),
  interval_count: z.number().nullable(),
  trial_period_days: z.number().nullable(),
  metadata: z.record(z.string()).nullable(),
});

export const ProductSchema = z.object({
  id: z.string(),
  active: z.boolean(),
  name: z.string(),
  description: z.string().nullable(),
  image: z.string().nullable(),
  metadata: z.record(z.string()).nullable(),
  default_price_id: z.string().nullable(),
});

export type Price = z.infer<typeof PriceSchema>;
export type Product = z.infer<typeof ProductSchema>;

export interface StripeResponse {
  prices: Price[];
  products: Product[];
}

export interface CheckoutSessionResponse {
  url: string;
  sessionId: string;
}

// API Response types
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    error: z.string().nullable(),
  });

export type ApiResponse<T> = {
  data: T;
  error: string | null;
};

// Subscription types
export const SubscriptionSchema = z.object({
  id: z.number(),
  plan_name: z.string(),
  stripe_customer_id: z.string(),
  stripe_subscription_id: z.string(),
  stripe_product_id: z.string(),
  subscription_status: z.string(),
  doctor_id: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Subscription = z.infer<typeof SubscriptionSchema>;

export interface SubscriptionResponse {
  subscription: Subscription | null;
  message?: string;
}

// Patient types
export const PatientSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  birth_date: z.string().nullable(),
  gender: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable(),
});

export type Patient = z.infer<typeof PatientSchema>;

// Appointment types
export const AppointmentSchema = z.object({
  id: z.string().uuid(),
  patient_id: z.string().uuid(),
  doctor_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  appointment_date: z.string().datetime(),
  duration: z.number(),
  status: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']),
  type: z.string().nullable(),
  location: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable(),
});

export type Appointment = z.infer<typeof AppointmentSchema>;

// Finance types
export const FinanceSchema = z.object({
  id: z.string().uuid(),
  patient_id: z.string().uuid(),
  doctor_id: z.string().uuid(),
  appointment_id: z.string().uuid().nullable(),
  created_by: z.string().uuid(),
  price: z.number(),
  description: z.string(),
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']),
  due_at: z.string().datetime(),
  type: z.enum(['income', 'expense']),
  category: z.string().nullable(),
  payment_method: z.string().nullable(),
  amount: z.number(),
  discount: z.number().default(0),
  tax: z.number().default(0),
  amount_paid: z.number().default(0),
  installments: z.number().default(1),
  installment_value: z.number().default(0),
  notes: z.string().nullable(),
  reference: z.string().nullable(),
  is_recurring: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable(),
});

export type Finance = z.infer<typeof FinanceSchema>;

// Patient Document types
export const PatientDocSchema = z.object({
  id: z.string().uuid(),
  patient_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  file_path: z.string(),
  file_type: z.string(),
  file_size: z.number(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable(),
});

export type PatientDoc = z.infer<typeof PatientDocSchema>;

// Patient Image types
export const PatientImageSchema = z.object({
  id: z.string().uuid(),
  patient_id: z.string().uuid(),
  created_by: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  file_path: z.string(),
  file_type: z.string(),
  file_size: z.number(),
  image_type: z.string().nullable(),
  category: z.string().nullable(),
  taken_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable(),
});

export type PatientImage = z.infer<typeof PatientImageSchema>;

// Odontogram Treatment types
export const OdontogramTreatmentSchema = z.object({
  id: z.string().uuid(),
  patient_id: z.string().uuid(),
  price: z.number(),
  teeth_number: z.string(),
  treatment_type: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  notes: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable(),
});

export type OdontogramTreatment = z.infer<typeof OdontogramTreatmentSchema>;

// Tooth State types
export const ToothStateSchema = z.object({
  id: z.string().uuid(),
  patient_id: z.string().uuid(),
  created_by: z.string().uuid(),
  tooth_number: z.number(),
  state: z.string(),
  notes: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable(),
});

export type ToothState = z.infer<typeof ToothStateSchema>;

// Settings types
export const ClinicSettingsSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  clinic_name: z.string(),
  clinic_address: z.string().nullable(),
  clinic_phone: z.string().nullable(),
  clinic_email: z.string().email().nullable(),
  logo_url: z.string().nullable(),
  business_hours: z.record(z.string()).nullable(),
  appointment_duration: z.number().default(30),
  buffer_time: z.number().default(15),
  max_advance_booking: z.number().default(90),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const UserSettingsSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  theme: z.enum(['light', 'dark']).default('light'),
  language: z.string().default('en'),
  timezone: z.string().default('UTC'),
  notification_email: z.boolean().default(true),
  notification_sms: z.boolean().default(false),
  notification_push: z.boolean().default(true),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type ClinicSettings = z.infer<typeof ClinicSettingsSchema>;
export type UserSettings = z.infer<typeof UserSettingsSchema>;

// Dashboard Stats types
export interface DashboardStats {
  total_patients: number;
  total_appointments: number;
  completed_appointments: number;
  pending_appointments: number;
  total_revenue: number;
  pending_payments: number;
  overdue_payments: number;
  monthly_revenue: number;
}

// Financial Report types
export interface FinancialReport {
  total_income: number;
  total_expenses: number;
  net_profit: number;
  pending_payments: number;
  overdue_payments: number;
  monthly_breakdown: {
    month: string;
    income: number;
    expenses: number;
    profit: number;
  }[];
}

// Appointment Report types
export interface AppointmentReport {
  total_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  no_show_appointments: number;
  average_duration: number;
  monthly_breakdown: {
    month: string;
    total: number;
    completed: number;
    cancelled: number;
    no_show: number;
  }[];
} 