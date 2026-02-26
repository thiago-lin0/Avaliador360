import { Stack, usePathname, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { COLORS } from '../constants/Theme';
import { useAuthStore } from '../store/useAuthStore';

export default function RootLayout() {
  const { isInitialized, user, loadUserProfile } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  // 1. APENAS carrega o perfil 1 vez ao abrir o app (Sem o listener fantasma!)
  useEffect(() => {
    loadUserProfile();
  }, []);

  // 2. A BLINDAGEM DE ROTAS (Leão de Chácara)
  useEffect(() => {
    if (!isInitialized) return;

    // Detecta se a pessoa está na área pública (Login ou Cadastro)
    const inAuthGroup = pathname === '/' || pathname === '/register';

    if (!user && !inAuthGroup) {
      // Sem usuário tentando ver tela secreta: Vai pro Login
      router.replace('/');
    } else if (user && inAuthGroup) {
      // Com usuário na tela de Login: Vai direto pra Home
      router.replace('/home');
    }
  }, [user, isInitialized, pathname]);

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}