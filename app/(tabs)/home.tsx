import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

// Tipagem rigorosa para evitar erros de renderização
type ProfessorData = {
  nome: string;
  tb_escola: {
    nome: string;
  } | null;
};

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [professor, setProfessor] = useState<ProfessorData | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/');
        return;
      }

      const { data, error } = await supabase
        .from('tb_professor')
        .select(`
          nome,
          tb_escola (
            nome
          )
        `)
        .eq('auth_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        const escolaRef = Array.isArray(data.tb_escola) ? data.tb_escola[0] : data.tb_escola;
        
        setProfessor({
          nome: data.nome,
          tb_escola: escolaRef
        } as ProfessorData);
      }
    } catch (error) {
      console.log("Erro ao carregar perfil:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
      </View>
    );
  }

  const primeiroNome = professor?.nome?.split(' ')[0] || 'Professor';
  const nomeEscola = professor?.tb_escola?.nome || 'Escola não vinculada';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* CABEÇALHO */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Olá, Prof. {primeiroNome}</Text>
            <Text style={styles.title}>Painel de Controle</Text>
            <Text style={styles.schoolSub}>🎓 {nomeEscola}</Text>
          </View>
          <TouchableOpacity 
            onPress={() => supabase.auth.signOut().then(() => router.replace('/'))} 
            style={styles.logoutButton}
          >
            <Ionicons name="log-out-outline" size={22} color="#FF3B30" />
          </TouchableOpacity>
        </View>

        {/* GRID DE BOTÕES */}
        <View style={styles.gridContainer}>
          <TouchableOpacity 
            style={styles.squareCard}
            onPress={() => router.push('/configuracao')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="people" size={28} color="#2196F3" />
            </View>
            <Text style={styles.squareCardText}>Turmas & Alunos</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.squareCard}
            onPress={() => router.push('/novo-gabarito')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#F3E5F5' }]}>
              <Ionicons name="grid" size={28} color="#9C27B0" />
            </View>
            <Text style={styles.squareCardText}>Novo Gabarito</Text>
          </TouchableOpacity>
        </View>

        {/* CARD DA CÂMERA */}
        <TouchableOpacity 
          style={styles.heroCard}
          onPress={() => router.push('/escanear-gabarito')}
        >
          <View>
            <Text style={styles.heroTitle}>Ler Gabaritos</Text>
            <Text style={styles.heroSubtitle}>Corrigir via Câmera</Text>
          </View>
          <View style={styles.heroIconBox}>
            <Ionicons name="camera" size={32} color="#FFF" />
          </View>
        </TouchableOpacity>

        {/* --- NOVO: BOTÃO DE HISTÓRICO --- */}
        <TouchableOpacity 
          style={[styles.wideCard, { marginBottom: 15 }]} 
          onPress={() => router.push('/historico')}
        >
          <View style={styles.wideCardLeft}>
            <View style={[styles.iconCircleSmall, { backgroundColor: '#E8EAF6' }]}>
              <Ionicons name="time" size={24} color="#3F51B5" />
            </View>
            <View>
              <Text style={styles.wideCardTitle}>Histórico de Correções</Text>
              <Text style={styles.wideCardSubtitle}>Últimas provas digitalizadas</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>

        {/* CARD DE RELATÓRIOS */}
        <TouchableOpacity style={styles.wideCard}>
          <View style={styles.wideCardLeft}>
            <View style={[styles.iconCircleSmall, { backgroundColor: '#E8F5E9' }]}>
              <MaterialCommunityIcons name="file-excel" size={24} color="#4CAF50" />
            </View>
            <View>
              <Text style={styles.wideCardTitle}>Relatórios XLSX</Text>
              <Text style={styles.wideCardSubtitle}>Consolidados e Gráficos</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 24, paddingTop: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30 },
  greeting: { fontSize: 15, color: '#888', fontWeight: '500' },
  title: { fontSize: 26, color: '#003399', fontWeight: '800' },
  schoolSub: { fontSize: 13, color: '#0070C0', fontWeight: '700', marginTop: 4 },
  logoutButton: { backgroundColor: '#FFF', padding: 10, borderRadius: 50, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  gridContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  squareCard: { backgroundColor: '#FFF', width: '48%', paddingVertical: 25, borderRadius: 25, alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.05 },
  iconCircle: { width: 55, height: 55, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  squareCardText: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  heroCard: { backgroundColor: '#1E3A8A', borderRadius: 25, padding: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, elevation: 8, shadowColor: '#1E3A8A', shadowOpacity: 0.3 },
  heroTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  heroSubtitle: { color: '#A3B3E5', fontSize: 14, marginTop: 4 },
  heroIconBox: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 15, borderRadius: 20 },
  wideCard: { backgroundColor: '#FFF', borderRadius: 22, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 3, shadowColor: '#000', shadowOpacity: 0.05 },
  wideCardLeft: { flexDirection: 'row', alignItems: 'center' },
  iconCircleSmall: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  wideCardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  wideCardSubtitle: { fontSize: 12, color: '#888' },
});