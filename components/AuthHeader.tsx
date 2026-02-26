import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

export function AuthHeader() {
  const logoImg = require('../assets/images/logo.png');

  return (
    <View style={styles.header}>
      <Image source={logoImg} style={styles.logo} resizeMode="contain" />
      <Text style={styles.logoText}>
        AVALIADOR<Text style={styles.logoBold}> 360</Text>
      </Text>
      <Text style={styles.subtitle}>
        Inteligência de dados para uma educação de resultados.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { width: 120, height: 120, marginBottom: 10 },
  logoText: { fontSize: 32, color: '#1E293B', fontWeight: '300' },
  logoBold: { fontWeight: 'bold', color: '#2B428C' },
  subtitle: { fontSize: 12, color: '#64748B', marginTop: 8, textAlign: 'center', paddingHorizontal: 20, lineHeight: 18 },
});