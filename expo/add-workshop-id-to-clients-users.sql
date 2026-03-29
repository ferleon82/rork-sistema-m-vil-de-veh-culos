-- Migration: Add workshop_id to clients and users tables
-- This allows filtering clients and users by workshop for better administration

-- Add workshop_id column to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS workshop_id UUID REFERENCES workshops(id) ON DELETE SET NULL;

-- Add workshop_id column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS workshop_id UUID REFERENCES workshops(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_clients_workshop_id ON clients(workshop_id);
CREATE INDEX IF NOT EXISTS idx_users_workshop_id ON users(workshop_id);

-- Optional: Update existing records to assign them to workshops
-- Uncomment and modify these if you want to assign existing data to specific workshops

-- Example: Assign all existing clients to the first workshop
-- UPDATE clients 
-- SET workshop_id = (SELECT id FROM workshops ORDER BY created_at ASC LIMIT 1)
-- WHERE workshop_id IS NULL;

-- Example: Assign all existing users to the first workshop
-- UPDATE users 
-- SET workshop_id = (SELECT id FROM workshops ORDER BY created_at ASC LIMIT 1)
-- WHERE workshop_id IS NULL;

-- Verify the changes
SELECT 'Migration completed successfully!' as status;
