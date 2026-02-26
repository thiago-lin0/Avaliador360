import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

// Imports dos nossos componentes e hooks
import { AuthHeader } from '../components/AuthHeader';
import { AuthInput } from '../components/AuthInput';
import { useLogin } from '../hooks/useLogin';

export default function LoginScreen() {
  const { email, setEmail, password, setPassword, loading, handleLogin } = useLogin();

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.inner}>
            
            <AuthHeader />

            {/* Formulário de Login */}
            <View style={styles.form}>
              
              <AuthInput 
                label="E-mail"
                placeholder="exemplo@escola.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <AuthInput 
                label="Senha"
                placeholder="******"
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

// Estilos reduzidos apenas à estrutura da tela
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  inner: { flex: 1, justifyContent: 'center' },
  form: { 
    backgroundColor: '#FFF', padding: 24, borderRadius: 20, 
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 
  },
  button: { backgroundColor: '#2B428C', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  forgotButton: { marginTop: 20, alignItems: 'center' },
  forgotText: { color: '#64748B', fontSize: 14, fontWeight: '500' },
  registerContainer: { marginTop: 32, flexDirection: 'row', justifyContent: 'center', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 20 },
  registerText: { color: '#64748B', fontSize: 14 },
  registerLink: { color: '#10B981', fontWeight: 'bold', fontSize: 14 }
});