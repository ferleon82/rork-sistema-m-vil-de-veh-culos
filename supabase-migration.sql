-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
DO $ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'technician', 'mechanic');
EXCEPTION
    WHEN duplicate_object THEN null;
END $;

DO $ BEGIN
    CREATE TYPE work_order_status AS ENUM ('pending', 'in_progress', 'waiting_approval', 'approved', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $;

DO $ BEGIN
    CREATE TYPE work_order_priority AS ENUM ('low', 'medium', 'high');
EXCEPTION
    WHEN duplicate_object THEN null;
END $;

DO $ BEGIN
    CREATE TYPE notification_type AS ENUM ('status_update', 'budget_sent', 'budget_approved', 'work_completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $;

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    country_code TEXT NOT NULL,
    email TEXT,
    address TEXT,
    document_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create users table (custom users, not auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'mechanic',
    country_code TEXT NOT NULL,
    phone TEXT,
    password TEXT NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create workshops table
CREATE TABLE IF NOT EXISTS workshops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    country_code TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    email TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vin TEXT NOT NULL,
    plate TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    current_km INTEGER NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    owner_name TEXT NOT NULL,
    owner_phone TEXT NOT NULL,
    owner_email TEXT,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create work_orders table
CREATE TABLE IF NOT EXISTS work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    status work_order_status NOT NULL DEFAULT 'pending',
    priority work_order_priority NOT NULL DEFAULT 'medium',
    description TEXT NOT NULL,
    diagnosis TEXT,
    diagnosis_category_id TEXT,
    diagnosis_issue_id TEXT,
    diagnosis_notes TEXT,
    items JSONB NOT NULL DEFAULT '[]',
    total_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    check_in_at TIMESTAMPTZ NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    estimated_completion_date TIMESTAMPTZ,
    notes TEXT,
    images TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create budgets table
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    items JSONB NOT NULL DEFAULT '[]',
    total_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    sent_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type notification_type NOT NULL,
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL,
    delivered BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_vehicles_client_id ON vehicles(client_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate);
CREATE INDEX IF NOT EXISTS idx_work_orders_vehicle_id ON work_orders(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_created_by ON work_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_to ON work_orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_work_orders_diagnosis_category ON work_orders(diagnosis_category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_work_order_id ON budgets(work_order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_work_order_id ON notifications(work_order_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workshops_updated_at ON workshops;
CREATE TRIGGER update_workshops_updated_at BEFORE UPDATE ON workshops
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_work_orders_updated_at ON work_orders;
CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON work_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_budgets_updated_at ON budgets;
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial users (password: admin123)
INSERT INTO users (email, name, role, country_code, phone, password) VALUES
('admin@taller.com', 'Administrador', 'admin', 'EC', '+59312345678', 'admin123'),
('tecnico@taller.com', 'Técnico Juan', 'technician', 'EC', '+59387654321', 'admin123'),
('mecanico@taller.com', 'Mecánico Pedro', 'mechanic', 'EC', '+59399887766', 'admin123')
ON CONFLICT (email) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all operations for now - you can customize later)
DROP POLICY IF EXISTS "Allow all operations on users" ON users;
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on clients" ON clients;
CREATE POLICY "Allow all operations on clients" ON clients FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on workshops" ON workshops;
CREATE POLICY "Allow all operations on workshops" ON workshops FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on vehicles" ON vehicles;
CREATE POLICY "Allow all operations on vehicles" ON vehicles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on work_orders" ON work_orders;
CREATE POLICY "Allow all operations on work_orders" ON work_orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on budgets" ON budgets;
CREATE POLICY "Allow all operations on budgets" ON budgets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on notifications" ON notifications;
CREATE POLICY "Allow all operations on notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);
