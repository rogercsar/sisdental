-- Create doctors table
CREATE TABLE IF NOT EXISTS doctors (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    
    -- Professional information
    license_number VARCHAR(50),
    specialization VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    
    -- Practice details
    years_of_experience INTEGER DEFAULT 0,
    qualifications TEXT,
    bio TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_email ON doctors(email);
CREATE INDEX IF NOT EXISTS idx_doctors_name ON doctors(name);
CREATE INDEX IF NOT EXISTS idx_doctors_deleted_at ON doctors(deleted_at) WHERE deleted_at IS NULL;

-- Create updated_at trigger
CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON doctors
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();