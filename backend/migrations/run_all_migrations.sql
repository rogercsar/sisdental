-- Run all migrations in order
-- Execute this file in Supabase SQL Editor or PostgreSQL client

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create updated_at function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 001: Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    
    patient_id UUID NOT NULL,
    doctor_id UUID NOT NULL,
    date_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show', 'in_progress')),
    type VARCHAR(50) NOT NULL CHECK (type IN ('consultation', 'procedure', 'follow-up', 'cleaning', 'emergency')),
    notes TEXT,
    duration INTEGER NOT NULL DEFAULT 30,
    created_by UUID NOT NULL,
    
    patient_email VARCHAR(255),
    patient_phone VARCHAR(20),
    treatment VARCHAR(255),
    is_first_visit BOOLEAN DEFAULT FALSE,
    room VARCHAR(50),
    equipment TEXT,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    reminder BOOLEAN DEFAULT TRUE,
    reminder_sent BOOLEAN DEFAULT FALSE,
    color VARCHAR(7),
    estimated_cost DECIMAL(10,2),
    
    cancelled_at TIMESTAMPTZ NULL,
    cancellation_reason TEXT
);

-- 002: Create odontogram_treatments table
CREATE TABLE IF NOT EXISTS odontogram_treatments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    
    price DECIMAL(10,2) NOT NULL,
    teeth_number VARCHAR(50) NOT NULL,
    treatment_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
    next_session TIMESTAMPTZ,
    observations TEXT,
    date_of_treatment TIMESTAMPTZ NOT NULL,
    patient_id INTEGER NOT NULL
);

-- 003: Create patient_images table
CREATE TABLE IF NOT EXISTS patient_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    
    patient_id INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('xray', 'photo', 'scan', 'document')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    tooth_number INTEGER NULL,
    category VARCHAR(50) DEFAULT 'diagnostic' CHECK (category IN ('before_treatment', 'during_treatment', 'after_treatment', 'diagnostic')),
    is_public BOOLEAN DEFAULT FALSE,
    created_by INTEGER NOT NULL
);

-- 004: Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'patient' CHECK (role IN ('admin', 'doctor', 'assistant', 'patient')),
    last_login TIMESTAMPTZ
);

-- 005a: Create clinic_settings table
CREATE TABLE IF NOT EXISTS clinic_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    
    user_id INTEGER NOT NULL,
    clinic_name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    logo VARCHAR(500),
    description TEXT,
    working_hours TEXT,
    specialties TEXT,
    currency VARCHAR(3) DEFAULT 'BRL',
    language VARCHAR(5) DEFAULT 'pt-BR',
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    invoice_prefix VARCHAR(10),
    next_invoice_number INTEGER DEFAULT 1,
    default_appointment_duration INTEGER DEFAULT 30,
    booking_window INTEGER DEFAULT 30,
    cancellation_window INTEGER DEFAULT 24,
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    appointment_reminders BOOLEAN DEFAULT TRUE,
    reminder_hours INTEGER DEFAULT 24
);

-- 005b: Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    
    user_id INTEGER NOT NULL,
    theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
    language VARCHAR(5) DEFAULT 'pt-BR',
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    time_format VARCHAR(10) DEFAULT '24h' CHECK (time_format IN ('12h', '24h')),
    calendar_view VARCHAR(20) DEFAULT 'week' CHECK (calendar_view IN ('day', 'week', 'month')),
    calendar_start INTEGER DEFAULT 1 CHECK (calendar_start IN (0, 1)),
    working_hours_start VARCHAR(5) DEFAULT '08:00',
    working_hours_end VARCHAR(5) DEFAULT '18:00',
    email_notifications BOOLEAN DEFAULT TRUE,
    browser_notifications BOOLEAN DEFAULT TRUE,
    appointment_alerts BOOLEAN DEFAULT TRUE,
    payment_alerts BOOLEAN DEFAULT TRUE,
    compact_mode BOOLEAN DEFAULT FALSE,
    show_patient_photos BOOLEAN DEFAULT TRUE,
    auto_save BOOLEAN DEFAULT TRUE,
    auto_save_interval INTEGER DEFAULT 30
);

-- 006: Create tooth_states table
CREATE TABLE IF NOT EXISTS tooth_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    
    patient_id INTEGER NOT NULL,
    tooth_number INTEGER NOT NULL,
    state VARCHAR(50) NOT NULL CHECK (state IN ('healthy', 'cavity', 'filled', 'crown', 'missing', 'extracted', 'implant', 'root_canal')),
    condition VARCHAR(100),
    notes TEXT,
    treatment_date TIMESTAMPTZ,
    created_by INTEGER NOT NULL
);

-- 007: Create finances table
CREATE TABLE IF NOT EXISTS finances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    
    price DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled', 'partial')),
    due_at TIMESTAMPTZ NOT NULL,
    paid_at TIMESTAMPTZ NULL,
    patient_id UUID NOT NULL,
    doctor_id UUID NOT NULL,
    appointment_id UUID NULL,
    created_by UUID NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    category VARCHAR(100),
    payment_method VARCHAR(50),
    amount DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    tax DECIMAL(10,2) DEFAULT 0,
    invoice_number VARCHAR(100) UNIQUE,
    invoice_date TIMESTAMPTZ,
    amount_paid DECIMAL(10,2) DEFAULT 0,
    balance DECIMAL(10,2),
    installments INTEGER,
    installment_value DECIMAL(10,2),
    notes TEXT,
    reference VARCHAR(255),
    is_recurring BOOLEAN DEFAULT FALSE
);

-- 008: Create patient_docs table
CREATE TABLE IF NOT EXISTS patient_docs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    
    file_name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    patient_id INTEGER NOT NULL
);

-- 009: Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    
    user_id UUID NOT NULL,
    action TEXT NOT NULL,
    ip_address VARCHAR(45)
);

-- Create all indexes (only if they don't exist)
DO $$ 
BEGIN
    -- Appointments indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_appointments_patient_id') THEN
        CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_appointments_doctor_id') THEN
        CREATE INDEX idx_appointments_doctor_id ON appointments(doctor_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_appointments_date_time') THEN
        CREATE INDEX idx_appointments_date_time ON appointments(date_time);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_appointments_status') THEN
        CREATE INDEX idx_appointments_status ON appointments(status);
    END IF;
    
    -- Add similar index creation for other tables...
END $$;

-- Create all update triggers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_appointments_updated_at') THEN
        CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_odontogram_treatments_updated_at') THEN
        CREATE TRIGGER update_odontogram_treatments_updated_at BEFORE UPDATE ON odontogram_treatments
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_patient_images_updated_at') THEN
        CREATE TRIGGER update_patient_images_updated_at BEFORE UPDATE ON patient_images
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_clinic_settings_updated_at') THEN
        CREATE TRIGGER update_clinic_settings_updated_at BEFORE UPDATE ON clinic_settings
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_settings_updated_at') THEN
        CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tooth_states_updated_at') THEN
        CREATE TRIGGER update_tooth_states_updated_at BEFORE UPDATE ON tooth_states
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_finances_updated_at') THEN
        CREATE TRIGGER update_finances_updated_at BEFORE UPDATE ON finances
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_patient_docs_updated_at') THEN
        CREATE TRIGGER update_patient_docs_updated_at BEFORE UPDATE ON patient_docs
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_activity_logs_updated_at') THEN
        CREATE TRIGGER update_activity_logs_updated_at BEFORE UPDATE ON activity_logs
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;