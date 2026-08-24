# Activación de acceso con Google

Los usuarios ya existen en Supabase Auth con proveedor Google. Esta migración **no crea cuentas, no cambia contraseñas de Google y no invalida identidades existentes**. Solo vincula cada identidad autenticada con su perfil de negocio en `public.users`.

## Antes de ejecutar

1. Haz un respaldo de la base de datos.
2. En **Authentication > Providers**, confirma que Google está habilitado.
3. En **Authentication > URL Configuration**, añade esta URL de redirección:

   ```text
   rork-app://auth/callback
   ```

4. Comprueba que el correo de cada usuario de `Authentication > Users` coincide con el de su perfil en `public.users`.

## Activación

1. Ejecuta [la migración de Auth](../supabase/migrations/20260820_001_supabase_auth.sql) en el SQL Editor de Supabase.
2. Despliega la función de administración:

   ```bash
   supabase functions deploy manage-users
   ```

3. Inicia sesión en la aplicación con Google. Si el correo coincide, el primer acceso vincula automáticamente el perfil con el UID de Supabase Auth.

## Administrador inicial

Si el correo administrador ya está en Authentication pero no tiene un perfil en `public.users`, crea solo su perfil; no crees otro usuario de Authentication:

```sql
INSERT INTO public.users (email, name, role, country_code, auth_user_id)
SELECT email, 'Administrador', 'admin', 'EC', id
FROM auth.users
WHERE email = 'tu-correo-administrador@gmail.com';
```

Después del primer acceso, el administrador podrá crear perfiles para nuevos miembros. Cada miembro entra con su propia cuenta Google y queda vinculado al perfil que tenga el mismo correo.

## Seguridad

- La aplicación ya no usa ni almacena contraseñas propias.
- El cliente móvil nunca recibe la clave de servicio de Supabase.
- La función `manage-users` verifica la sesión y el rol antes de administrar perfiles.
- La siguiente fase restringirá clientes, vehículos, órdenes y talleres mediante RLS por taller.
