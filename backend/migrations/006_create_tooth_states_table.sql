-- Create tooth_states table
CREATE TABLE tooth_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    
    patient_id INTEGER NOT NULL,
    tooth_number INTEGER NOT NULL,
    state VARCHAR(50) NOT NULL CHECK (state IN ('healthy', 'cavity', 'filled', 'crown', 'missing', 'extracted', 'implant', 'root_canal')),
    condition VARCHAR(100), -- Additional condition details
    notes TEXT,
    treatment_date TIMESTAMPTZ,
    created_by INTEGER NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_tooth_states_patient_id ON tooth_states(patient_id);
CREATE INDEX idx_tooth_states_patient_tooth ON tooth_states(patient_id, tooth_number);
CREATE INDEX idx_tooth_states_state ON tooth_states(state);
CREATE INDEX idx_tooth_states_created_by ON tooth_states(created_by);
CREATE INDEX idx_tooth_states_deleted_at ON tooth_states(deleted_at) WHERE deleted_at IS NULL;

-- Ensure unique tooth per patient (only for non-deleted records)
CREATE UNIQUE INDEX idx_tooth_states_unique_patient_tooth 
ON tooth_states(patient_id, tooth_number) 
WHERE deleted_at IS NULL;

-- Create updated_at trigger
CREATE TRIGGER update_tooth_states_updated_at BEFORE UPDATE ON tooth_states
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();