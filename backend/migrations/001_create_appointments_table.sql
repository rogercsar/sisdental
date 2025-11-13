-- Create appointments table
CREATE TABLE appointments (
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
    duration INTEGER NOT NULL DEFAULT 30, -- in minutes
    created_by UUID NOT NULL,
    
    -- Enhanced fields for frontend
    patient_email VARCHAR(255),
    patient_phone VARCHAR(20),
    treatment VARCHAR(255),
    is_first_visit BOOLEAN DEFAULT FALSE,
    room VARCHAR(50),
    equipment TEXT, -- JSON array as string
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    reminder BOOLEAN DEFAULT TRUE,
    reminder_sent BOOLEAN DEFAULT FALSE,
    color VARCHAR(7), -- Hex color for calendar
    estimated_cost DECIMAL(10,2),
    
    -- Cancellation details
    cancelled_at TIMESTAMPTZ NULL,
    cancellation_reason TEXT
);

-- Create indexes for better performance
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX idx_appointments_date_time ON appointments(date_time);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_created_by ON appointments(created_by);
CREATE INDEX idx_appointments_deleted_at ON appointments(deleted_at) WHERE deleted_at IS NULL;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();