import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const logoImg = require('../assets/images/logo.png');

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

  return (
    // KeyboardAvoidingView: Garante que o teclado não cubra os campos de texto
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* TouchableWithoutFeedback: Permite fechar o teclado clicando em qualquer área vazia */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inner}>
            
            {/* Cabeçalho / Logo */}
            <View style={styles.header}>
              <Image source={logoImg} style={styles.logo} resizeMode="contain" />
              <Text style={styles.logoText}>
                AVALIADOR<Text style={styles.logoBold}> 360</Text>
              </Text>
              <Text style={styles.subtitle}>
                Inteligência de dados para uma educação de resultados.
              </Text>
            </View>

            {/* Formulário de Login */}
            <View style={styles.form}>
              <Text style={styles.label}>E-mail</Text>
              <TextInput
                style={styles.input}
                placeholder="exemplo@escola.com"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={styles.label}>Senha</Text>
              <TextInput
                style={styles.input}
                placeholder="******"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <TouchableOpacity 
                style={styles.button} 
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.buttonText}>ENTRAR</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.forgotButton}>
                <Text style={styles.forgotText}>Esqueci minha senha</Text>
              </TouchableOpacity>

              {/* Link para a tela de Cadastro */}
              <View style={styles.registerContainer}>
                  <Text style={styles.registerText}>Não tem uma conta? </Text>
                  <TouchableOpacity onPress={() => router.push('/register')}>
                      <Text style={styles.registerLink}>Cadastre-se</Text>
                  </TouchableOpacity>
              </View>
            </View>

          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: { 
    width: 120, 
    height: 120,
    marginBottom: 10,
  },
  logoText: {
    fontSize: 32,
    color: '#1E293B', 
    fontWeight: '300',
  },
  logoBold: {
    fontWeight: 'bold',
    color: '#2B428C'
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  form: {
    backgroundColor: '#FFF',
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5, 
  },
  label: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  button: {
    backgroundColor: '#2B428C', 
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  forgotButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  forgotText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
  registerContainer: {
    marginTop: 32,
    flexDirection: 'row',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 20,
  },
  registerText: {
    color: '#64748B',
    fontSize: 14,
  },
  registerLink: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 14,
  }
});