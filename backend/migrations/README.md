# Database Migrations

This directory contains SQL migration files for the dental system database.

## Files

1. `001_create_appointments_table.sql` - Creates appointments table with all required fields
2. `002_create_odontogram_treatments_table.sql` - Creates odontogram treatments table
3. `003_create_patient_images_table.sql` - Creates patient images table
4. `004_create_users_table.sql` - Creates users table
5. `005_create_settings_tables.sql` - Creates clinic_settings and user_settings tables
6. `006_create_tooth_states_table.sql` - Creates tooth_states table
7. `007_create_finances_table.sql` - Creates finances table
8. `008_create_patient_docs_table.sql` - Creates patient_docs table
9. `009_create_activity_logs_table.sql` - Creates activity_logs table
10. `010_fix_appointment_types.sql` - Fixes appointment type constraints for Portuguese values
11. `011_create_doctors_table.sql` - Creates doctors table with user relationship

## How to Run Migrations

### Option 1: Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste each migration file content in order (001, 002, 003, etc.)
4. Execute each migration

### Option 2: Supabase CLI
```bash
# Make sure you have Supabase CLI installed and logged in
supabase db reset

# Or run individual migrations
supabase db reset --file migrations/001_create_appointments_table.sql
```

### Option 3: Direct PostgreSQL
If you have direct access to your PostgreSQL database:
```bash
psql -h your-host -p your-port -U your-user -d your-database -f migrations/001_create_appointments_table.sql
```

## Migration Order

**IMPORTANT**: Run migrations in numerical order (001, 002, 003, etc.) to ensure proper table creation and dependencies.

## Notes

- All tables use UUID primary keys with `uuid_generate_v4()` default
- All tables have `created_at`, `updated_at`, and soft delete (`deleted_at`) fields  
- Automatic `updated_at` triggers are created for all tables
- Proper indexes are created for performance
- Foreign key constraints are handled at the application level (not database level) for Supabase compatibility

## Tables Created

- `appointments` - Patient appointments and scheduling
- `odontogram_treatments` - Dental treatment records
- `patient_images` - X-rays, photos, and other patient images
- `users` - System users (doctors, assistants, patients)
- `clinic_settings` - Clinic configuration and settings
- `user_settings` - Individual user preferences
- `tooth_states` - Odontogram tooth condition tracking
- `finances` - Financial records and transactions
- `patient_docs` - Patient document storage
- `activity_logs` - System activity logging
- `doctors` - Doctor profiles linked to authenticated users