-- Script de datos de prueba para la base de datos
-- Ejecutar después de supabase-migration.sql

-- Limpiar datos existentes (excepto usuarios iniciales)
DELETE FROM notifications;
DELETE FROM budgets;
DELETE FROM work_orders;
DELETE FROM vehicles;
DELETE FROM workshops WHERE id NOT IN (SELECT id FROM workshops LIMIT 0);
DELETE FROM users WHERE email NOT IN ('admin@taller.com', 'tecnico@taller.com', 'mecanico@taller.com');
DELETE FROM clients;

-- Insertar clientes de prueba
INSERT INTO clients (id, name, phone, country_code, email, address, document_number, notes) VALUES
('11111111-1111-1111-1111-111111111111', 'Carlos Mendoza', '0998765432', 'EC', 'carlos.mendoza@email.com', 'Av. 6 de Diciembre y Orellana', '1712345678', 'Cliente frecuente, prefiere contacto por WhatsApp'),
('22222222-2222-2222-2222-222222222222', 'María González', '0987654321', 'EC', 'maria.gonzalez@email.com', 'Calle Guayaquil 123', '1723456789', 'Cliente VIP, atención prioritaria'),
('33333333-3333-3333-3333-333333333333', 'Roberto Silva', '0976543210', 'EC', 'roberto.silva@email.com', 'Av. América y República', '1734567890', NULL),
('44444444-4444-4444-4444-444444444444', 'Ana Ramírez', '0965432109', 'EC', 'ana.ramirez@email.com', 'Sector La Carolina', '1745678901', 'Revisar siempre el filtro de aceite'),
('55555555-5555-5555-5555-555555555555', 'Luis Torres', '0954321098', 'EC', NULL, 'Norte de Quito', '1756789012', 'Cliente nuevo'),
('66666666-6666-6666-6666-666666666666', 'Patricia Morales', '0943210987', 'EC', 'patricia.morales@email.com', 'Sur de Quito, La Magdalena', '1767890123', NULL),
('77777777-7777-7777-7777-777777777777', 'Diego Paredes', '0932109876', 'EC', 'diego.paredes@email.com', 'Valle de los Chillos', '1778901234', 'Solo trabaja en horario de tarde'),
('88888888-8888-8888-8888-888888888888', 'Carmen Vega', '0921098765', 'EC', 'carmen.vega@email.com', 'Cumbayá', '1789012345', NULL);

-- Obtener IDs de usuarios existentes
DO $$
DECLARE
    admin_user_id UUID;
    tech_user_id UUID;
    mech_user_id UUID;
BEGIN
    SELECT id INTO admin_user_id FROM users WHERE email = 'admin@taller.com' LIMIT 1;
    SELECT id INTO tech_user_id FROM users WHERE email = 'tecnico@taller.com' LIMIT 1;
    SELECT id INTO mech_user_id FROM users WHERE email = 'mecanico@taller.com' LIMIT 1;

    -- Insertar talleres de prueba
    INSERT INTO workshops (id, name, owner_id, country_code, phone, address, email, notes) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Taller Central', admin_user_id, 'EC', '0234567890', 'Av. Principal 123, Quito', 'central@taller.com', 'Taller principal con todas las especialidades'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Taller Norte', admin_user_id, 'EC', '0234567891', 'Sector Norte, Quito', 'norte@taller.com', 'Especializado en mecánica general');

    -- Insertar vehículos de prueba
    INSERT INTO vehicles (id, vin, plate, brand, model, year, current_km, client_id, owner_name, owner_phone, owner_email, photo_url) VALUES
    ('v1111111-1111-1111-1111-111111111111', '1HGBH41JXMN109186', 'ABC-1234', 'Toyota', 'Corolla', 2020, 45000, '11111111-1111-1111-1111-111111111111', 'Carlos Mendoza', '0998765432', 'carlos.mendoza@email.com', NULL),
    ('v2222222-2222-2222-2222-222222222222', '2HGFC2F59KH512345', 'XYZ-5678', 'Honda', 'Civic', 2019, 62000, '22222222-2222-2222-2222-222222222222', 'María González', '0987654321', 'maria.gonzalez@email.com', NULL),
    ('v3333333-3333-3333-3333-333333333333', 'WVWZZZ3CZ9E123456', 'DEF-9012', 'Volkswagen', 'Jetta', 2021, 28000, '33333333-3333-3333-3333-333333333333', 'Roberto Silva', '0976543210', 'roberto.silva@email.com', NULL),
    ('v4444444-4444-4444-4444-444444444444', '3FADP4EJ8DM123789', 'GHI-3456', 'Chevrolet', 'Spark', 2018, 85000, '44444444-4444-4444-4444-444444444444', 'Ana Ramírez', '0965432109', 'ana.ramirez@email.com', NULL),
    ('v5555555-5555-5555-5555-555555555555', '5XYZT3LB0FG234567', 'JKL-7890', 'Hyundai', 'Accent', 2022, 15000, '55555555-5555-5555-5555-555555555555', 'Luis Torres', '0954321098', NULL, NULL),
    ('v6666666-6666-6666-6666-666666666666', 'JM1BL1SF4A1234567', 'MNO-2468', 'Mazda', 'CX-5', 2020, 52000, '66666666-6666-6666-6666-666666666666', 'Patricia Morales', '0943210987', 'patricia.morales@email.com', NULL),
    ('v7777777-7777-7777-7777-777777777777', '1G1ZD5ST8GF123456', 'PQR-1357', 'Nissan', 'Sentra', 2019, 71000, '77777777-7777-7777-7777-777777777777', 'Diego Paredes', '0932109876', 'diego.paredes@email.com', NULL),
    ('v8888888-8888-8888-8888-888888888888', '5TDJKRFH0HS123456', 'STU-9753', 'Kia', 'Rio', 2021, 38000, '88888888-8888-8888-8888-888888888888', 'Carmen Vega', '0921098765', 'carmen.vega@email.com', NULL);

    -- Insertar órdenes de trabajo de prueba
    INSERT INTO work_orders (
        id, code, vehicle_id, status, priority, description, 
        diagnosis, diagnosis_notes, items, total_cost, 
        created_by, assigned_to, check_in_at, started_at, 
        estimated_completion_date, notes, created_at
    ) VALUES
    -- Orden 1: Pendiente
    (
        'w1111111-1111-1111-1111-111111111111',
        'OT-2024-001',
        'v1111111-1111-1111-1111-111111111111',
        'pending',
        'medium',
        'Revisión general y cambio de aceite',
        NULL,
        NULL,
        '[]'::jsonb,
        0,
        admin_user_id,
        tech_user_id,
        NOW() - INTERVAL '2 hours',
        NULL,
        NOW() + INTERVAL '1 day',
        'Cliente solicita revisión completa antes de viaje',
        NOW() - INTERVAL '2 hours'
    ),
    -- Orden 2: En progreso
    (
        'w2222222-2222-2222-2222-222222222222',
        'OT-2024-002',
        'v2222222-2222-2222-2222-222222222222',
        'in_progress',
        'high',
        'Problema con frenos, ruido al frenar',
        'Pastillas de freno desgastadas, requiere reemplazo urgente',
        'Se detectó desgaste irregular. Recomendado revisar discos también.',
        '[{"id":"1","description":"Pastillas de freno delanteras","quantity":1,"unitPrice":85.00,"total":85.00},{"id":"2","description":"Mano de obra cambio de pastillas","quantity":1,"unitPrice":45.00,"total":45.00}]'::jsonb,
        130.00,
        admin_user_id,
        mech_user_id,
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '4 hours',
        NOW() + INTERVAL '6 hours',
        'Prioridad alta por seguridad',
        NOW() - INTERVAL '1 day'
    ),
    -- Orden 3: Esperando aprobación
    (
        'w3333333-3333-3333-3333-333333333333',
        'OT-2024-003',
        'v3333333-3333-3333-3333-333333333333',
        'waiting_approval',
        'medium',
        'Falla en motor, pérdida de potencia',
        'Filtro de combustible obstruido, inyectores sucios',
        'Se requiere limpieza de inyectores y reemplazo de filtro. Sistema de combustible necesita mantenimiento.',
        '[{"id":"1","description":"Limpieza ultrasónica de inyectores","quantity":4,"unitPrice":25.00,"total":100.00},{"id":"2","description":"Filtro de combustible","quantity":1,"unitPrice":35.00,"total":35.00},{"id":"3","description":"Aditivo limpiador sistema combustible","quantity":1,"unitPrice":18.00,"total":18.00},{"id":"4","description":"Mano de obra","quantity":2,"unitPrice":40.00,"total":80.00}]'::jsonb,
        233.00,
        tech_user_id,
        mech_user_id,
        NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '1 day',
        NOW() + INTERVAL '2 days',
        'Presupuesto enviado al cliente',
        NOW() - INTERVAL '2 days'
    ),
    -- Orden 4: Aprobada
    (
        'w4444444-4444-4444-4444-444444444444',
        'OT-2024-004',
        'v4444444-4444-4444-4444-444444444444',
        'approved',
        'high',
        'Cambio de embrague',
        'Embrague desgastado, patina en aceleración',
        'Embrague al 90% de desgaste. Kit completo necesario.',
        '[{"id":"1","description":"Kit de embrague completo","quantity":1,"unitPrice":280.00,"total":280.00},{"id":"2","description":"Volante motor rectificado","quantity":1,"unitPrice":65.00,"total":65.00},{"id":"3","description":"Líquido hidráulico","quantity":1,"unitPrice":12.00,"total":12.00},{"id":"4","description":"Mano de obra especializada","quantity":6,"unitPrice":45.00,"total":270.00}]'::jsonb,
        627.00,
        admin_user_id,
        tech_user_id,
        NOW() - INTERVAL '3 days',
        NOW() - INTERVAL '2 days',
        NOW() + INTERVAL '1 day',
        'Cliente aprobó presupuesto. Repuesto pedido.',
        NOW() - INTERVAL '3 days'
    ),
    -- Orden 5: Completada
    (
        'w5555555-5555-5555-5555-555555555555',
        'OT-2024-005',
        'v5555555-5555-5555-5555-555555555555',
        'completed',
        'low',
        'Mantenimiento preventivo 15,000 km',
        'Mantenimiento completado satisfactoriamente',
        'Todo en orden. Próximo mantenimiento a los 30,000 km.',
        '[{"id":"1","description":"Aceite sintético 5W30","quantity":4,"unitPrice":8.50,"total":34.00},{"id":"2","description":"Filtro de aceite","quantity":1,"unitPrice":12.00,"total":12.00},{"id":"3","description":"Filtro de aire","quantity":1,"unitPrice":15.00,"total":15.00},{"id":"4","description":"Mano de obra","quantity":1,"unitPrice":30.00,"total":30.00}]'::jsonb,
        91.00,
        tech_user_id,
        mech_user_id,
        NOW() - INTERVAL '5 days',
        NOW() - INTERVAL '4 days',
        NOW() - INTERVAL '3 days',
        'Trabajo completado. Cliente satisfecho.',
        NOW() - INTERVAL '5 days'
    ),
    -- Orden 6: En progreso con diagnóstico
    (
        'w6666666-6666-6666-6666-666666666666',
        'OT-2024-006',
        'v6666666-6666-6666-6666-666666666666',
        'in_progress',
        'high',
        'Luz de check engine encendida',
        'Fallo en sensor de oxígeno',
        'Sensor O2 banco 1 no responde. Código P0135.',
        '[{"id":"1","description":"Sensor de oxígeno (O2)","quantity":1,"unitPrice":95.00,"total":95.00},{"id":"2","description":"Limpieza de códigos de error","quantity":1,"unitPrice":20.00,"total":20.00},{"id":"3","description":"Mano de obra instalación","quantity":1,"unitPrice":45.00,"total":45.00}]'::jsonb,
        160.00,
        admin_user_id,
        tech_user_id,
        NOW() - INTERVAL '8 hours',
        NOW() - INTERVAL '3 hours',
        NOW() + INTERVAL '4 hours',
        'Sensor en camino',
        NOW() - INTERVAL '8 hours'
    ),
    -- Orden 7: Pendiente con prioridad baja
    (
        'w7777777-7777-7777-7777-777777777777',
        'OT-2024-007',
        'v7777777-7777-7777-7777-777777777777',
        'pending',
        'low',
        'Cambio de llantas',
        NULL,
        NULL,
        '[]'::jsonb,
        0,
        tech_user_id,
        NULL,
        NOW() - INTERVAL '6 hours',
        NULL,
        NOW() + INTERVAL '3 days',
        'Cliente traerá las llantas',
        NOW() - INTERVAL '6 hours'
    ),
    -- Orden 8: Completada reciente
    (
        'w8888888-8888-8888-8888-888888888888',
        'OT-2024-008',
        'v8888888-8888-8888-8888-888888888888',
        'completed',
        'medium',
        'Reparación sistema eléctrico, luces no funcionan',
        'Fusible quemado y cable suelto',
        'Sistema eléctrico en buen estado después de reparación.',
        '[{"id":"1","description":"Fusibles varios","quantity":3,"unitPrice":2.50,"total":7.50},{"id":"2","description":"Cable eléctrico calibre 14","quantity":2,"unitPrice":3.00,"total":6.00},{"id":"3","description":"Conectores","quantity":4,"unitPrice":1.50,"total":6.00},{"id":"4","description":"Diagnóstico y mano de obra","quantity":1.5,"unitPrice":40.00,"total":60.00}]'::jsonb,
        79.50,
        admin_user_id,
        tech_user_id,
        NOW() - INTERVAL '7 days',
        NOW() - INTERVAL '6 days',
        NOW() - INTERVAL '5 days',
        'Cliente retiró vehículo conforme',
        NOW() - INTERVAL '7 days'
    ),
    -- Orden 9: Cancelada
    (
        'w9999999-9999-9999-9999-999999999999',
        'OT-2024-009',
        'v1111111-1111-1111-1111-111111111111',
        'cancelled',
        'low',
        'Revisión de aire acondicionado',
        NULL,
        NULL,
        '[]'::jsonb,
        0,
        tech_user_id,
        NULL,
        NOW() - INTERVAL '10 days',
        NULL,
        NULL,
        'Cliente decidió no realizar el trabajo',
        NOW() - INTERVAL '10 days'
    );

    -- Insertar presupuestos
    INSERT INTO budgets (id, work_order_id, items, total_cost, notes, sent_at, approved_at) VALUES
    (
        'b3333333-3333-3333-3333-333333333333',
        'w3333333-3333-3333-3333-333333333333',
        '[{"id":"1","description":"Limpieza ultrasónica de inyectores","quantity":4,"unitPrice":25.00,"total":100.00},{"id":"2","description":"Filtro de combustible","quantity":1,"unitPrice":35.00,"total":35.00},{"id":"3","description":"Aditivo limpiador sistema combustible","quantity":1,"unitPrice":18.00,"total":18.00},{"id":"4","description":"Mano de obra","quantity":2,"unitPrice":40.00,"total":80.00}]'::jsonb,
        233.00,
        'Presupuesto para limpieza de sistema de combustible',
        NOW() - INTERVAL '1 day',
        NULL
    ),
    (
        'b4444444-4444-4444-4444-444444444444',
        'w4444444-4444-4444-4444-444444444444',
        '[{"id":"1","description":"Kit de embrague completo","quantity":1,"unitPrice":280.00,"total":280.00},{"id":"2","description":"Volante motor rectificado","quantity":1,"unitPrice":65.00,"total":65.00},{"id":"3","description":"Líquido hidráulico","quantity":1,"unitPrice":12.00,"total":12.00},{"id":"4","description":"Mano de obra especializada","quantity":6,"unitPrice":45.00,"total":270.00}]'::jsonb,
        627.00,
        'Presupuesto aprobado para cambio de embrague',
        NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '1 day'
    );

    -- Insertar notificaciones
    INSERT INTO notifications (type, work_order_id, message, phone_number, sent_at, delivered) VALUES
    ('budget_sent', 'w3333333-3333-3333-3333-333333333333', 'Hola Roberto, hemos enviado el presupuesto para la reparación de su Volkswagen Jetta. Total: $233.00', '0976543210', NOW() - INTERVAL '1 day', true),
    ('budget_approved', 'w4444444-4444-4444-4444-444444444444', 'Hola Ana, su presupuesto ha sido aprobado. Comenzaremos el trabajo en su Chevrolet Spark.', '0965432109', NOW() - INTERVAL '1 day', true),
    ('work_completed', 'w5555555-5555-5555-5555-555555555555', 'Hola Luis, el mantenimiento de su Hyundai Accent ha sido completado. Puede retirar su vehículo.', '0954321098', NOW() - INTERVAL '3 days', true),
    ('status_update', 'w2222222-2222-2222-2222-222222222222', 'Hola María, estamos trabajando en la reparación de los frenos de su Honda Civic.', '0987654321', NOW() - INTERVAL '4 hours', true),
    ('work_completed', 'w8888888-8888-8888-8888-888888888888', 'Hola Carmen, la reparación eléctrica de su Kia Rio ha sido completada exitosamente.', '0921098765', NOW() - INTERVAL '5 days', true);

END $$;
