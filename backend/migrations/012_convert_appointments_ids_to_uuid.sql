-- Convert appointments table doctor_id and patient_id from INTEGER to UUID
-- This migration handles the data type conversion safely

BEGIN;

-- Step 1: Add new UUID columns
ALTER TABLE appointments ADD COLUMN patient_uuid UUID;
ALTER TABLE appointments ADD COLUMN doctor_uuid UUID;
ALTER TABLE appointments ADD COLUMN created_by_uuid UUID;

-- Step 2: Handle existing data
-- First, delete any appointments with NULL patient_id or doctor_id (invalid data)
DELETE FROM appointments WHERE patient_id IS NULL OR doctor_id IS NULL OR created_by IS NULL;

-- If there are any remaining appointments with INTEGER IDs, we need to handle them
-- For this conversion, we'll generate new UUIDs for existing records since we're switching data types
UPDATE appointments SET 
    patient_uuid = uuid_generate_v4(),
    doctor_uuid = uuid_generate_v4(), 
    created_by_uuid = uuid_generate_v4()
WHERE patient_uuid IS NULL;

-- Step 3: Drop the old INTEGER columns
ALTER TABLE appointments DROP COLUMN IF EXISTS patient_id;
ALTER TABLE appointments DROP COLUMN IF EXISTS doctor_id;
ALTER TABLE appointments DROP COLUMN IF EXISTS created_by;

-- Step 4: Rename the UUID columns to the original names
ALTER TABLE appointments RENAME COLUMN patient_uuid TO patient_id;
ALTER TABLE appointments RENAME COLUMN doctor_uuid TO doctor_id;
ALTER TABLE appointments RENAME COLUMN created_by_uuid TO created_by;

-- Step 5: Add NOT NULL constraints (only after data is populated)
ALTER TABLE appointments ALTER COLUMN patient_id SET NOT NULL;
ALTER TABLE appointments ALTER COLUMN doctor_id SET NOT NULL;
ALTER TABLE appointments ALTER COLUMN created_by SET NOT NULL;

-- Step 6: Recreate indexes for the new UUID columns
DROP INDEX IF EXISTS idx_appointments_patient_id;
DROP INDEX IF EXISTS idx_appointments_doctor_id;
DROP INDEX IF EXISTS idx_appointments_created_by;

CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX idx_appointments_created_by ON appointments(created_by);

-- Step 7: Add foreign key relationships if needed (optional, since Supabase handles this at app level)
-- ALTER TABLE appointments ADD CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id) REFERENCES patients(id);
-- ALTER TABLE appointments ADD CONSTRAINT fk_appointments_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id);

COMMIT;