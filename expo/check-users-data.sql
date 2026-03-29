-- Ver todos los usuarios con rol mechanic
SELECT id, name, email, role, workshop_id, created_at 
FROM users 
WHERE role = 'mechanic'
ORDER BY created_at DESC;

-- Ver todos los técnicos
SELECT id, name, email, role, workshop_id, created_at 
FROM users 
WHERE role = 'technician'
ORDER BY created_at DESC;

-- Ver todas las mecánicas
SELECT id, name, owner_id, created_at
FROM workshops
ORDER BY created_at DESC;
