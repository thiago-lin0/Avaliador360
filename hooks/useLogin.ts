import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';

export function useLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      return Alert.alert("Atenção", "Por favor, preencha e-mail e senha.");
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      Alert.alert('Erro no Login', error.message);
      setLoading(false);
    } else {
      setLoading(false);
      router.replace('/home'); 
    }
  }

  return {
    email, setEmail,
    password, setPassword,
    loading, handleLogin
  };
}