-- Create patient_docs table
CREATE TABLE patient_docs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    
    file_name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    patient_id INTEGER NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_patient_docs_patient_id ON patient_docs(patient_id);
CREATE INDEX idx_patient_docs_deleted_at ON patient_docs(deleted_at) WHERE deleted_at IS NULL;

-- Create updated_at trigger
CREATE TRIGGER update_patient_docs_updated_at BEFORE UPDATE ON patient_docs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();