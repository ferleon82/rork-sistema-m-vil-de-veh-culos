import { Stack } from 'expo-router';
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  SafeAreaView,
} from 'react-native';
import { Mail, ShieldCheck } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const { loginWithGoogle, authError } = useAuth();

  const handleGoogleLogin = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await loginWithGoogle();
      if (!result.success) {
        Alert.alert('Acceso no disponible', result.error || 'No se pudo iniciar sesion con Google');
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrio un error inesperado');
      console.error('[LoginScreen] Google auth error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={require('@/assets/images/logo-gesticar.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>Bienvenido</Text>
            <Text style={styles.subtitle}>Ingresa con la cuenta autorizada para tu taller</Text>
          </View>

          <View style={styles.form}>
            <TouchableOpacity
              style={[styles.googleButton, isSubmitting && styles.buttonDisabled]}
              onPress={handleGoogleLogin}
              disabled={isSubmitting}
              testID="google-login-button"
            >
              {isSubmitting ? (
                <ActivityIndicator color="#1f2937" />
              ) : (
                <>
                  <View style={styles.googleIcon}>
                    <Text style={styles.googleIconText}>G</Text>
                  </View>
                  <Text style={styles.googleButtonText}>Continuar con Google</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.accessNote}>
              <ShieldCheck size={18} color="#2563eb" />
              <Text style={styles.accessNoteText}>
                Tu administrador debe invitar primero tu correo de Gmail en el modulo Usuarios.
              </Text>
            </View>

            {authError && (
              <View style={styles.errorBox}>
                <Mail size={18} color="#dc2626" />
                <Text style={styles.errorText}>{authError}</Text>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    width: 250,
    height: 125,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#1e3a8a',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  googleButton: {
    height: 56,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  googleIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  googleIconText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: '#4285f4',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1f2937',
  },
  accessNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 14,
  },
  accessNoteText: {
    flex: 1,
    color: '#1e3a8a',
    fontSize: 13,
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 14,
  },
  errorText: {
    flex: 1,
    color: '#991b1b',
    fontSize: 13,
    lineHeight: 18,
  },
});
