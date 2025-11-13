-- Create patient_images table
CREATE TABLE patient_images (
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

-- Create indexes for better performance
CREATE INDEX idx_patient_images_patient_id ON patient_images(patient_id);
CREATE INDEX idx_patient_images_type ON patient_images(type);
CREATE INDEX idx_patient_images_category ON patient_images(category);
CREATE INDEX idx_patient_images_created_by ON patient_images(created_by);
CREATE INDEX idx_patient_images_deleted_at ON patient_images(deleted_at) WHERE deleted_at IS NULL;

-- Create updated_at trigger
CREATE TRIGGER update_patient_images_updated_at BEFORE UPDATE ON patient_images
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();