-- Create finances table
CREATE TABLE finances (
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
    
    -- Enhanced transaction fields
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    category VARCHAR(100), -- treatment, consultation, material, equipment, rent, etc.
    payment_method VARCHAR(50), -- cash, card, pix, transfer, check, insurance
    amount DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    tax DECIMAL(10,2) DEFAULT 0,
    
    -- Invoice details
    invoice_number VARCHAR(100) UNIQUE,
    invoice_date TIMESTAMPTZ,
    
    -- Payment tracking
    amount_paid DECIMAL(10,2) DEFAULT 0,
    balance DECIMAL(10,2),
    
    -- Installments
    installments INTEGER,
    installment_value DECIMAL(10,2),
    
    -- Additional details
    notes TEXT,
    reference VARCHAR(255), -- External reference
    is_recurring BOOLEAN DEFAULT FALSE
);

-- Create indexes for better performance
CREATE INDEX idx_finances_patient_id ON finances(patient_id);
CREATE INDEX idx_finances_doctor_id ON finances(doctor_id);
CREATE INDEX idx_finances_appointment_id ON finances(appointment_id);
CREATE INDEX idx_finances_status ON finances(status);
CREATE INDEX idx_finances_type ON finances(type);
CREATE INDEX idx_finances_due_at ON finances(due_at);
CREATE INDEX idx_finances_invoice_number ON finances(invoice_number);
CREATE INDEX idx_finances_created_by ON finances(created_by);
CREATE INDEX idx_finances_deleted_at ON finances(deleted_at) WHERE deleted_at IS NULL;

-- Create updated_at trigger
CREATE TRIGGER update_finances_updated_at BEFORE UPDATE ON finances
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();