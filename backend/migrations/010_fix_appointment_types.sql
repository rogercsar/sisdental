-- Fix appointment types to match frontend values
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_type_check;

-- Add constraint with Portuguese appointment types that match frontend
ALTER TABLE appointments ADD CONSTRAINT appointments_type_check 
CHECK (type IN (
    'Consulta de Rotina',
    'Limpeza Dental', 
    'Restauração',
    'Endodontia (Canal)',
    'Extração',
    'Implante',
    'Ortodontia',
    'Emergência',
    'Avaliação',
    'Retorno',
    -- Keep English values for compatibility
    'consultation',
    'procedure', 
    'follow-up',
    'cleaning',
    'emergency'
));