# Guía de Migración a Supabase

## Pasos Completados ✅

1. ✅ **Instalación de dependencias**: `@supabase/supabase-js`
2. ✅ **Cliente Supabase**: Creado en `lib/supabase.ts`
3. ✅ **Tipos TypeScript**: Generados en `types/database.ts`
4. ✅ **Script SQL**: Disponible en `supabase-migration.sql`
5. ✅ **AuthContext**: Actualizado para usar Supabase

## Pasos Pendientes

### Paso 6: Ejecutar SQL en Supabase

1. Ve a tu [Dashboard de Supabase](https://app.supabase.com)
2. Selecciona tu proyecto
3. En el menú lateral, ve a **SQL Editor**
4. Crea un nuevo query
5. Copia y pega el contenido completo de `supabase-migration.sql`
6. Haz clic en **RUN** para ejecutar el script
7. Verifica que todas las tablas se crearon correctamente en **Table Editor**

### Paso 7: Verificar las variables de entorno

Las siguientes variables ya están configuradas:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Puedes encontrarlas en:
- Dashboard de Supabase → Settings → API
- URL: En "Project URL"
- Anon Key: En "Project API keys" → anon/public

### Paso 8: Actualizar los Contextos ✅

Todos los contextos han sido actualizados para usar Supabase:
- ✅ AuthContext
- ✅ UsersContext
- ✅ ClientsContext
- ✅ VehiclesContext
- ✅ WorkshopsContext
- ✅ WorkOrdersContext

## Próximos Pasos

### Paso 9: Ejecutar el script SQL en Supabase (ACCIÓN REQUERIDA)

**Este es el paso más importante - sin esto, la app no funcionará:**

1. Ve a [Dashboard de Supabase](https://app.supabase.com)
2. Selecciona tu proyecto
3. En el menú lateral izquierdo, haz clic en **SQL Editor**
4. Haz clic en el botón **+ New query**
5. Abre el archivo `supabase-migration.sql` de este proyecto
6. Copia TODO el contenido del archivo
7. Pégalo en el editor de Supabase
8. Haz clic en el botón **RUN** (o presiona Ctrl+Enter)
9. Espera a que se ejecute (verás un mensaje de éxito)
10. Ve a **Table Editor** en el menú lateral para verificar que se crearon las tablas

Deberías ver las siguientes tablas:
- users (con 3 usuarios iniciales)
- clients
- workshops
- vehicles
- work_orders
- budgets
- notifications

### Paso 10: Probar la aplicación

1. Asegúrate de haber ejecutado el script SQL (Paso 9)
2. Ejecuta `npm start` o `bun start`
3. Inicia sesión con cualquiera de estos usuarios:
   - **Admin**: `admin@taller.com` / `admin123`
   - **Técnico**: `tecnico@taller.com` / `admin123`
   - **Mecánico**: `mecanico@taller.com` / `admin123`
4. Verifica que todas las funcionalidades trabajen correctamente:
   - ✅ Login funciona
   - ✅ Se cargan los usuarios desde Supabase
   - ✅ Se pueden crear/editar/eliminar clientes
   - ✅ Se pueden crear/editar/eliminar vehículos
   - ✅ Se pueden crear/editar/eliminar talleres
   - ✅ Se pueden crear/editar/eliminar órdenes de trabajo

### Paso 11: Limpieza (Opcional)

Si todo funciona correctamente, puedes:
1. Eliminar el archivo `supabase-migration.sql` (ya no lo necesitas)
2. Los datos antiguos de AsyncStorage se mantendrán pero no se usarán más
3. Si quieres empezar con datos frescos, puedes limpiar el AsyncStorage desde la app

## Estructura de Base de Datos

### Tablas Principales

- **users**: Usuarios del sistema (admin, técnico, mecánico)
- **clients**: Clientes del taller
- **workshops**: Talleres mecánicos
- **vehicles**: Vehículos de los clientes
- **work_orders**: Órdenes de trabajo
- **budgets**: Presupuestos asociados a órdenes
- **notifications**: Notificaciones enviadas

### Relaciones

```
clients → vehicles (1:N)
users → work_orders (1:N - created_by)
users → work_orders (1:N - assigned_to)
vehicles → work_orders (1:N)
work_orders → budgets (1:N)
work_orders → notifications (1:N)
users → workshops (1:N - owner)
```

## Características

- **Row Level Security (RLS)**: Habilitado en todas las tablas
- **Timestamps automáticos**: `created_at` y `updated_at`
- **UUIDs**: IDs generados automáticamente
- **Índices**: Para optimizar consultas frecuentes
- **Tipos ENUM**: Para status, roles, prioridades

## Migración de Datos Existentes

Si tienes datos en AsyncStorage que quieres migrar:

1. Exporta los datos actuales desde AsyncStorage
2. Transforma el formato a snake_case (e.g., `countryCode` → `country_code`)
3. Usa el cliente Supabase para insertar los datos:

```typescript
const { data, error } = await supabase
  .from('table_name')
  .insert(transformedData);
```

## Seguridad

⚠️ **IMPORTANTE**: El password está almacenado en texto plano por ahora. Para producción:

1. Considera usar Supabase Auth en lugar de una tabla custom de usuarios
2. O implementa hash de passwords con bcrypt
3. Las políticas RLS están configuradas como "allow all" - personaliza según tus necesidades

## Soporte y Troubleshooting

### Error: "relation does not exist"
- Verifica que ejecutaste el SQL correctamente
- Revisa que estás conectado al proyecto correcto

### Error: "Invalid API key"
- Verifica las variables de entorno
- Asegúrate de usar la anon/public key, no la service_role key

### Datos no aparecen
- Verifica las políticas RLS
- Revisa los logs en Dashboard → Logs
