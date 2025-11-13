-- Create odontogram_treatments table
CREATE TABLE odontogram_treatments (
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

-- Create indexes for better performance
CREATE INDEX idx_odontogram_treatments_patient_id ON odontogram_treatments(patient_id);
CREATE INDEX idx_odontogram_treatments_status ON odontogram_treatments(status);
CREATE INDEX idx_odontogram_treatments_date_of_treatment ON odontogram_treatments(date_of_treatment);
CREATE INDEX idx_odontogram_treatments_deleted_at ON odontogram_treatments(deleted_at) WHERE deleted_at IS NULL;

-- Create updated_at trigger
CREATE TRIGGER update_odontogram_treatments_updated_at BEFORE UPDATE ON odontogram_treatments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();