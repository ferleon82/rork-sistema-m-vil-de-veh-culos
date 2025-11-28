# Sistema de Notificaciones a Clientes via WhatsApp

## 📱 Flujo Completo del Sistema

### 1. Gestión de Clientes

**Ubicación:** Pestaña "Clientes" en la navegación inferior

**Funcionalidades:**
- ✅ **Crear nuevos clientes** con la siguiente información:
  - Nombre completo (requerido)
  - Teléfono (requerido) - Este es el número donde se enviarán las notificaciones de WhatsApp
  - Email (opcional)
  - DUI/Documento de identificación (opcional)
  - Dirección (opcional)
  - Notas adicionales (opcional)

- ✅ **Editar clientes existentes**
- ✅ **Eliminar clientes**
- ✅ **Buscar clientes** por nombre, teléfono, email o documento

**Datos Demo:**
El sistema incluye 2 clientes de demostración:
1. Carlos García - +50312345678
2. María López - +50387654321

---

### 2. Registro de Vehículos

**Ubicación:** Pestaña "Vehículos"

**Flujo:**
1. Presiona el botón **+** en la esquina superior derecha
2. Completa la información del vehículo:
   - VIN (requerido)
   - Placa (requerido)
   - Marca (requerido)
   - Modelo (requerido)
   - Año (requerido)
   - Kilometraje actual (requerido)
3. **IMPORTANTE:** Selecciona el cliente propietario del vehículo
   - Al presionar en "Seleccionar cliente..." se abre una lista de clientes
   - Selecciona el cliente correcto
   - El sistema automáticamente asocia el vehículo con los datos de contacto del cliente

**Nota:** Si no hay clientes registrados, el sistema te alertará para crear uno primero.

---

### 3. Creación de Órdenes de Trabajo

**Ubicación:** Pestaña "Órdenes"

**Flujo:**
1. Presiona el botón **+** en la esquina superior derecha
2. Completa el formulario:
   - **Selecciona el vehículo** (automáticamente carga la info del cliente)
   - Descripción del trabajo (requerido)
   - Diagnóstico (opcional)
   - **Asigna un mecánico** (requerido)
   - Prioridad: Baja/Media/Alta
3. Presiona "Crear"

---

### 4. Envío de Notificaciones a Clientes

**Ubicación:** Pestaña "Órdenes" - Cada tarjeta de orden tiene botones de acción

#### 📤 Tipos de Notificaciones:

##### A) **Notificar Estado** (Botón verde con ícono de mensaje)
- Envía una actualización del estado actual de la orden
- Se envía automáticamente al **teléfono del cliente** asociado al vehículo
- Incluye:
  - Estado actual (Pendiente, En Progreso, Completado, etc.)
  - Código de la orden
  - Descripción del trabajo
  - Diagnóstico (si existe)
  - Fecha estimada de finalización (si existe)

**Ejemplo de mensaje:**
```
🔧 *Actualización de Mantenimiento*

Hola Carlos García,

Tu vehículo *Toyota Corolla* (ABC-1234) tiene una actualización:

📋 *Orden:* OT-2025-001
📍 *Estado:* En Progreso
📝 *Descripción:* Mantenimiento preventivo 45,000 km

💡 *Diagnóstico:* Cambio de aceite, filtros y revisión general

Para más información, contáctanos.

Gracias por tu confianza 🙏
```

##### B) **Enviar Presupuesto** (Botón púrpura con ícono de documento)
- Solo aparece si la orden tiene items/trabajos agregados
- Envía el presupuesto detallado al cliente
- Cambia automáticamente el estado de la orden a "Esperando Aprobación"
- Incluye:
  - Código de la orden
  - Listado detallado de trabajos con precios
  - Total del presupuesto
  - Notas adicionales (si existen)

**Ejemplo de mensaje:**
```
💰 *Presupuesto de Mantenimiento*

Hola Carlos García,

Te enviamos el presupuesto para tu vehículo *Toyota Corolla* (ABC-1234):

📋 *Orden:* OT-2025-001
📝 *Descripción:* Mantenimiento preventivo 45,000 km

*Detalle de trabajos:*
1. Aceite sintético 5W-30
   Cantidad: 4 x $15 = $60
2. Filtro de aceite
   Cantidad: 1 x $12 = $12
3. Filtro de aire
   Cantidad: 1 x $18 = $18
4. Mano de obra
   Cantidad: 1 x $50 = $50

💵 *TOTAL: $140*

Por favor, confirma tu aprobación para proceder con el trabajo.

Gracias 🙏
```

---

### 5. Flujo Completo: De Cliente a Notificación

```
1. CREAR CLIENTE
   ↓ (Registrar nombre, teléfono +503...)
   
2. REGISTRAR VEHÍCULO
   ↓ (Asociar vehículo al cliente)
   
3. CREAR ORDEN DE TRABAJO
   ↓ (Seleccionar vehículo y asignar mecánico)
   
4. AGREGAR ITEMS/TRABAJOS
   ↓ (Opcional: para enviar presupuesto)
   
5. ENVIAR NOTIFICACIONES
   ↓ (Botones en la tarjeta de la orden)
   
6. WHATSAPP SE ABRE AUTOMÁTICAMENTE
   ↓ (Con el mensaje pre-cargado al número del cliente)
   
7. CONFIRMAR ENVÍO
   ✓ (Presionar enviar en WhatsApp)
```

---

### 6. Gestión de Estados

**Cambiar estado de una orden:**
- Presiona sobre el badge de estado (el chip de color)
- Selecciona el nuevo estado:
  - 🟡 Pendiente
  - 🔵 En Progreso
  - 🟣 Esperando Aprobación
  - 🟢 Aprobado
  - ✅ Completado
  - 🔴 Cancelado

**Cada cambio de estado** puede ser notificado al cliente presionando "Notificar Estado"

---

### 7. Información Técnica

#### Formato de Números de Teléfono:
- El sistema acepta cualquier formato: `+503 1234-5678`, `50312345678`, etc.
- Se limpia automáticamente antes de enviar a WhatsApp
- Para El Salvador usar: `+503` seguido del número

#### Plataformas:
- **Móvil (iOS/Android):** Abre la app de WhatsApp directamente
- **Web:** Abre WhatsApp Web en el navegador

#### Validaciones:
- ✅ Verifica que WhatsApp esté instalado
- ✅ Valida que el vehículo tenga un cliente asociado
- ✅ Valida que el cliente tenga un número de teléfono
- ✅ Previene envíos duplicados (botón deshabilitado mientras envía)

---

### 8. Dashboard

**Ubicación:** Pestaña "Dashboard" (primera pestaña)

Muestra resumen del sistema:
- Total de vehículos registrados
- Total de órdenes activas
- Órdenes por estado
- Listado de órdenes recientes

---

## 🎯 Casos de Uso Comunes

### Caso 1: Cliente Nuevo con Vehículo para Mantenimiento
1. Ir a "Clientes" → Crear cliente con nombre y teléfono
2. Ir a "Vehículos" → Registrar vehículo y seleccionar el cliente
3. Ir a "Órdenes" → Crear orden, seleccionar vehículo, asignar mecánico
4. Agregar items del trabajo (opcional)
5. Presionar "Notificar Estado" para avisar que se recibió el vehículo

### Caso 2: Enviar Presupuesto para Aprobación
1. Abrir una orden existente
2. Asegurarse que tenga items/trabajos con precios
3. Presionar "Enviar Presupuesto"
4. El cliente recibe el presupuesto detallado por WhatsApp
5. La orden cambia a estado "Esperando Aprobación"

### Caso 3: Notificar Avance del Trabajo
1. Abrir la orden
2. Cambiar el estado presionando el badge (ej: a "En Progreso")
3. Presionar "Notificar Estado"
4. El cliente recibe la actualización por WhatsApp

### Caso 4: Notificar Trabajo Completado
1. Cambiar estado a "Completado"
2. Presionar "Notificar Estado"
3. El cliente recibe confirmación que su vehículo está listo

---

## 🔐 Roles y Permisos

**Administrador:**
- Acceso completo al sistema
- Puede crear clientes, vehículos, órdenes
- Puede crear y gestionar usuarios (mecánicos)
- Puede enviar notificaciones

**Mecánico:**
- Puede ver órdenes asignadas
- Puede actualizar estado de órdenes
- Puede ver vehículos y clientes
- Puede enviar notificaciones

---

## 📝 Notas Importantes

1. **Clientes son esenciales:** Sin un cliente registrado no se pueden enviar notificaciones
2. **Teléfono válido:** Asegúrate que el teléfono del cliente sea correcto
3. **WhatsApp instalado:** El dispositivo debe tener WhatsApp para enviar notificaciones
4. **Conexión a Internet:** Necesaria para abrir WhatsApp y enviar mensajes
5. **Los vehículos deben estar asociados a clientes:** El sistema no permite crear vehículos sin cliente

---

## 🆘 Solución de Problemas

**"No se puede enviar notificación"**
- Verifica que el vehículo tenga un cliente asociado
- Verifica que el cliente tenga un teléfono registrado
- Verifica que WhatsApp esté instalado

**"No aparecen clientes al crear vehículo"**
- Ve a la pestaña "Clientes" y crea al menos un cliente primero

**"No puedo crear orden de trabajo"**
- Asegúrate de tener al menos un vehículo registrado
- Asegúrate de tener al menos un mecánico creado en "Usuarios"

**"WhatsApp no se abre"**
- Reinstala WhatsApp
- En web, permite que el navegador abra WhatsApp Web
