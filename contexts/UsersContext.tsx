import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect } from 'react';
import { User, UserRole } from '@/types';

const STORAGE_KEY = '@users';
const DEFAULT_COUNTRY_CODE = 'SV';

const INITIAL_USERS: User[] = [
  {
    id: '1',
    email: 'admin@taller.com',
    name: 'Administrador',
    role: 'admin',
    countryCode: 'SV',
    phone: '+50312345678',
  },
  {
    id: '2',
    email: 'tecnico@taller.com',
    name: 'Técnico Juan',
    role: 'technician',
    countryCode: 'SV',
    phone: '+50387654321',
  },
];

export const [UsersProvider, useUsers] = createContextHook(() => {
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedUsers: User[] = JSON.parse(stored);
        setUsers(
          parsedUsers.map((user) => ({
            ...user,
            countryCode: user.countryCode || DEFAULT_COUNTRY_CODE,
          }))
        );
      } else {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_USERS));
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const saveUsers = async (newUsers: User[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newUsers));
      setUsers(newUsers);
    } catch (error) {
      console.error('Error saving users:', error);
    }
  };

  const addUser = async (user: Omit<User, 'id'>) => {
    const newUser: User = {
      ...user,
      id: Date.now().toString(),
    };
    await saveUsers([...users, newUser]);
    return newUser;
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    const updated = users.map((u) =>
      u.id === id ? { ...u, ...updates } : u
    );
    await saveUsers(updated);
  };

  const deleteUser = async (id: string) => {
    const filtered = users.filter((u) => u.id !== id);
    await saveUsers(filtered);
  };

  const getUserById = (id: string) => {
    return users.find((u) => u.id === id);
  };

  const getUsersByRole = (role: UserRole) => {
    return users.filter((u) => u.role === role);
  };

  const getMechanics = () => {
    return users.filter((u) => u.role === 'mechanic' || u.role === 'technician');
  };

  const authenticateUser = (email: string, password: string) => {
    const foundUser = users.find((u) => u.email === email);
    if (foundUser && password === 'admin123') {
      return foundUser;
    }
    return null;
  };

  return {
    users,
    loadUsers,
    addUser,
    updateUser,
    deleteUser,
    getUserById,
    getUsersByRole,
    getMechanics,
    authenticateUser,
  };
});
