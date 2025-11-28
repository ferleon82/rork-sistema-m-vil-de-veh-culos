import { Linking, Platform, Alert } from 'react-native';
import { WorkOrder, Vehicle } from '@/types';

export const sendWhatsAppMessage = async (phoneNumber: string, message: string) => {
  try {
    const formattedPhone = phoneNumber.replace(/[^0-9]/g, '');
    
    const url = Platform.select({
      ios: `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`,
      android: `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`,
      web: `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`,
      default: `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`,
    });

    const canOpen = await Linking.canOpenURL(url);
    
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    } else {
      Alert.alert(
        'WhatsApp no disponible',
        'Por favor instala WhatsApp para enviar notificaciones.'
      );
      return false;
    }
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    Alert.alert('Error', 'No se pudo abrir WhatsApp');
    return false;
  }
};

export const formatWorkOrderMessage = (workOrder: WorkOrder, vehicle: Vehicle, type: 'status' | 'budget') => {
  if (type === 'status') {
    const statusText = {
      pending: 'Pendiente',
      in_progress: 'En Progreso',
      waiting_approval: 'Esperando Aprobación',
      approved: 'Aprobado',
      completed: 'Completado',
      cancelled: 'Cancelado',
    }[workOrder.status];

    return `🔧 *Actualización de Mantenimiento*

Hola ${vehicle.ownerName},

Tu vehículo *${vehicle.brand} ${vehicle.model}* (${vehicle.plate}) tiene una actualización:

📋 *Orden:* ${workOrder.code}
📍 *Estado:* ${statusText}
📝 *Descripción:* ${workOrder.description}

${workOrder.diagnosis ? `💡 *Diagnóstico:* ${workOrder.diagnosis}\n` : ''}
${workOrder.estimatedCompletionDate ? `📅 *Estimado de finalización:* ${new Date(workOrder.estimatedCompletionDate).toLocaleDateString('es-ES')}\n` : ''}
Para más información, contáctanos.

Gracias por tu confianza 🙏`;
  } else {
    return `💰 *Presupuesto de Mantenimiento*

Hola ${vehicle.ownerName},

Te enviamos el presupuesto para tu vehículo *${vehicle.brand} ${vehicle.model}* (${vehicle.plate}):

📋 *Orden:* ${workOrder.code}
📝 *Descripción:* ${workOrder.description}

*Detalle de trabajos:*
${workOrder.items.map((item, index) => 
  `${index + 1}. ${item.description}\n   Cantidad: ${item.quantity} x $${item.unitPrice} = $${item.total}`
).join('\n')}

💵 *TOTAL: $${workOrder.totalCost}*

${workOrder.notes ? `\n📌 *Notas:* ${workOrder.notes}\n` : ''}
Por favor, confirma tu aprobación para proceder con el trabajo.

Gracias 🙏`;
  }
};

export const sendStatusUpdate = async (workOrder: WorkOrder, vehicle: Vehicle) => {
  const message = formatWorkOrderMessage(workOrder, vehicle, 'status');
  return await sendWhatsAppMessage(vehicle.ownerPhone, message);
};

export const sendBudget = async (workOrder: WorkOrder, vehicle: Vehicle) => {
  const message = formatWorkOrderMessage(workOrder, vehicle, 'budget');
  return await sendWhatsAppMessage(vehicle.ownerPhone, message);
};
