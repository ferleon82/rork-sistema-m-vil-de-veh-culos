-- ⚠️ ADVERTENCIA: Este script borrará TODOS los datos de las tablas
-- Ejecutar SOLO en ambiente de desarrollo/pruebas
-- NO ejecutar en producción

-- Deshabilitar verificaciones de claves foráneas temporalmente
SET session_replication_role = 'replica';

-- Borrar datos en orden (de dependientes a independientes)
DELETE FROM work_order_items;
DELETE FROM work_orders;
DELETE FROM vehicles;
DELETE FROM clients;
DELETE FROM users WHERE role != 'admin'; -- Mantener al menos un admin
DELETE FROM workshops;

-- Si quieres borrar TODO incluyendo admins (cuidado):
-- DELETE FROM users;

-- Rehabilitar verificaciones de claves foráneas
SET session_replication_role = 'default';

-- Verificar que las tablas estén vacías
SELECT 'work_order_items' as table_name, COUNT(*) as count FROM work_order_items
UNION ALL
SELECT 'work_orders', COUNT(*) FROM work_orders
UNION ALL
SELECT 'vehicles', COUNT(*) FROM vehicles
UNION ALL
SELECT 'clients', COUNT(*) FROM clients
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'workshops', COUNT(*) FROM workshops;
