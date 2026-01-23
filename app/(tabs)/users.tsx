import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import {
  Plus,
  UserPlus,
  Trash2,
  Edit,
  Shield,
  Wrench,
  User as UserIcon,
  Search,
  Globe,
  X,
  Building2,
} from 'lucide-react-native';
import { LATIN_AMERICAN_COUNTRIES, getCountryByCode } from '@/constants/countries';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers } from '@/contexts/UsersContext';
import { useWorkshops } from '@/contexts/WorkshopsContext';
import { User, UserRole } from '@/types';

type UserFormData = {
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  role: UserRole;
  password: string;
  confirmPassword: string;
  workshopId?: string;
};

export default function UsersScreen() {
  const { isAdmin, permissions, user: currentUser } = useAuth();
  const assignableRoles = permissions.assignableRoles;
  const defaultRoleForCreation: UserRole = assignableRoles.includes('mechanic')
    ? 'mechanic'
    : assignableRoles[0] ?? 'mechanic';
  const { users, addUser, updateUser, deleteUser, getUsersByWorkshop } = useUsers();
  const { workshops } = useWorkshops();
  const canManageUsers = permissions.canManageUsers;
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string>('all');
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [showCountryPicker, setShowCountryPicker] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showWorkshopPicker, setShowWorkshopPicker] = useState<boolean>(false);
  const roleOptions: UserRole[] =
    editingUser && !assignableRoles.includes(editingUser.role)
      ? [...assignableRoles, editingUser.role]
      : [...assignableRoles];
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    phone: '',
    countryCode: 'EC',
    role: defaultRoleForCreation,
    password: '',
    confirmPassword: '',
  });

  if (!canManageUsers) {
    return (
      <View style={styles.restrictedContainer}>
        <Shield size={48} color="#1d4ed8" />
        <Text style={styles.restrictedTitle}>Acceso restringido</Text>
        <Text style={styles.restrictedText}>
          Solicita permisos al administrador para gestionar usuarios.
        </Text>
      </View>
    );
  }

  const selectedCountry = getCountryByCode(formData.countryCode);

  const handleOpenModal = (user?: User) => {
    if (user) {
      if (user.role === 'admin' && !isAdmin) {
        Alert.alert('Permiso denegado', 'Solo el administrador maestro puede editar este usuario');
        return;
      }
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        countryCode: user.countryCode,
        role: user.role,
        password: '',
        confirmPassword: '',
        workshopId: user.workshopId,
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        countryCode: 'EC',
        role: defaultRoleForCreation,
        password: '',
        confirmPassword: '',
        workshopId: currentUser?.role === 'technician' ? currentUser.workshopId : undefined,
      });
    }
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingUser(null);
  };

  const sanitizePhoneDigits = (value: string) => value.replace(/[^0-9]/g, '');

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos requeridos');
      return;
    }

    const trimmedPassword = formData.password.trim();
    const trimmedConfirm = formData.confirmPassword.trim();
    const isEditing = Boolean(editingUser);

    if (!isEditing && trimmedPassword.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (trimmedPassword || trimmedConfirm) {
      if (trimmedPassword.length < 6) {
        Alert.alert('Error', 'La nueva contraseña debe tener al menos 6 caracteres');
        return;
      }
      if (trimmedPassword !== trimmedConfirm) {
        Alert.alert('Error', 'Las contraseñas no coinciden');
        return;
      }
    }

    const passwordToPersist = trimmedPassword || editingUser?.password || '';

    if (!passwordToPersist) {
      Alert.alert('Error', 'Debes definir una contraseña para este usuario');
      return;
    }

    const canAssignSelectedRole =
      permissions.assignableRoles.includes(formData.role) || editingUser?.role === formData.role;

    if (!canAssignSelectedRole) {
      Alert.alert('Permiso denegado', 'No tienes permisos para asignar este rol');
      return;
    }

    try {
      const payload: Omit<User, 'id'> = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        countryCode: formData.countryCode,
        phone: formData.phone ? formData.phone : undefined,
        password: passwordToPersist,
        workshopId: formData.workshopId,
      };

      if (editingUser) {
        await updateUser(editingUser.id, payload);
        Alert.alert('Éxito', 'Usuario actualizado correctamente');
      } else {
        await addUser(payload);
        Alert.alert('Éxito', 'Usuario creado correctamente');
      }
      handleCloseModal();
    } catch (error) {
      console.error('[UsersScreen] Error saving user:', error);
      const errorMessage = error instanceof Error ? error.message : 'No se pudo guardar el usuario';
      Alert.alert('Error al guardar', errorMessage);
    }
  };

  const handleDelete = (user: User) => {
    if (user.role === 'admin') {
      Alert.alert('Error', 'No se puede eliminar al administrador');
      return;
    }

    if (!isAdmin && user.role === 'technician') {
      Alert.alert('Permiso denegado', 'Solo el administrador maestro puede eliminar técnicos');
      return;
    }

    Alert.alert(
      'Confirmar eliminación',
      `¿Estás seguro de que quieres eliminar a ${user.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteUser(user.id);
            Alert.alert('Éxito', 'Usuario eliminado correctamente');
          },
        },
      ]
    );
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Shield size={20} color="#dc2626" />;
      case 'mechanic':
        return <Wrench size={20} color="#2563eb" />;
      case 'technician':
        return <UserIcon size={20} color="#059669" />;
      default:
        return <UserIcon size={20} color="#6b7280" />;
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'mechanic':
        return 'Mecánico';
      case 'technician':
        return 'Técnico';
      default:
        return role;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return '#dc2626';
      case 'mechanic':
        return '#2563eb';
      case 'technician':
        return '#059669';
      default:
        return '#6b7280';
    }
  };

  let roleFilteredUsers = users;

  if (isAdmin && selectedWorkshopId !== 'all') {
    roleFilteredUsers = getUsersByWorkshop(selectedWorkshopId);
  }

  const filteredUsers = searchQuery
    ? roleFilteredUsers.filter((u) => {
        const country = getCountryByCode(u.countryCode);
        return (
          u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (u.phone && u.phone.toLowerCase().includes(searchQuery.toLowerCase())) ||
          getRoleLabel(u.role).toLowerCase().includes(searchQuery.toLowerCase()) ||
          (country && country.name.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      })
    : roleFilteredUsers;

  const renderUser = ({ item }: { item: User }) => {
    const country = getCountryByCode(item.countryCode);
    const userWorkshop = workshops.find((w) => w.id === item.workshopId);

    return (
      <View style={styles.userCard}>
        <View style={styles.userIcon}>{getRoleIcon(item.role)}</View>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          {item.phone && <Text style={styles.userPhone}>{item.phone}</Text>}
          {country && (
            <View style={styles.userMeta}>
              <Globe size={14} color="#6b7280" />
              <Text style={styles.userCountry}>{country.name}</Text>
            </View>
          )}
          {isAdmin && userWorkshop && (
            <View style={styles.userMeta}>
              <Building2 size={14} color="#6b7280" />
              <Text style={styles.userWorkshop}>{userWorkshop.name}</Text>
            </View>
          )}
          <View style={[styles.roleBadge, { backgroundColor: `${getRoleColor(item.role)}15` }]}>
            <Text style={[styles.roleText, { color: getRoleColor(item.role) }]}>
              {getRoleLabel(item.role)}
            </Text>
          </View>
        </View>

        <View style={styles.userActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleOpenModal(item)}
          >
            <Edit size={18} color="#2563eb" />
          </TouchableOpacity>

          {item.role !== 'admin' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDelete(item)}
            >
              <Trash2 size={18} color="#dc2626" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const phoneDigits = selectedCountry
    ? formData.phone.replace(selectedCountry.phonePrefix, '').trim()
    : formData.phone;

  const handleSelectCountry = (code: string) => {
    const nextCountry = getCountryByCode(code);
    const currentDigits = selectedCountry
      ? sanitizePhoneDigits(formData.phone.replace(selectedCountry.phonePrefix, ''))
      : sanitizePhoneDigits(formData.phone);

    setFormData((prev) => ({
      ...prev,
      countryCode: code,
      phone: nextCountry ? `${nextCountry.phonePrefix}${currentDigits}` : currentDigits,
    }));
    setShowCountryPicker(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar usuarios..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="users-search-input"
          />
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => handleOpenModal()}
          testID="users-add-button"
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {isAdmin && workshops.length > 0 && (
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Filtrar por mecánica:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedWorkshopId === 'all' && styles.filterChipActive,
              ]}
              onPress={() => setSelectedWorkshopId('all')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedWorkshopId === 'all' && styles.filterChipTextActive,
                ]}
              >
                Todas
              </Text>
            </TouchableOpacity>
            {workshops.map((workshop) => (
              <TouchableOpacity
                key={workshop.id}
                style={[
                  styles.filterChip,
                  selectedWorkshopId === workshop.id && styles.filterChipActive,
                ]}
                onPress={() => setSelectedWorkshopId(workshop.id)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedWorkshopId === workshop.id && styles.filterChipTextActive,
                  ]}
                >
                  {workshop.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.helperCard}>
        <Text style={styles.helperTitle}>{isAdmin ? 'Rol Administrador' : 'Rol Técnico'}</Text>
        <Text style={styles.helperDescription}>
          {isAdmin
            ? 'Crea nuevas mecánicas y define los roles que colaborarán en la plataforma.'
            : 'Gestiona el equipo de tu mecánica. Solo puedes registrar nuevos mecánicos; los técnicos los crea el administrador maestro.'}
        </Text>
      </View>

      <FlatList
        data={filteredUsers}
        renderItem={renderUser}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <UserPlus size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'No se encontraron usuarios con ese criterio'
                : 'Presiona el botón + para crear un nuevo usuario'}
            </Text>
          </View>
        }
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </Text>

              <Text style={styles.label}>
                Nombre <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Nombre completo"
                placeholderTextColor="#9ca3af"
                testID="user-name-input"
              />

              <Text style={styles.label}>
                Email <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="correo@ejemplo.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                testID="user-email-input"
              />

              <Text style={styles.label}>
                País <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.countrySelector}
                onPress={() => setShowCountryPicker(true)}
                testID="user-country-selector"
              >
                <Globe size={20} color="#6b7280" />
                <Text style={styles.countrySelectorText}>
                  {selectedCountry?.name} ({selectedCountry?.phonePrefix})
                </Text>
              </TouchableOpacity>

              <Text style={styles.label}>Teléfono</Text>
              <View style={styles.phoneInputContainer}>
                <View style={styles.phonePrefix}>
                  <Text style={styles.phonePrefixText}>
                    {selectedCountry?.phonePrefix ?? '+00'}
                  </Text>
                </View>
                <TextInput
                  style={[styles.input, styles.phoneInput]}
                  placeholder="1234 5678"
                  value={phoneDigits}
                  onChangeText={(text) => {
                    const cleanPhone = sanitizePhoneDigits(text);
                    setFormData({
                      ...formData,
                      phone: selectedCountry
                        ? `${selectedCountry.phonePrefix}${cleanPhone}`
                        : cleanPhone,
                    });
                  }}
                  keyboardType="phone-pad"
                  placeholderTextColor="#9ca3af"
                  testID="user-phone-input"
                />
              </View>

              <Text style={styles.label}>Rol *</Text>
              <View style={styles.roleSelector}>
                {roleOptions.map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.roleOption,
                      formData.role === role && styles.roleOptionSelected,
                      formData.role === role && { borderColor: getRoleColor(role) },
                    ]}
                    onPress={() => setFormData({ ...formData, role })}
                    testID={`user-role-${role}`}
                  >
                    {getRoleIcon(role)}
                    <Text
                      style={[
                        styles.roleOptionText,
                        formData.role === role && { color: getRoleColor(role) },
                      ]}
                    >
                      {getRoleLabel(role)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Credenciales de acceso</Text>
              <Text style={styles.helperText}>
                Define una contraseña segura para que el usuario pueda iniciar sesión en Drivvo
              </Text>
              <TextInput
                style={styles.input}
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                placeholder={editingUser ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                placeholderTextColor="#9ca3af"
                secureTextEntry
                testID="user-password-input"
              />
              <TextInput
                style={[styles.input, { marginTop: 12 }]}
                value={formData.confirmPassword}
                onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                placeholder="Confirmar contraseña"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                testID="user-password-confirm-input"
              />

              {isAdmin && workshops.length > 0 && (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.label}>Mecánica</Text>
                  <Text style={styles.helperText}>
                    Asigna una mecánica al usuario. Solo aplica para técnicos.
                  </Text>
                  <TouchableOpacity
                    style={styles.workshopSelector}
                    onPress={() => setShowWorkshopPicker(true)}
                    testID="user-workshop-selector"
                  >
                    <Building2 size={20} color="#6b7280" />
                    <Text style={styles.workshopSelectorText}>
                      {workshops.find((w) => w.id === formData.workshopId)?.name || 'Sin asignar'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={handleCloseModal}
                  testID="user-form-cancel"
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={handleSubmit}
                  testID="user-form-submit"
                >
                  <Text style={styles.submitButtonText}>
                    {editingUser ? 'Actualizar' : 'Crear'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showCountryPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.countryModalContent}>
            <View style={styles.countryModalHeader}>
              <Text style={styles.countryModalTitle}>Seleccionar País</Text>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={LATIN_AMERICAN_COUNTRIES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryItem,
                    formData.countryCode === item.code && styles.countryItemSelected,
                  ]}
                  onPress={() => handleSelectCountry(item.code)}
                >
                  <Text style={styles.countryItemName}>{item.name}</Text>
                  <Text style={styles.countryItemPrefix}>{item.phonePrefix}</Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.countryList}
              testID="user-country-list"
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={showWorkshopPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowWorkshopPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.countryModalContent}>
            <View style={styles.countryModalHeader}>
              <Text style={styles.countryModalTitle}>Seleccionar Mecánica</Text>
              <TouchableOpacity onPress={() => setShowWorkshopPicker(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={[
                { id: undefined, name: 'Sin asignar' },
                ...workshops,
              ]}
              keyExtractor={(item) => item.id || 'unassigned'}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryItem,
                    formData.workshopId === item.id && styles.countryItemSelected,
                  ]}
                  onPress={() => {
                    setFormData({ ...formData, workshopId: item.id });
                    setShowWorkshopPicker(false);
                  }}
                >
                  <Text style={styles.countryItemName}>{item.name}</Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.countryList}
              testID="user-workshop-list"
            />
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  restrictedContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  restrictedTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  restrictedText: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#2563eb',
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noAccessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  noAccessTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  noAccessText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  helperCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#e0f2fe',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bae6fd',
    gap: 6,
  },
  helperTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  helperDescription: {
    fontSize: 13,
    color: '#1e3a8a',
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
  userCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1f2937',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 4,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  userCountry: {
    fontSize: 13,
    color: '#6b7280',
  },
  userWorkshop: {
    fontSize: 13,
    color: '#6b7280',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1f2937',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  required: {
    color: '#dc2626',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
  },
  countrySelectorText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  phonePrefix: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  phonePrefixText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#374151',
  },
  phoneInput: {
    flex: 1,
  },
  roleSelector: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 16,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#f9fafb',
  },
  roleOptionSelected: {
    backgroundColor: '#fff',
    borderWidth: 2,
  },
  roleOptionText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#6b7280',
  },
  helperText: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#6b7280',
  },
  submitButton: {
    backgroundColor: '#2563eb',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  countryModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  countryModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  countryModalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#111827',
  },
  countryList: {
    paddingBottom: 20,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  countryItemSelected: {
    backgroundColor: '#eff6ff',
  },
  countryItemName: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#111827',
  },
  countryItemPrefix: {
    fontSize: 16,
    color: '#6b7280',
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#374151',
    marginBottom: 8,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#6b7280',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  workshopSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
  },
  workshopSelectorText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
});
