-- Create clinic_settings table
CREATE TABLE clinic_settings (
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
    
    -- Working hours (stored as JSON string)
    working_hours TEXT,
    
    -- Specialties (stored as JSON array string)
    specialties TEXT,
    
    -- Business settings
    currency VARCHAR(3) DEFAULT 'BRL',
    language VARCHAR(5) DEFAULT 'pt-BR',
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    
    -- Invoice settings
    invoice_prefix VARCHAR(10),
    next_invoice_number INTEGER DEFAULT 1,
    
    -- Appointment settings
    default_appointment_duration INTEGER DEFAULT 30,
    booking_window INTEGER DEFAULT 30, -- days
    cancellation_window INTEGER DEFAULT 24, -- hours
    
    -- Notification settings
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    appointment_reminders BOOLEAN DEFAULT TRUE,
    reminder_hours INTEGER DEFAULT 24
);

-- Create user_settings table
CREATE TABLE user_settings (
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
    
    -- Calendar settings
    calendar_view VARCHAR(20) DEFAULT 'week' CHECK (calendar_view IN ('day', 'week', 'month')),
    calendar_start INTEGER DEFAULT 1 CHECK (calendar_start IN (0, 1)), -- 0=Sunday, 1=Monday
    working_hours_start VARCHAR(5) DEFAULT '08:00',
    working_hours_end VARCHAR(5) DEFAULT '18:00',
    
    -- Notification preferences
    email_notifications BOOLEAN DEFAULT TRUE,
    browser_notifications BOOLEAN DEFAULT TRUE,
    appointment_alerts BOOLEAN DEFAULT TRUE,
    payment_alerts BOOLEAN DEFAULT TRUE,
    
    -- Interface preferences
    compact_mode BOOLEAN DEFAULT FALSE,
    show_patient_photos BOOLEAN DEFAULT TRUE,
    auto_save BOOLEAN DEFAULT TRUE,
    auto_save_interval INTEGER DEFAULT 30 -- seconds
);

-- Create indexes for better performance
CREATE INDEX idx_clinic_settings_user_id ON clinic_settings(user_id);
CREATE INDEX idx_clinic_settings_deleted_at ON clinic_settings(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX idx_user_settings_deleted_at ON user_settings(deleted_at) WHERE deleted_at IS NULL;

-- Create updated_at triggers
CREATE TRIGGER update_clinic_settings_updated_at BEFORE UPDATE ON clinic_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();