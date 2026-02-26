import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';

export default function RootLayout() {
  const { isInitialized, user, loadUserProfile } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // 1. Carrega o perfil do banco assim que o app abre
  useEffect(() => {
    loadUserProfile();

    // 2. Fica escutando se o usuário fez login ou logout em tempo real
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        await loadUserProfile(); // Recarrega os dados (escolaId)
      } else if (event === 'SIGNED_OUT') {
        useAuthStore.getState().clearSession(); // Limpa a memória
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 3. Proteção de Rotas (Redirecionamento Inteligente)
  useEffect(() => {
    if (!isInitialized) return;

    // O usuário está na área de autenticação se a rota for nula (abriu o app), for o 'index' (Login) ou for o 'register'
    const inAuthGroup = !segments[0] || segments[0] === 'index' || segments[0] === 'register';

    if (!user && !inAuthGroup) {
      // Se não tem usuário e tentou entrar no app, manda pro Login
      router.replace('/');
    } else if (user && inAuthGroup) {
      // Se já tem usuário e tá na tela de login, manda pra Home
      router.replace('/home'); // Altere para o nome exato da sua rota home
    }
  }, [user, isInitialized, segments]);

  // Tela de carregamento enquanto o Supabase responde a 1ª vez
  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#003399" />
      </View>
    );
  }

  // Renderiza as telas do app sem o cabeçalho padrão (usamos os nossos customizados)
  return <Stack screenOptions={{ headerShown: false }} />;
}